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
// which causes everyone to share one rate-limit bucket → requests get blocked
// way sooner than expected.
app.set('trust proxy', true);

// ── Backend server config ────────────────────────────────────────────────────
// Works on ANY platform — set these env vars in Railway / AWS / Azure / .env
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

// Round-robin index — alternates between Server-1 and Server-2
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

// ── Helper: get client ID ────────────────────────────────────────────────────
// Priority order:
//   1. Explicit header from client (most reliable for demos)
//   2. Real IP from x-forwarded-for (set by Railway/nginx/Cloudflare)
//   3. req.ip — works correctly only after `app.set('trust proxy', true)`
//   4. Fallback
function getClientId(req) {
  // x-forwarded-for may be "client-ip, proxy1-ip, proxy2-ip"
  // The FIRST entry is always the real client IP
  const forwarded = req.headers['x-forwarded-for'];
  const realIp = forwarded ? forwarded.split(',')[0].trim() : null;

  return (
    req.headers['x-client-id'] ||
    realIp ||
    req.ip ||
    'anonymous'
  );
}

// ── Helper: pick next backend server (round-robin) ───────────────────────────
function getNextServer() {
  const server = SERVERS[serverIndex % SERVERS.length];
  serverIndex++;
  return server; // returns { url, name }
}

// ── Helper: fetch with timeout (AbortController) ─────────────────────────────
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

// ── Health check ─────────────────────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({
    status:  'ok',
    service: 'rate-limiter',
    servers: SERVERS.map(s => ({ name: s.name, url: s.url })),
  });
});

// ── POST /request — Single request through rate limiter ──────────────────────
// Frontend calls this. Rate limiter checks Redis, then proxies to backend.
app.post('/request', async (req, res) => {
  const { algorithm = 'sliding-window-counter', config = {} } = req.body;
  const clientId = getClientId(req);

  const algo = ALGORITHMS[algorithm];
  if (!algo) {
    return res.status(400).json({ error: `Unknown algorithm: ${algorithm}` });
  }

  try {
    // Step 1: Check rate limit using Redis
    const result = await algo.attempt(clientId, config);

    // Step 2: Set rate limit response headers
    res.setHeader('X-RateLimit-Limit',     result.limit);
    res.setHeader('X-RateLimit-Remaining', result.remaining);

    if (!result.allowed) {
      // BLOCKED — return 429, do NOT forward to backend
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

    // Step 3: ALLOWED — forward request to next backend server (round-robin)
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

    // Step 4: Return combined result to frontend
    return res.json({
      allowed:   true,
      remaining: result.remaining,
      limit:     result.limit,
      algorithm,
      server:    serverName,
      serverUrl,
      clientId,
      data:      backendData,
    });

  } catch (err) {
    console.error('[Rate Limiter] Error:', err.message);
    // Fail open — allow request if something breaks
    return res.status(500).json({ error: 'Rate limiter error', detail: err.message });
  }
});

// ── POST /burst — Send N requests in rapid succession ────────────────────────
app.post('/burst', async (req, res) => {
  const { algorithm = 'sliding-window-counter', config = {}, count = 10 } = req.body;
  const clientId = getClientId(req);
  const algo = ALGORITHMS[algorithm];

  if (!algo) return res.status(400).json({ error: `Unknown algorithm: ${algorithm}` });

  const results  = [];
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
      results.push({ index: i + 1, error: err.message });
    }
  }

  res.json(results);
});

// ── POST /reset — Clear rate limit counters for a client ─────────────────────
app.post('/reset', async (req, res) => {
  const clientId = getClientId(req);

  try {
    const keys = await redis.keys(`rl:*:${clientId}*`);
    if (keys.length > 0) await redis.del(...keys);
    res.json({ ok: true, cleared: keys.length, clientId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Start ─────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n  ╔══════════════════════════════════════╗`);
  console.log(`  ║   Rate Limiter Service — Port ${PORT}   ║`);
  console.log(`  ╚══════════════════════════════════════╝`);
  console.log(`  Backends:`);
  SERVERS.forEach(s => console.log(`    • ${s.name}: ${s.url}`));
  console.log(`  Redis: ${process.env.REDIS_URL || `${process.env.REDIS_HOST || 'localhost'}:${process.env.REDIS_PORT || 6379}`}\n`);
});
