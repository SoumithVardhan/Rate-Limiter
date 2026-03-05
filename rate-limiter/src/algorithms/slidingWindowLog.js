const redis = require('../redis');

async function attempt(clientId, config = {}) {
  const { maxRequests = 10, windowSizeSeconds = 60 } = config;
  const now = Date.now();
  const windowStart = now - windowSizeSeconds * 1000;
  const key = `rl:sliding_log:${clientId}`;

  const pipeline = redis.pipeline();
  pipeline.zremrangebyscore(key, '-inf', windowStart);
  pipeline.zcard(key);
  pipeline.zadd(key, now, `${now}:${Math.random().toString(36).slice(2)}`);
  pipeline.expire(key, windowSizeSeconds);

  const results = await pipeline.exec();
  const countBefore = results[1][1];
  const allowed = countBefore < maxRequests;

  if (!allowed) await redis.zpopmax(key);

  return {
    allowed,
    remaining: Math.max(0, maxRequests - countBefore - (allowed ? 1 : 0)),
    limit: maxRequests,
    retryAfter: allowed ? null : windowSizeSeconds,
  };
}

module.exports = { attempt };
