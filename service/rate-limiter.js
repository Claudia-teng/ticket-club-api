const redis = require('../service/cache');

async function rateLimiter(sessionId, userId) {
  // todo - validation
  const limit = 3;
  await redis.defineCommand('rateLimiter', {
    lua: `
      local limit = tonumber(ARGV[2])
      local eventLength = redis.call("LLEN", KEYS[1])
      local waitPeople = 0
      local user = 0
      local queueRound = 0
      
      if (eventLength >= limit) then
        local queueLength = redis.call("LLEN", KEYS[2])
        local index =  queueLength % limit
        queueRound = math.floor(queueLength / limit)

        waitPeople = queueLength + 1
        redis.call("RPUSH", KEYS[2], ARGV[1])
        user = redis.call("LINDEX", KEYS[1], index)
      else
        redis.call("RPUSH", KEYS[1], ARGV[1])
      end

      return "," .. eventLength .. "," .. waitPeople .. "," .. user .. "," .. queueRound .. ","
    `,
  });

  try {
    const timeStamp = new Date().getTime();
    const result = await redis.rateLimiter(2, sessionId, `${sessionId}-queue`, `${userId}:${timeStamp}`, limit);
    console.log('result', result);
    const eventLength = +result.split(',')[1];
    // console.log('eventLength', eventLength);
    const waitPeople = +result.split(',')[2];
    // console.log('waitPeople', waitPeople);
    let milliseconds = eventLength < limit ? 0 : +result.split(',')[3].split(':')[1];
    // console.log('milliseconds', milliseconds);
    const queueRound = +result.split(',')[4];
    if (queueRound) {
      milliseconds = queueRound * (600 * 1000) + milliseconds;
    }
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
