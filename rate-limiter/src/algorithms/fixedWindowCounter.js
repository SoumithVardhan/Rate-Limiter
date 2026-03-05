const redis = require('../redis');

async function attempt(clientId, config = {}) {
  const { maxRequests = 10, windowSizeSeconds = 60 } = config;
  const now = Math.floor(Date.now() / 1000);
  const windowStart = Math.floor(now / windowSizeSeconds) * windowSizeSeconds;
  const key = `rl:fixed_window:${clientId}:${windowStart}`;

  const count = await redis.incr(key);
  if (count === 1) await redis.expire(key, windowSizeSeconds);

  const allowed = count <= maxRequests;
  const resetTime = windowStart + windowSizeSeconds;

  return {
    allowed,
    remaining: Math.max(0, maxRequests - count),
    limit: maxRequests,
    retryAfter: allowed ? null : resetTime - now,
  };
}

module.exports = { attempt };
