const Redis = require('ioredis');

const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT) || 6379,
  retryStrategy: (times) => Math.min(times * 50, 2000),
  lazyConnect: false,
});

redis.on('connect', () => console.log('[Rate Limiter] Redis connected'));
redis.on('error', (err) => console.error('[Rate Limiter] Redis error:', err.message));

module.exports = redis;
