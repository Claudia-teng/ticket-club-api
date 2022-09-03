const redis = require('../service/cache');

async function removePersonFromEvent(sessionId, userId, timeStamp) {
  const eventKey = `${sessionId}`;
  await redis.lrem(eventKey, 1, `${userId}:${timeStamp}`);
}

async function moveFirstPersonToEvent(sessionId) {
  const eventKey = `${sessionId}`;
  const eventQueueKey = `${sessionId}-queue`;
  const userId = await redis.lpop(eventQueueKey);
  if (userId) {
    const timeStamp = new Date().getTime();
    await redis.rpush(eventKey, `${userId}:${timeStamp}`);
    return {
      userId,
      timeStamp,
    };
  } else {
    return null;
  }
}

async function getUserIdsInQueue(sessionId) {
  const eventQueueKey = `${sessionId}-queue`;
  const userIds = await redis.lrange(eventQueueKey, 0, -1);
  return userIds;
}

async function getUserIdsAfterLeftPerson(sessionId, index) {
  const eventQueueKey = `${sessionId}-queue`;
  const userIds = await redis.lrange(eventQueueKey, index, -1);
  return userIds;
}

async function removeUserIdFromQueue(sessionId, userId) {
  const eventQueueKey = `${sessionId}-queue`;
  const index = redis.lpos(eventQueueKey, userId);
  await redis.lrem(eventQueueKey, 1, userId);
  return index;
}

module.exports = {
  removePersonFromEvent,
  moveFirstPersonToEvent,
  getUserIdsInQueue,
  getUserIdsAfterLeftPerson,
  removeUserIdFromQueue,
};
