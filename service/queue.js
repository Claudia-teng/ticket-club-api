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

async function getUserIdsInQueue(sessionId, limit) {
  const eventKey = sessionId;
  const eventQueueKey = `${sessionId}-queue`;
  const eventQueueLength = await redis.llen(eventQueueKey);
  const notifyUsers = [];
  for (let i = 0; i < eventQueueLength; i++) {
    const self = await redis.lindex(eventQueueKey, i);
    const queueRound = Math.floor(eventQueueLength / limit);
    let targetIndex;
    let targetUser;
    if (queueRound < 1) {
      targetIndex = eventQueueLength % limit;
      targetUser = await redis.lindex(eventKey, targetIndex);
    } else {
      targetIndex = (queueRound - 1) * limit + (eventQueueLength % limit);
      targetUser = await redis.lindex(eventQueueKey, targetIndex);
    }
    notifyUsers.push({
      userId: self.split(':')[0],
      timeStamp: self.split(':')[1],
      milliseconds: targetUser.split(':')[1],
    });
  }
  console.log('notifyUsers', notifyUsers);
  return notifyUsers;
}

async function getUserIdsAfterLeftPerson(sessionId, index, limit) {
  const eventKey = sessionId;
  const eventQueueKey = `${sessionId}-queue`;
  const eventQueueLength = await redis.llen(eventQueueKey);
  console.log('index', index);
  console.log('eventQueueLength', eventQueueLength);
  const notifyUsers = [];
  for (let i = index; i < eventQueueLength; i++) {
    const self = await redis.lindex(eventQueueKey, i);
    const queueRound = Math.floor(eventQueueLength / limit);
    let targetIndex;
    let targetUser;
    if (queueRound < 1) {
      targetIndex = eventQueueLength % limit;
      targetUser = await redis.lindex(eventKey, targetIndex);
    } else {
      targetIndex = (queueRound - 1) * limit + (eventQueueLength % limit);
      targetUser = await redis.lindex(eventQueueKey, targetIndex);
    }
    notifyUsers.push({
      userId: self.split(':')[0],
      timeStamp: self.split(':')[1],
      milliseconds: targetUser.split(':')[1],
    });
  }
  return notifyUsers;
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
