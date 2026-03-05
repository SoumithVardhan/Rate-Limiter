const express = require('express');
const Redis   = require('ioredis');
const cors    = require('cors');

const app         = express();
const PORT        = process.env.PORT || 5001;
const SERVER_NAME = process.env.SERVER_NAME || 'Server-1';

app.use(cors());
app.use(express.json());

// Redis connection (backend also connected to Redis for its own use)
const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT) || 6379,
  retryStrategy: (times) => Math.min(times * 50, 2000),
});
redis.on('connect', () => console.log(`[${SERVER_NAME}] Redis connected`));

// Track request count locally (also stored in Redis)
let requestCount = 0;

// ── Health check ─────────────────────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({ status: 'ok', server: SERVER_NAME });
});

// ── Main API endpoint — called by Rate Limiter ────────────────────────────────
app.get('/api/data', async (req, res) => {
  requestCount++;
  const clientId = req.headers['x-forwarded-client'] || 'unknown';

  // Store request log in Redis (shared visibility)
  await redis.lpush(`server:${SERVER_NAME}:requests`, JSON.stringify({
    clientId,
    timestamp: new Date().toISOString(),
    count: requestCount,
  })).catch(() => {});
  await redis.ltrim(`server:${SERVER_NAME}:requests`, 0, 99).catch(() => {});

  res.json({
    server:      SERVER_NAME,
    port:        PORT,
    requestCount,
    clientId,
    timestamp:   new Date().toISOString(),
    message:     `Hello from ${SERVER_NAME}! Request #${requestCount} processed.`,
  });
});

// ── Start ─────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`[${SERVER_NAME}] Running on port ${PORT}`);
});
