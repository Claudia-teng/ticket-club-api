require('dotenv').config();
const { createServer } = require('http');
const { Server } = require('socket.io');
const app = require('./app');
const httpServer = createServer(app);
const PORT = process.env.SERVER_PORT || 3000;
const { unlockSeats } = require('./controllers/seat.controller');
const {
  getUserIdsAfterLeftPerson,
  removeUserIdFromQueue,
  removePersonFromEvent,
  moveFirstPersonToEvent,
  getUserIdsInQueue,
} = require('./service/queue');
const rateLimiter = require('./service/rate-limiter');
const io = new Server(httpServer, {
  cors: {
    origin: ['http://localhost:5000'],
  },
});

const userIdSocket = {};
// {
//   userId: {
//     socketId: 1,
//     sessionId: 1,
//     isInQueue: true
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
    const result = await rateLimiter(sessionId, socket.userId);
    // console.log('result', result);
    userIdSocket[socket.userId] = {
      socketId: socket.id,
      sessionId: sessionId,
      isInQueue: !result.pass,
      timeStamp: result.timeStamp,
    };
    console.log('userIdSocket', userIdSocket);
    io.to(socket.id).emit('check limit', result);
  });

  socket.on('join room', (data) => {
    // console.log(`in ${data.sessionId}-${data.areaId} room`);
    // socketId - userId + sessionId
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
    const socketId = socket.id;
    const userId = socket.userId;
    console.log('userIdSocket[userId]', userIdSocket[userId]);
    const isInQueue = userIdSocket[userId].isInQueue;
    const sessionId = userIdSocket[userId].sessionId;
    const timeStamp = userIdSocket[userId].timeStamp;

    if (!isInQueue) {
      await removePersonFromEvent(sessionId, userId, timeStamp);
      const user = await moveFirstPersonToEvent(sessionId);
      console.log('user', user);
      if (!user) return;
      // update isInQueue & timeStamp for target user
      const targetUserId = user.userId;
      userIdSocket[targetUserId].isInQueue = false;
      userIdSocket[targetUserId].timeStamp = user.timeStamp;
      // notify target user
      const targetSocketId = userIdSocket[targetUserId].socketId;
      io.to(targetSocketId).emit('ready to go');
      // notify other user in queue
      const userIds = await getUserIdsInQueue(sessionId);
      for (const userId of userIds) {
        const socketId = userIdSocket[userId].socketId;
        io.to(socketId).emit('minus waiting people');
      }
    } else {
      // remove left person
      const index = await removeUserIdFromQueue(sessionId, userId);
      // emit to all people behind the left person
      const userIds = await getUserIdsAfterLeftPerson(sessionId, index);
      for (const userId of userIds) {
        const socketId = userIdSocket[userId].socketId;
        io.to(socketId).emit('minus waiting people');
      }
    }
  });
});

httpServer.listen(PORT, () => {
  console.log(`Server is listening on port ${PORT}...`);
});
