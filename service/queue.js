const redis = require('../service/cache');

async function disconnectFromPage(sessionId, userId, limit) {
  await redis.defineCommand('disconnectFromPage', {
    lua: `
      local eventKey = KEYS[1]
      local eventTime = KEYS[2]
      local eventQueueKey = KEYS[3]
      local userId = ARGV[1]
      local currentTimeStamp = ARGV[2]
      local limit = tonumber(ARGV[3])
      local index = redis.call("LPOS", eventQueueKey, userId)

      if (index) then
        redis.call("LREM", eventQueueKey, 1, userId)

        local eventQueueLength = redis.call("LLEN", eventQueueKey)
        local notifyUsers = {}
        table.insert(notifyUsers, 'true')

        if (eventQueueLength > 0) then 
          for i = index, eventQueueLength - 1 do
            local self = redis.call("LINDEX", eventQueueKey, i)
            local queueRound = math.floor(i / limit);
            local targetIndex = 0
            local targetUserId = 0
            local time = 0
            targetIndex = i % limit;
            targetUserId = redis.call("LINDEX", eventKey, targetIndex)
            time = redis.call("HGET", eventTime, targetUserId)
            table.insert(notifyUsers, self .. "," .. time .. "," .. queueRound .. ",")
          end
        end
        return notifyUsers
      else
        redis.call("LREM", eventKey, 1, userId)
        redis.call("HDEL", eventTime, userId)

        local notifyUsers = {}
        table.insert(notifyUsers, 'false')
        local togoUserId = redis.call("LPOP", eventQueueKey)

        if (togoUserId) then
          redis.call("RPUSH", eventKey, togoUserId)
          redis.call("HSET", eventTime, togoUserId, currentTimeStamp)
          table.insert(notifyUsers, togoUserId)

          local eventQueueLength = redis.call("LLEN", eventQueueKey)
          if (eventQueueLength > 0) then 
            for i = 0, eventQueueLength - 1 do
              local self = redis.call("LINDEX", eventQueueKey, i)
              local queueRound = math.floor(i / limit);
              local targetIndex = 0
              local targetUserId = 0
              local time = 0
              targetIndex = i % limit;
              targetUserId = redis.call("LINDEX", eventKey, targetIndex)
              time = redis.call("HGET", eventTime, targetUserId)
              table.insert(notifyUsers, self .. "," .. time .. "," .. queueRound .. ",")
            end
          end
        end
        return notifyUsers
      end
    `,
  });

  const currentTimeStamp = new Date().getTime();
  try {
    const results = await redis.disconnectFromPage(
      3,
      sessionId,
      `${sessionId}-time`,
      `${sessionId}-queue`,
      userId,
      currentTimeStamp,
      limit
    );
    console.log('results', results);
    let inQueue;
    if (results.shift() === 'true') {
      inQueue = true;
    } else {
      inQueue = false;
    }
    const notifyUsers = [];
    if (!inQueue) {
      if (!results.length)
        return {
          inQueue,
          notifyUsers,
        };
      const togoUser = results.shift();
      notifyUsers.push({
        userId: togoUser,
      });
    }

    results.forEach((result) => {
      const queueRound = result.split(',')[2];
      let milliseconds = +result.split(',')[1];
      if (queueRound) milliseconds = queueRound * (600 * 1000) + milliseconds;
      const expires = +milliseconds + 600 * 1000;
      const seconds = Math.floor((expires - new Date().getTime()) / 1000) + 10;
      notifyUsers.push({
        userId: result.split(',')[0],
        seconds,
      });
    });
    return {
      inQueue,
      notifyUsers,
    };
  } catch (err) {
    console.log('err', err);
  }
}

module.exports = {
  disconnectFromPage,
};
