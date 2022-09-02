const redis = require('../service/cache');

async function rateLimiter(sessionId) {
  // todo - validation
  await redis.defineCommand('rateLimiter', {
    lua: `
      local length = redis.call("LLEN", KEYS[1])
      local wait = 0
      
      if (length >= 10) then
        wait = redis.call("LLEN", KEYS[2]) + 1
        redis.call("RPUSH", KEYS[2], ARGV[2])
      else
        redis.call("RPUSH", KEYS[1], ARGV[1])
      end

      return "," .. length .. "," .. "," .. wait .. ","
    `,
  });

  try {
    const result = await redis.rateLimiter(2, sessionId, `${sessionId}-queue`, new Date().getTime(), 'userId');
    const length = +result.split(',')[1];
    // console.log('length', length);
    const wait = +result.split(',')[3];
    // console.log('wait', wait);
    return {
      pass: length < 10,
      wait,
    };
  } catch (err) {
    console.log('err', err);
  }
}

module.exports = rateLimiter;
