require('dotenv').config();
const { createServer } = require('http');
const { createAdapter } = require('@socket.io/redis-adapter');
const { Server } = require('socket.io');
const { pubClient, subClient } = require('./service/redis');
const app = require('./app');
const httpServer = createServer(app);
const PORT = process.env.SERVER_PORT || 3000;
const { socketIsAuth } = require('./util/auth');
const io = new Server(httpServer, {
  cors: {
    origin: ['http://localhost:5000', 'https://claudia-teng.com', 'https://ticketclub.live'],
  },
});
io.adapter(createAdapter(pubClient, subClient));
const { checkLimit, joinRoom, selectSeat, unselectSeat, lockSeat, unlockSeat, soldSeat, disconnect } =
  require('./socket/controllers/seat.controller')(io);

io.use(async (socket, next) => {
  const token = socket.handshake.auth.token;
  try {
    const user = await socketIsAuth(token);
    if (user instanceof Error) return next(new Error('登入錯誤！'));
    socket.userId = user.id;
    next();
  } catch (err) {
    console.log('err', err);
    next(err);
  }
});

io.on('connection', (socket) => {
  socket.on('check limit', checkLimit);
  socket.on('join room', joinRoom);
  socket.on('select seat', selectSeat);
  socket.on('unselect seat', unselectSeat);
  socket.on('lock seat', lockSeat);
  socket.on('unlock seat', unlockSeat);
  socket.on('sold seat', soldSeat);
  socket.on('disconnect', disconnect);
});

httpServer.listen(PORT, () => {
  console.log(`Server is listening on port ${PORT}...`);
});
