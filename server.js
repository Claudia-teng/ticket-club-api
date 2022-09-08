require('dotenv').config();
const { createServer } = require('http');
const { Server } = require('socket.io');
const app = require('./app');
const httpServer = createServer(app);
const PORT = process.env.SERVER_PORT || 3000;
const { unlockSeats } = require('./controllers/seat.controller');
const { checkSessionExist } = require('./util/utils');
const { disconnectFromQueue, disconnectFromEvent } = require('./service/queue');
const rateLimiter = require('./service/rate-limiter');
const { socketIsAuth } = require('./util/auth');
const io = new Server(httpServer, {
  cors: {
    origin: ['http://localhost:5000', 'https://claudia-teng.com'],
  },
});

const userIdSocket = {};
const limit = 3;
// {
//   userId: {
//     socketId: 1,
//     sessionId: 1,
//     isInQueue: true
//     timeStamp: 123,
//   }
// };

io.use(async (socket, next) => {
  const token = socket.handshake.auth.token;
  // console.log('token', token);
  if (!token) return next();
  const user = await socketIsAuth(token);
  // console.log('user', user);
  if (!user) return next();
  socket.userId = user.id;
  next();
});

io.on('connection', (socket) => {
  let chatroom;
  socket.on('check limit', async (sessionId) => {
    if (!socket.userId) return io.to(socket.id).emit('check limit', null);
    const sessionExist = await checkSessionExist(sessionId);
    if (!sessionExist) return;
    const result = await rateLimiter(sessionId, socket.userId, limit);
    // console.log('result', result);
    userIdSocket[socket.userId] = {
      socketId: socket.id,
      sessionId: sessionId,
      isInQueue: !result.pass,
      timeStamp: result.timeStamp,
    };
    // console.log('userIdSocket', userIdSocket);
    io.to(socket.id).emit('check limit', result);
  });

  socket.on('join room', (data) => {
    // console.log(`in ${data.sessionId}-${data.areaId} room`);
    chatroom = `${data.sessionId}-${data.areaId}`;
    socket.join(chatroom);
  });

  socket.on('select seat', (data) => {
    // console.log(data);
    if (data.status_id === 4) {
      data.status_id = 5;
    }
    if (data.status_id === 1) {
      data.status_id = 1;
    }
    socket.to(chatroom).emit('select seat', data);
  });

  socket.on('lock seat', (data) => {
    console.log('lock seat', data);
    socket.to(chatroom).emit('lock seat', data);
  });

  socket.on('book seat', (data) => {
    console.log('book seat', data);
    socket.to(chatroom).emit('book seat', data);
  });

  socket.on('unselect seat', (data) => {
    // console.log('unselect seat', data);
    socket.to(chatroom).emit('unselect seat', data);
  });

  socket.on('unlock seat', async (data) => {
    // console.log('unlock seat', data);
    await unlockSeats(data);
    socket.to(chatroom).emit('unlock seat', data);
  });

  socket.on('disconnect', async (data) => {
    console.log('disconnect');
    const userId = socket.userId;
    if (!userIdSocket[userId]) return;
    const isInQueue = userIdSocket[userId].isInQueue;
    const sessionId = userIdSocket[userId].sessionId;
    const timeStamp = userIdSocket[userId].timeStamp;

    if (!isInQueue) {
      const users = await disconnectFromEvent(sessionId, userId, timeStamp, limit);
      // no users waiting
      console.log('users', users);
      if (!users.length) return;
      // update isInQueue & timeStamp for togoUser & notify
      const togoUser = users.shift();
      const togoUserId = togoUser.userId;
      console.log('togoUserId', togoUserId);
      userIdSocket[togoUserId].isInQueue = false;
      userIdSocket[togoUserId].timeStamp = togoUser.timeStamp;
      const targetSocketId = userIdSocket[togoUserId].socketId;
      io.to(targetSocketId).emit('ready to go');
      // emit to all users in queue
      for (const user of users) {
        const socketId = userIdSocket[user.userId].socketId;
        const expires = +user.milliseconds + 600 * 1000;
        const seconds = Math.floor((expires - new Date().getTime()) / 1000) + 10;
        const data = {
          timeStamp: user.timeStamp,
          milliseconds: user.milliseconds,
          seconds: seconds,
        };
        io.to(socketId).emit('minus waiting people', data);
      }
    } else {
      const users = await disconnectFromQueue(sessionId, userId, timeStamp, limit);
      // console.log('users', users);
      for (const user of users) {
        const socketId = userIdSocket[user.userId].socketId;
        const expires = +user.milliseconds + 600 * 1000;
        const seconds = Math.floor((expires - new Date().getTime()) / 1000) + 10;
        const data = {
          timeStamp: user.timeStamp,
          milliseconds: user.milliseconds,
          seconds: seconds,
        };
        io.to(socketId).emit('minus waiting people', data);
      }
    }
  });
});

httpServer.listen(PORT, () => {
  console.log(`Server is listening on port ${PORT}...`);
});
