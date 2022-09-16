const { pubClient } = require('../service/cache');

async function rateLimiter(sessionId, userId, limit) {
  await pubClient.defineCommand('rateLimiter', {
    lua: `
      local eventKey = KEYS[1]
      local eventTime = KEYS[2]
      local eventQueueKey = KEYS[3]
      local userId = ARGV[1]
      local currentTimeStamp = ARGV[2]
      local limit = tonumber(ARGV[3])
      local eventLength = redis.call("LLEN", eventKey)
      local waitPeople = 0
      local time = 0
      local queueRound = 0
      
      local eventIndex = redis.call("LPOS", eventKey, userId)
      local eventQueueIndex = redis.call("LPOS", eventQueueKey, userId)
      if (eventIndex or eventQueueIndex) then 
        return 'false'
      else 
        if (eventLength >= limit) then
          local index = 0
          local queueLength = redis.call("LLEN", eventQueueKey)
          waitPeople = queueLength + 1
          queueRound = math.floor(queueLength / limit)
          index = queueLength % limit
          
          local targetUserId = redis.call("LINDEX", eventKey, index)
          redis.call("RPUSH", eventQueueKey, userId)
          time = redis.call("HGET", eventTime, targetUserId)
        else
          redis.call("RPUSH", eventKey, userId)
          time = redis.call("HSET", eventTime, userId, currentTimeStamp)
        end
        return "," .. eventLength .. "," .. waitPeople .. "," .. time .. "," .. queueRound .. ","
      end
    `,
  });

  try {
    const currentTimeStamp = new Date().getTime();
    const result = await pubClient.rateLimiter(
      3,
      `{${sessionId}}:${sessionId}`,
      `{${sessionId}}:${sessionId}-time`,
      `{${sessionId}}:${sessionId}-queue`,
      userId,
      currentTimeStamp,
      limit
    );
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
