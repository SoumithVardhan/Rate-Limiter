const express = require('express');
const cors    = require('cors');
const redis   = require('./redis');

const tokenBucket        = require('./algorithms/tokenBucket');
const fixedWindowCounter = require('./algorithms/fixedWindowCounter');
const slidingWindowLog   = require('./algorithms/slidingWindowLog');
const slidingWindowCounter = require('./algorithms/slidingWindowCounter');

const app  = express();
const PORT = process.env.PORT || 4000;

// ── Trust the reverse proxy (Railway / AWS ALB / nginx / Cloudflare etc.)
// Without this, req.ip returns the proxy's internal IP (same for ALL users),
// which causes everyone to share one rate-limit bucket.
app.set('trust proxy', true);

// ── Backend server config ────────────────────────────────────────────────────
const SERVERS = [
  {
    url:  process.env.SERVER_1_URL  || 'http://localhost:5001',
    name: process.env.SERVER_1_NAME || 'Server-1',
  },
  {
    url:  process.env.SERVER_2_URL  || 'http://localhost:5002',
    name: process.env.SERVER_2_NAME || 'Server-2',
  },
];

// Round-robin index
let serverIndex = 0;

// Algorithm registry
const ALGORITHMS = {
  'token-bucket':           tokenBucket,
  'fixed-window':           fixedWindowCounter,
  'sliding-window-log':     slidingWindowLog,
  'sliding-window-counter': slidingWindowCounter,
};

app.use(cors());
app.use(express.json());

// ── Helper: sanitize error message before sending to client ──────────────────
// Never send raw err.message to the client — it can contain Redis URLs with
// passwords, internal hostnames, or stack traces.
function safeError(err, fallback = 'Internal server error') {
  console.error('[Rate Limiter]', err.message); // full detail stays server-side only
  return fallback;
}

// ── Helper: get client ID ────────────────────────────────────────────────────
function getClientId(req) {
  const forwarded = req.headers['x-forwarded-for'];
  const realIp = forwarded ? forwarded.split(',')[0].trim() : null;
  return req.headers['x-client-id'] || realIp || req.ip || 'anonymous';
}

// ── Helper: pick next backend server (round-robin) ───────────────────────────
function getNextServer() {
  const server = SERVERS[serverIndex % SERVERS.length];
  serverIndex++;
  return server;
}

// ── Helper: fetch with timeout ────────────────────────────────────────────────
async function fetchWithTimeout(url, options = {}, timeoutMs = 5000) {
  const { default: fetch } = await import('node-fetch');
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

// ── Health check ──────────────────────────────────────────────────────────────
// Returns service status and server NAMES only — never internal URLs or credentials.
app.get('/health', (req, res) => {
  res.json({
    status:  'ok',
    service: 'rate-limiter',
    servers: SERVERS.map(s => s.name), // name only — no internal URLs exposed
  });
});

// ── POST /request ─────────────────────────────────────────────────────────────
app.post('/request', async (req, res) => {
  const { algorithm = 'sliding-window-counter', config = {} } = req.body;
  const clientId = getClientId(req);

  const algo = ALGORITHMS[algorithm];
  if (!algo) {
    return res.status(400).json({ error: `Unknown algorithm: ${algorithm}` });
  }

  try {
    const result = await algo.attempt(clientId, config);

    res.setHeader('X-RateLimit-Limit',     result.limit);
    res.setHeader('X-RateLimit-Remaining', result.remaining);

    if (!result.allowed) {
      res.setHeader('Retry-After', result.retryAfter || 60);
      return res.status(429).json({
        allowed:    false,
        remaining:  result.remaining,
        limit:      result.limit,
        retryAfter: result.retryAfter,
        algorithm,
        clientId,
        message:    'Rate limit exceeded. Try again later.',
      });
    }

    const { url: serverUrl, name: serverName } = getNextServer();

    let backendData = null;
    try {
      const backendRes = await fetchWithTimeout(`${serverUrl}/api/data`, {
        method:  'GET',
        headers: { 'X-Forwarded-Client': clientId },
      }, 5000);
      backendData = await backendRes.json();
    } catch (backendErr) {
      console.warn(`[Rate Limiter] Backend ${serverName} unreachable: ${backendErr.message}`);
      backendData = { error: 'Backend unreachable', server: serverName };
    }

    return res.json({
      allowed:   true,
      remaining: result.remaining,
      limit:     result.limit,
      algorithm,
      server:    serverName,  // name only — internal URL never sent to browser
      clientId,
      data:      backendData,
    });

  } catch (err) {
    const msg = safeError(err, 'Rate limiter error. Please try again.');
    return res.status(500).json({ error: msg });
  }
});

// ── POST /burst ───────────────────────────────────────────────────────────────
app.post('/burst', async (req, res) => {
  const { algorithm = 'sliding-window-counter', config = {}, count = 10 } = req.body;
  const clientId = getClientId(req);
  const algo = ALGORITHMS[algorithm];

  if (!algo) return res.status(400).json({ error: `Unknown algorithm: ${algorithm}` });

  const results   = [];
  const safeCount = Math.min(Math.max(parseInt(count) || 10, 1), 50);

  for (let i = 0; i < safeCount; i++) {
    try {
      const result = await algo.attempt(clientId, config);

      if (!result.allowed) {
        results.push({
          index:      i + 1,
          allowed:    false,
          remaining:  result.remaining,
          limit:      result.limit,
          retryAfter: result.retryAfter,
          algorithm,
        });
        continue;
      }

      const { url: serverUrl, name: serverName } = getNextServer();

      try {
        const backendRes  = await fetchWithTimeout(`${serverUrl}/api/data`, {}, 5000);
        const backendData = await backendRes.json();
        results.push({
          index:     i + 1,
          allowed:   true,
          remaining: result.remaining,
          limit:     result.limit,
          algorithm,
          server:    serverName,
          data:      backendData,
        });
      } catch {
        results.push({
          index:     i + 1,
          allowed:   true,
          remaining: result.remaining,
          server:    serverName,
          error:     'Backend unreachable',
        });
      }
    } catch (err) {
      // Log full error server-side, send generic message to client
      safeError(err, 'Request processing error');
      results.push({ index: i + 1, error: 'Request processing error' });
    }
  }

  res.json(results);
});

// ── POST /reset ───────────────────────────────────────────────────────────────
app.post('/reset', async (req, res) => {
  const clientId = getClientId(req);
  try {
    const keys = await redis.keys(`rl:*:${clientId}*`);
    if (keys.length > 0) await redis.del(...keys);
    res.json({ ok: true, cleared: keys.length, clientId });
  } catch (err) {
    const msg = safeError(err, 'Failed to reset counters');
    res.status(500).json({ error: msg });
  }
});

// ── Start ─────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  // Log Redis host only — never log REDIS_URL which contains the password
  const redisHost = process.env.REDIS_URL
    ? process.env.REDIS_URL.replace(/:\/\/[^@]+@/, '://***:***@') // mask credentials
    : `${process.env.REDIS_HOST || 'localhost'}:${process.env.REDIS_PORT || 6379}`;

  console.log(`\n  ╔══════════════════════════════════════╗`);
  console.log(`  ║   Rate Limiter Service — Port ${PORT}   ║`);
  console.log(`  ╚══════════════════════════════════════╝`);
  console.log(`  Backends:`);
  SERVERS.forEach(s => console.log(`    • ${s.name}: ${s.url}`));
  console.log(`  Redis: ${redisHost}\n`);
});
