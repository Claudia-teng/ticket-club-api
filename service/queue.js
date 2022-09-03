const redis = require('../service/cache');

async function removePersonFromEvent(sessionId, userId, timeStamp) {
  const eventKey = `${sessionId}`;
  await redis.lrem(eventKey, 1, `${userId}:${timeStamp}`);
}

async function moveFirstPersonToEvent(sessionId) {
  const eventKey = `${sessionId}`;
  const eventQueueKey = `${sessionId}-queue`;
  const user = await redis.lmove(eventQueueKey, eventKey, 'LEFT', 'RIGHT');
  const userId = user?.split(':')[0];
  return userId;
}

async function getUserIdsInQueue(sessionId) {
  const eventQueueKey = `${sessionId}-queue`;
  const users = await redis.lrange(eventQueueKey, 0, -1);
  const userIds = users.map((user) => user.split(':')[0]);
  return userIds;
}

async function getUserIdsAfterLeftPerson(key, userId, timeStamp) {
  const index = await redis.lpos(key, `${userId}:${timeStamp}`);
  const users = await redis.lrange(key, index + 1, -1);
  const userIds = users.map((user) => user.split(':')[0]);
  return userIds;
}

async function removeUserIdFromQueue(key, userId, timeStamp) {
  await redis.lrem(key, 1, `${userId}:${timeStamp}`);
}

module.exports = {
  removePersonFromEvent,
  moveFirstPersonToEvent,
  getUserIdsInQueue,
  getUserIdsAfterLeftPerson,
  removeUserIdFromQueue,
};
