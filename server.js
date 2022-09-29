require('dotenv').config();
const { createServer } = require('http');
const { createAdapter } = require('@socket.io/redis-adapter');
const { Server } = require('socket.io');
const { pubClient, subClient } = require('./service/cache');
const app = require('./app');
const httpServer = createServer(app);
const PORT = process.env.SERVER_PORT || 3000;
const { unlockSeats, unlockSeatsByUserId, selectSeat, unSelectSeat, unSelectSeatsByUserId } = require('./controllers/seat.controller');
const { disconnectFromPage } = require('./service/queue');
const rateLimiter = require('./service/rate-limiter');
const { socketIsAuth } = require('./util/auth');
const io = new Server(httpServer, {
  cors: {
    origin: ['http://localhost:5000', 'https://claudia-teng.com'],
  },
});

io.adapter(createAdapter(pubClient, subClient));

const limit = 10000;
// {
//   userId: {
//     socketId: 1,
//     sessionId: 1
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
  if (!socket.userId) return io.to(socket.id).emit('check limit', 'Not login');

  socket.on('check limit', async (sessionId) => {
    const result = await rateLimiter(sessionId, socket.userId, limit);
    // console.log('result', result);

    const userInfo = {
      socketId: socket.id,
      sessionId: sessionId,
    };
    await pubClient.hset('users', socket.userId, JSON.stringify(userInfo));

    io.to(socket.id).emit('check limit', result);
  });

  socket.on('join room', (data) => {
    // console.log(`in ${data.sessionId}-${data.areaId} room`);
    chatroom = `${data.sessionId}-${data.areaId}`;
    socket.join(chatroom);
  });

  socket.on('select seat', async (data) => {
    console.log('select seat', data);
    const result = await selectSeat(data, socket.userId);
    if (result.error) {
      return io.to(socket.id).emit('self select seat', result);
    }
    io.to(socket.id).emit('self select seat', data);
    socket.to(chatroom).emit('other select seat', data);
  });

  socket.on('unselect seat', async (data) => {
    console.log('unselect seat', data);
    const result = await unSelectSeat(data, socket.userId);
    if (result.error) {
      return io.to(socket.id).emit('unselect seat', result);
    }
    socket.to(chatroom).emit('unselect seat', data);
  });

  socket.on('lock seat', (data) => {
    console.log('lock seat', data);
    socket.to(chatroom).emit('lock seat', data);
  });

  socket.on('unlock seat', async (data) => {
    console.log('unlock seat', data);
    const result = await unlockSeats(socket.userId, data);
    if (result.ok) {
      socket.to(chatroom).emit('unlock seat', data);
    } else {
      socket.to(chatroom).emit('unlock seat', result);
    }
  });

  socket.on('book seat', (data) => {
    console.log('book seat', data);
    socket.to(chatroom).emit('book seat', data);
  });

  socket.on('disconnect', async (data) => {
    console.log('disconnect');
    const userId = socket.userId;
    let userInfo = await pubClient.hget('users', userId);
    if (!userInfo) return;
    userInfo = JSON.parse(userInfo);
    console.log('userInfo', userInfo);
    const sessionId = userInfo.sessionId;

    // unselect disconnect user locked seats
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
  });
});

httpServer.listen(PORT, () => {
  console.log(`Server is listening on port ${PORT}...`);
});
