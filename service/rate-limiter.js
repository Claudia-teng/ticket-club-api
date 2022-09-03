const redis = require('../service/cache');

async function rateLimiter(sessionId, userId) {
  // todo - validation
  const limit = 1;
  await redis.defineCommand('rateLimiter', {
    lua: `
      local limit = tonumber(ARGV[3])
      local length = redis.call("LLEN", KEYS[1])
      local wait = 0
      
      if (length >= limit) then
        wait = redis.call("LLEN", KEYS[3]) + 1
        redis.call("RPUSH", KEYS[3], ARGV[2])
      else
        redis.call("RPUSH", KEYS[1], ARGV[1])
        redis.call("RPUSH", KEYS[2], ARGV[2])
      end

      return "," .. length .. "," .. "," .. wait .. ","
    `,
  });

  try {
    const result = await redis.rateLimiter(
      3,
      sessionId,
      `${sessionId}-userId`,
      `${sessionId}-queue`,
      new Date().getTime(),
      userId,
      limit
    );
    const length = +result.split(',')[1];
    // console.log('length', length);
    const wait = +result.split(',')[3];
    // console.log('wait', wait);
    return {
      pass: length < limit,
      wait,
    };
  } catch (err) {
    console.log('err', err);
  }
}

module.exports = rateLimiter;
