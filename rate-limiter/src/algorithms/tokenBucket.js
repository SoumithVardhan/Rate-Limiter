const redis = require('../redis');

async function attempt(clientId, config = {}) {
  const { maxRequests = 10, windowSizeSeconds = 60 } = config;
  const refillRate = maxRequests / windowSizeSeconds;
  const now = Date.now() / 1000;
  const key = `rl:token_bucket:${clientId}`;

  const bucket = await redis.hgetall(key);
  let tokens = maxRequests;
  let lastRefill = now;

  if (bucket && bucket.tokens !== undefined) {
    lastRefill = parseFloat(bucket.lastRefill);
    tokens = parseFloat(bucket.tokens);
    const elapsed = now - lastRefill;
    tokens = Math.min(maxRequests, tokens + elapsed * refillRate);
    lastRefill = now;
  }

  const allowed = tokens >= 1;
  if (allowed) tokens -= 1;

  await redis.hset(key, { tokens: tokens.toFixed(6), lastRefill: now.toFixed(6) });
  await redis.expire(key, windowSizeSeconds * 2);

  return {
    allowed,
    remaining: Math.max(0, Math.floor(tokens)),
    limit: maxRequests,
    retryAfter: allowed ? null : Math.ceil(1 / refillRate),
  };
}

module.exports = { attempt };
