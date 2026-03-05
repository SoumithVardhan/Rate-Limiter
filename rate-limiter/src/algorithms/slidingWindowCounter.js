const redis = require('../redis');

async function attempt(clientId, config = {}) {
  const { maxRequests = 10, windowSizeSeconds = 60 } = config;
  const now = Math.floor(Date.now() / 1000);
  const currentWindow = Math.floor(now / windowSizeSeconds) * windowSizeSeconds;
  const previousWindow = currentWindow - windowSizeSeconds;

  const currentKey  = `rl:sliding_counter:${clientId}:${currentWindow}`;
  const previousKey = `rl:sliding_counter:${clientId}:${previousWindow}`;

  const [currRaw, prevRaw] = await redis.mget(currentKey, previousKey);
  const curr = parseInt(currRaw) || 0;
  const prev = parseInt(prevRaw) || 0;

  const elapsed = (now - currentWindow) / windowSizeSeconds;
  const weightedCount = prev * (1 - elapsed) + curr;
  const allowed = weightedCount < maxRequests;

  if (allowed) {
    await redis.incr(currentKey);
    await redis.expire(currentKey, windowSizeSeconds * 2);
  }

  return {
    allowed,
    remaining: Math.max(0, Math.floor(maxRequests - weightedCount - (allowed ? 1 : 0))),
    limit: maxRequests,
    retryAfter: allowed ? null : windowSizeSeconds - (now - currentWindow),
  };
}

module.exports = { attempt };
