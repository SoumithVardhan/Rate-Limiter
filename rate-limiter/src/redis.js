const Redis = require('ioredis');

// Railway injects REDIS_URL with auth included (redis://user:pass@host:port)
// Local Docker Compose uses REDIS_HOST + REDIS_PORT (no auth)
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

redis.on('connect', () => console.log('[Rate Limiter] Redis connected'));
redis.on('error', (err) => console.error('[Rate Limiter] Redis error:', err.message));

module.exports = redis;
