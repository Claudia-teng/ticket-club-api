const redis = require('../service/cache');

async function rateLimiter(sessionId, userId) {
  // todo - validation
  const limit = 3;
  await redis.defineCommand('rateLimiter', {
    lua: `
      local limit = tonumber(ARGV[3])
      local eventLength = redis.call("LLEN", KEYS[1])
      local waitPeople = 0
      local user = 0
      
      if (eventLength >= limit) then
        local queueLength = redis.call("LLEN", KEYS[2])

        waitPeople = queueLength + 1
        redis.call("RPUSH", KEYS[2], ARGV[2])
        user = redis.call("LINDEX", KEYS[1], queueLength)
      else
        redis.call("RPUSH", KEYS[1], ARGV[1])
      end

      return "," .. eventLength .. "," .. waitPeople .. "," .. user .. ","
    `,
  });

  try {
    const timeStamp = new Date().getTime();
    const result = await redis.rateLimiter(2, sessionId, `${sessionId}-queue`, `${userId}:${timeStamp}`, userId, limit);
    // console.log('result', result);
    const eventLength = +result.split(',')[1];
    // console.log('eventLength', eventLength);
    const waitPeople = +result.split(',')[2];
    // console.log('waitPeople', waitPeople);
    const milliseconds = eventLength < limit ? 0 : result.split(',')[3].split(':')[1];
    // console.log('milliseconds', milliseconds);
    return {
      pass: eventLength < limit,
      waitPeople,
      timeStamp,
      milliseconds,
    };
  } catch (err) {
    console.log('err', err);
  }
}

module.exports = rateLimiter;
