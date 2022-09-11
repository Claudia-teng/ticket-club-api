const redis = require('../service/cache');

async function rateLimiter(sessionId, userId, limit) {
  await redis.defineCommand('rateLimiter', {
    lua: `
      local userId = ARGV[1]
      local currentTimeStamp = ARGV[2]
      local limit = tonumber(ARGV[3])
      local eventLength = redis.call("LLEN", KEYS[1])
      local waitPeople = 0
      local time = 0
      local queueRound = 0
      
      local eventIndex = redis.call("LPOS", KEYS[1], userId)
      local eventQueueIndex = redis.call("LPOS", KEYS[2], userId)
      if (eventIndex or eventQueueIndex) then 
        return 'false'
      else 
        if (eventLength >= limit) then
          local index = 0
          local queueLength = redis.call("LLEN", KEYS[2])
          waitPeople = queueLength + 1
          queueRound = math.floor(queueLength / limit)
          index = queueLength % limit
          
          local targetUserId = redis.call("LINDEX", KEYS[1], index)
          local userIdKey = 'user' .. targetUserId
          time = redis.call("GET", userIdKey)
          redis.call("RPUSH", KEYS[2], userId)
        else
          redis.call("RPUSH", KEYS[1], userId)
          local userIdKey = 'user' .. userId
          redis.call("SET", userIdKey, currentTimeStamp)
        end
        return "," .. eventLength .. "," .. waitPeople .. "," .. time .. "," .. queueRound .. ","
      end
    `,
  });

  try {
    const currentTimeStamp = new Date().getTime();
    const result = await redis.rateLimiter(2, sessionId, `${sessionId}-queue`, userId, currentTimeStamp, limit);
    console.log('result', result);
    // user is already in event or queue
    if (result === 'false') return false;
    const eventLength = +result.split(',')[1];
    // console.log('eventLength', eventLength);
    const waitPeople = +result.split(',')[2];
    // console.log('waitPeople', waitPeople);
    let milliseconds = eventLength < limit ? 0 : +result.split(',')[3];
    // console.log('milliseconds', milliseconds);
    const queueRound = +result.split(',')[4];
    if (queueRound) milliseconds = queueRound * (600 * 1000) + milliseconds;
    const expires = +milliseconds + 600 * 1000;
    const seconds = Math.floor((expires - new Date().getTime()) / 1000) + 10;
    return {
      pass: eventLength < limit,
      waitPeople,
      seconds,
    };
  } catch (err) {
    console.log('err', err);
  }
}

module.exports = rateLimiter;
