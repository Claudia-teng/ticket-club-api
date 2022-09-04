const redis = require('../service/cache');

async function removePersonFromEvent(sessionId, userId, timeStamp) {
  const eventKey = `${sessionId}`;
  await redis.lrem(eventKey, 1, `${userId}:${timeStamp}`);
}

async function moveFirstPersonToEvent(sessionId) {
  const eventKey = `${sessionId}`;
  const eventQueueKey = `${sessionId}-queue`;
  const user = await redis.lpop(eventQueueKey);
  if (user) {
    const userId = user.split(':')[0];
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
  const users = await redis.lrange(eventQueueKey, 0, -1);
  // todo - find corresponding time from eventKey
  const userIds = users.map((user) => user.split(':')[0]);
  return userIds;
}

async function getUserIdsAfterLeftPerson(sessionId, index) {
  const eventQueueKey = `${sessionId}-queue`;
  const users = await redis.lrange(eventQueueKey, index, -1);
  // todo - find corresponding time from eventKey
  const userIds = users.map((user) => user.split(':')[0]);
  return userIds;
}

async function removeUserIdFromQueue(sessionId, userId, timeStamp) {
  const eventQueueKey = `${sessionId}-queue`;
  const index = redis.lpos(eventQueueKey, `${userId}:${timeStamp}`);
  await redis.lrem(eventQueueKey, 1, `${userId}:${timeStamp}`);
  return index;
}

module.exports = {
  removePersonFromEvent,
  moveFirstPersonToEvent,
  getUserIdsInQueue,
  getUserIdsAfterLeftPerson,
  removeUserIdFromQueue,
};
