const Redis = require('ioredis');

// Redis connection strategy (platform-agnostic):
//
//   Option A — REDIS_URL (recommended for cloud deployments)
//     Set REDIS_URL in your platform's env vars (Railway, Upstash, AWS, Azure, etc.)
//     Format: redis://[:password@]host:port[/db]
//     Example: redis://default:abc123@redis.example.com:6379
//
//   Option B — REDIS_HOST + REDIS_PORT (for local Docker Compose or bare-metal)
//     Used automatically when REDIS_URL is not set.
//     Defaults: localhost:6379

const redis = process.env.REDIS_URL
  ? new Redis(process.env.REDIS_URL, {
      retryStrategy: (times) => Math.min(times * 50, 2000),
      lazyConnect: false,
    })
  : new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT) || 6379,
      retryStrategy: (times) => Math.min(times * 50, 2000),
      lazyConnect: false,
    });

redis.on('connect', () => console.log('[Redis] Connected successfully'));
redis.on('error',   (err) => console.error('[Redis] Connection error:', err.message));

module.exports = redis;
