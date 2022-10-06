const rateLimiter = require('./util/rate-limiter');
const { disconnectFromPage } = require('./util/queue');
const { unlockSeats, unlockSeatsByUserId, selectSeat, unSelectSeat, unSelectSeatsByUserId } = require('./controllers/seat.controller');
const { pubClient } = require('./service/redis');
const limit = 3;
let chatroom;

module.exports = (io) => {
  async function checkLimit(sessionId) {
    const socket = this;
    const result = await rateLimiter(sessionId, socket.userId, limit);
    const userInfo = {
      socketId: socket.id,
      sessionId: sessionId,
    };
    await pubClient.hset('users', socket.userId, JSON.stringify(userInfo));
    io.to(socket.id).emit('check limit', result);
  }

  async function joinRoom(data) {
    const socket = this;
    chatroom = `${data.sessionId}-${data.areaId}`;
    socket.join(chatroom);
  }

  async function onSelectSeat(data) {
    console.log('select seat', data);
    const socket = this;
    const result = await selectSeat(data, socket.userId);
    if (result.error) {
      return io.to(socket.id).emit('self select seat', result);
    }
    io.to(socket.id).emit('self select seat', data);
    socket.to(chatroom).emit('other select seat', data);
  }

  async function onUnselectSeat(data) {
    console.log('unselect seat', data);
    const socket = this;
    const result = await unSelectSeat(data, socket.userId);
    if (result.error) {
      return io.to(socket.id).emit('unselect seat', result);
    }
    socket.to(chatroom).emit('unselect seat', data);
  }

  async function onLockSeat(data) {
    console.log('lock seat', data);
    const socket = this;
    socket.to(chatroom).emit('lock seat', data);
  }

  async function onUnlockSeat(data) {
    console.log('unlock seat', data);
    const socket = this;
    const result = await unlockSeats(socket.userId, data);
    if (result.error) {
      return io.to(socket.id).emit('unlock seat', result);
    }
    socket.to(chatroom).emit('unlock seat', data);
  }

  async function onSoldSeat(data) {
    console.log('sold seat', data);
    const socket = this;
    socket.to(chatroom).emit('sold seat', data);
  }

  async function onDisconnect() {
    console.log('disconnect');
    const socket = this;
    const userId = socket.userId;
    let userInfo = await pubClient.hget('users', userId);
    if (!userInfo) return;
    userInfo = JSON.parse(userInfo);
    console.log('userInfo', userInfo);
    const sessionId = userInfo.sessionId;

    // unselect disconnect user selected seats
    const unselectSeats = await unSelectSeatsByUserId(userId, sessionId);
    if (unselectSeats) socket.to(chatroom).emit('unselect seat', unselectSeats);

    // unlock disconnect user locked seats
    const unlockSeats = await unlockSeatsByUserId(userId, sessionId);
    if (unlockSeats) socket.to(chatroom).emit('unlock seat', unlockSeats);

    const result = await disconnectFromPage(sessionId, userId, limit);
    const isInQueue = result.inQueue;
    const notifyUsers = result.notifyUsers;

    if (!isInQueue) {
      console.log('inEvent');
      // no users waiting
      if (!notifyUsers.length) return;
      // notify togoUser
      const togoUser = notifyUsers.shift();
      const togoUserId = togoUser.userId;
      let togoUserInfo = await pubClient.hget('users', togoUserId);
      togoUserInfo = JSON.parse(togoUserInfo);
      const togoUserSocketId = togoUserInfo.socketId;
      io.to(togoUserSocketId).emit('ready to go');
    } else {
      console.log('inQueue');
    }

    // emit to all users in queue
    for (const user of notifyUsers) {
      let userInfo = await pubClient.hget('users', user.userId);
      userInfo = JSON.parse(userInfo);
      const socketId = userInfo.socketId;
      const data = {
        seconds: user.seconds,
      };
      io.to(socketId).emit('minus waiting people', data);
    }
  }

  return {
    checkLimit,
    joinRoom,
    onSelectSeat,
    onUnselectSeat,
    onLockSeat,
    onUnlockSeat,
    onSoldSeat,
    onDisconnect,
  };
};
