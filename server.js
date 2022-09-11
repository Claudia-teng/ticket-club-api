require('dotenv').config();
const { createServer } = require('http');
const { Server } = require('socket.io');
const app = require('./app');
const httpServer = createServer(app);
const PORT = process.env.SERVER_PORT || 3000;
const { unlockSeats } = require('./controllers/seat.controller');
const { checkSessionExist } = require('./util/utils');
const { disconnectFromPage } = require('./service/queue');
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
    // user not login
    if (!socket.userId) return io.to(socket.id).emit('check limit', 'not login');
    const sessionExist = await checkSessionExist(sessionId);
    if (!sessionExist) return io.to(socket.id).emit('check limit', 'Please provide valid session ID.');
    const result = await rateLimiter(sessionId, socket.userId, limit);
    // console.log('result', result);
    // user is already in event or queue
    if (!result) {
      io.to(socket.id).emit('check limit', 'duplicate');
    }
    userIdSocket[socket.userId] = {
      socketId: socket.id,
      sessionId: sessionId,
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
    const sessionId = userIdSocket[userId].sessionId;
    const result = await disconnectFromPage(sessionId, userId, limit);
    const isInQueue = result.inQueue;
    const notifyUsers = result.notifyUsers;

    if (!isInQueue) {
      console.log('inEvent');
      // no users waiting
      if (!notifyUsers.length) return;
      // update timeStamp for togoUser & notify
      const togoUser = notifyUsers.shift();
      const togoUserId = togoUser.userId;
      const togoUserSocketId = userIdSocket[togoUserId].socketId;
      io.to(togoUserSocketId).emit('ready to go');
    } else {
      console.log('inQueue');
    }

    // emit to all users in queue
    for (const user of notifyUsers) {
      const socketId = userIdSocket[user.userId].socketId;
      const data = {
        seconds: user.seconds,
      };
      io.to(socketId).emit('minus waiting people', data);
    }
  });
});

httpServer.listen(PORT, () => {
  console.log(`Server is listening on port ${PORT}...`);
});
