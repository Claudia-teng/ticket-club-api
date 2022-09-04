const redis = require('../service/cache');

async function disconnectFromEvent(sessionId, userId, timeStamp, limit) {
  // todo - validation
  // remove user from event
  // move first user in queue to event
  // get all users in queue
  await redis.defineCommand('disconnectFromEvent', {
    lua: `
      local eventKey = KEYS[1]
      local eventQueueKey = KEYS[2]
      local limit = tonumber(ARGV[3])
      redis.call("LREM", eventKey, 1, ARGV[1])

      local notifyUsers = {}
      local togoUserInfo = redis.call("LPOP", eventQueueKey)

      if (togoUserInfo) then
        local togoUserId = string.match(togoUserInfo, "(.-):")
        local timeStamp = ARGV[2]
        local togoUser = togoUserId .. ":" .. timeStamp
        redis.call("RPUSH", eventKey, togoUser)
        table.insert(notifyUsers, togoUser)

        local eventQueueLength = redis.call("LLEN", eventQueueKey)
        for i = 0, eventQueueLength - 1 do
          local self = redis.call("LINDEX", eventQueueKey, i)
          local queueRound = math.floor(i / limit);
          local targetIndex = 0
          local targetUser = 0
          if (queueRound < 1) then
            targetIndex = eventQueueLength % limit;
            targetUser = redis.call("LINDEX", eventKey, targetIndex)
          else
            targetIndex = (queueRound - 1) * limit + (eventQueueLength % limit)
            targetUser = redis.call("LINDEX", eventQueueKey, targetIndex)
          end
          table.insert(notifyUsers, self .. "," .. targetUser .. "," .. queueRound .. ",")
        end
      end

      return notifyUsers
    `,
  });

  try {
    const results = await redis.disconnectFromEvent(
      2,
      sessionId,
      `${sessionId}-queue`,
      `${userId}:${timeStamp}`,
      timeStamp,
      limit
    );
    // console.log('results', results);
    const notifyUsers = [];
    if (!results.length) return notifyUsers;
    const togoUser = results.shift();
    notifyUsers.push({
      userId: togoUser.split(':')[0],
      timeStamp: togoUser.split(':')[1],
    });
    results.forEach((result) => {
      const queueRound = result.split(',')[2];
      let milliseconds = +result.split(',')[1].split(':')[1];
      if (queueRound) milliseconds = queueRound * (600 * 1000) + milliseconds;
      notifyUsers.push({
        userId: result.split(',')[0].split(':')[0],
        timeStamp: result.split(',')[0].split(':')[1],
        milliseconds,
      });
    });
    return notifyUsers;
  } catch (err) {
    console.log('err', err);
  }
}

async function disconnectFromQueue(sessionId, userId, timeStamp, limit) {
  // todo - validation
  // remove left user & get all users behind the left user
  await redis.defineCommand('disconnectFromQueue', {
    lua: `
      local eventKey = KEYS[1]
      local eventQueueKey = KEYS[2]
      local limit = tonumber(ARGV[2])
      local index = redis.call("LPOS", eventQueueKey, ARGV[1])
      redis.call("LREM", eventQueueKey, 1, ARGV[1])

      local eventQueueLength = redis.call("LLEN", eventQueueKey)
      local notifyUsers = {}

      if (eventQueueLength) then 
        for i = index, eventQueueLength - 1 do
          local self = redis.call("LINDEX", eventQueueKey, i)
          local queueRound = math.floor(i / limit);
          local targetIndex = 0
          local targetUser = 0
          if (queueRound < 1) then
            targetIndex = eventQueueLength % limit;
            targetUser = redis.call("LINDEX", eventKey, targetIndex)
          else
            targetIndex = (queueRound - 1) * limit + (eventQueueLength % limit)
            targetUser = redis.call("LINDEX", eventQueueKey, targetIndex)
          end
          table.insert(notifyUsers, self .. "," .. targetUser .. "," .. queueRound .. ",")
        end
      end

      return notifyUsers
    `,
  });

  try {
    const results = await redis.disconnectFromQueue(
      2,
      sessionId,
      `${sessionId}-queue`,
      `${userId}:${timeStamp}`,
      limit
    );
    // console.log('results', results);
    const notifyUsers = [];
    results.forEach((result) => {
      const queueRound = result.split(',')[2];
      let milliseconds = +result.split(',')[1].split(':')[1];
      if (queueRound) milliseconds = queueRound * (600 * 1000) + milliseconds;
      notifyUsers.push({
        userId: result.split(',')[0].split(':')[0],
        timeStamp: result.split(',')[0].split(':')[1],
        milliseconds,
      });
    });
    return notifyUsers;
  } catch (err) {
    console.log('err', err);
  }
}

module.exports = {
  disconnectFromQueue,
  disconnectFromEvent,
};
