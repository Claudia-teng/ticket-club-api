const redis = require('../service/cache');

async function rateLimiter(sessionId, userId, limit) {
  await redis.defineCommand('rateLimiter', {
    lua: `
      local limit = tonumber(ARGV[3])
      local eventLength = redis.call("LLEN", KEYS[1])
      local waitPeople = 0
      local user = 0
      local queueRound = 0
      
      if (eventLength >= limit) then
        local index = 0
        local queueLength = redis.call("LLEN", KEYS[2])
        waitPeople = queueLength + 1
        queueRound = math.floor(queueLength / limit)
        index = queueLength % limit
        user = redis.call("LINDEX", KEYS[1], index)

        redis.call("RPUSH", KEYS[2], ARGV[2])
      else
        redis.call("RPUSH", KEYS[1], ARGV[1])
      end

      return "," .. eventLength .. "," .. waitPeople .. "," .. user .. "," .. queueRound .. ","
    `,
  });

  try {
    const timeStamp = new Date().getTime();
    const result = await redis.rateLimiter(2, sessionId, `${sessionId}-queue`, `${userId}:${timeStamp}`, userId, limit);
    console.log('result', result);
    const eventLength = +result.split(',')[1];
    // console.log('eventLength', eventLength);
    const waitPeople = +result.split(',')[2];
    // console.log('waitPeople', waitPeople);
    let milliseconds = eventLength < limit ? 0 : +result.split(',')[3].split(':')[1];
    // console.log('milliseconds', milliseconds);
    const queueRound = +result.split(',')[4];
    if (queueRound) milliseconds = queueRound * (600 * 1000) + milliseconds;
    const expires = +milliseconds + 600 * 1000;
    const seconds = Math.floor((expires - new Date().getTime()) / 1000) + 10;
    return {
      pass: eventLength < limit,
      waitPeople,
      timeStamp,
      seconds,
    };
  } catch (err) {
    console.log('err', err);
  }
}

module.exports = rateLimiter;
