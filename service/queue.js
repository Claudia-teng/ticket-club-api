const redis = require('../service/cache');

async function removePersonFromEvent(sessionId, userId, timeStamp) {
  const eventKey = `${sessionId}`;
  const eventUserIdKey = `${sessionId}-userId`;
  const index = await redis.lpos(eventUserIdKey, userId);
  await redis.lrem(eventUserIdKey, 1, userId);
  const eventQueue = await redis.lrange(eventKey, 0, -1);
}

async function moveFirstPersonToEvent(sessionId) {
  const eventKey = `${sessionId}`;
  const eventUserIdKey = `${sessionId}-userId`;
  const eventQueueKey = `${sessionId}-queue`;
  const userId = await redis.lmove(eventQueueKey, eventUserIdKey, 'LEFT', 'RIGHT');
  await redis.rpush(eventKey, new Date().getTime());
  return userId;
}

async function getUserIdsInQueue(sessionId) {
  const eventQueueKey = `${sessionId}-queue`;
  const userIds = await redis.lrange(eventQueueKey, 0, -1);
  return userIds;
}

async function getUserIdsAfterLeftPerson(key, userId) {
  const index = await redis.lpos(key, userId);
  const userIds = await redis.lrange(key, index + 1, -1);
  return userIds;
}

async function removeUserIdFromQueue(key, userId) {
  await redis.lrem(key, 1, userId);
}

module.exports = {
  removePersonFromEvent,
  moveFirstPersonToEvent,
  getUserIdsInQueue,
  getUserIdsAfterLeftPerson,
  removeUserIdFromQueue,
};
