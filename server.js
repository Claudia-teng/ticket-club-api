require('dotenv').config();
const { createServer } = require('http');
const { Server } = require('socket.io');
const app = require('./app');
const httpServer = createServer(app);
const PORT = process.env.SERVER_PORT || 3000;
const { unlockSeats } = require('./controllers/seat.controller');
const { disconnectFromQueue, disconnectFromEvent } = require('./service/queue');
const rateLimiter = require('./service/rate-limiter');
const io = new Server(httpServer, {
  cors: {
    origin: ['http://localhost:5000'],
  },
});

const userIdSocket = {};
const limit = 1;
// {
//   userId: {
//     socketId: 1,
//     sessionId: 1,
//     isInQueue: true
//     timeStamp: 123,
//   }
// };

io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  socket.userId = token;
  next();
});

io.on('connection', (socket) => {
  let chatroom;
  socket.on('check limit', async (sessionId) => {
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
    // console.log('lock seat', data);
    socket.to(chatroom).emit('lock seat', data);
  });

  socket.on('book seat', (data) => {
    // console.log('book seat', data);
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
      if (!users.length) return;
      // update isInQueue & timeStamp for togoUser & notify
      const togoUser = users.shift();
      const togoUserId = togoUser.userId;
      userIdSocket[togoUserId].isInQueue = false;
      userIdSocket[togoUserId].timeStamp = togoUser.timeStamp;
      const targetSocketId = userIdSocket[togoUserId].socketId;
      io.to(targetSocketId).emit('ready to go');
      // emit to all users in queue
      for (const user of users) {
        const socketId = userIdSocket[user.userId].socketId;
        console.log('1-socketId', socketId);
        const data = {
          timeStamp: user.timeStamp,
          milliseconds: user.milliseconds,
        };
        io.to(socketId).emit('minus waiting people', data);
      }
    } else {
      const users = await disconnectFromQueue(sessionId, userId, timeStamp, limit);
      // console.log('users', users);
      for (const user of users) {
        const socketId = userIdSocket[user.userId].socketId;
        const data = {
          timeStamp: user.timeStamp,
          milliseconds: user.milliseconds,
        };
        io.to(socketId).emit('minus waiting people', data);
      }
    }
  });
});

httpServer.listen(PORT, () => {
  console.log(`Server is listening on port ${PORT}...`);
});
