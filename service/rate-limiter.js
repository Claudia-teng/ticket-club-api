const redis = require('../service/cache');

async function rateLimiter(sessionId, userId) {
  // todo - validation
  const limit = 3;
  await redis.defineCommand('rateLimiter', {
    lua: `
      local limit = tonumber(ARGV[2])
      local length = redis.call("LLEN", KEYS[1])
      local wait = 0
      
      if (length >= limit) then
        wait = redis.call("LLEN", KEYS[2]) + 1
        redis.call("RPUSH", KEYS[2], ARGV[1])
      else
        redis.call("RPUSH", KEYS[1], ARGV[1])
      end

      return "," .. length .. "," .. "," .. wait .. ","
    `,
  });

  try {
    const timeStamp = new Date().getTime();
    const result = await redis.rateLimiter(2, sessionId, `${sessionId}-queue`, `${userId}:${timeStamp}`, limit);
    const length = +result.split(',')[1];
    // console.log('length', length);
    const wait = +result.split(',')[3];
    // console.log('wait', wait);
    return {
      pass: length < limit,
      wait,
      timeStamp,
    };
  } catch (err) {
    console.log('err', err);
  }
}

module.exports = rateLimiter;
