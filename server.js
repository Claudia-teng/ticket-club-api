require('dotenv').config();
const { createServer } = require('http');
const { createAdapter } = require('@socket.io/redis-adapter');
const { Server } = require('socket.io');
const { pubClient, subClient } = require('./service/cache');
const app = require('./app');
const httpServer = createServer(app);
const PORT = process.env.SERVER_PORT || 3000;
const { socketIsAuth } = require('./util/auth');
const io = new Server(httpServer, {
  cors: {
    origin: ['http://localhost:5000', 'https://claudia-teng.com'],
  },
});
io.adapter(createAdapter(pubClient, subClient));
const { checkLimit, joinRoom, onSelectSeat, onUnselectSeat, onLockSeat, onUnlockSeat, onSoldSeat, onDisconnect } = require('./socketio')(io);

io.use(async (socket, next) => {
  const token = socket.handshake.auth.token;
  try {
    const user = await socketIsAuth(token);
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
  socket.on('select seat', onSelectSeat);
  socket.on('unselect seat', onUnselectSeat);
  socket.on('lock seat', onLockSeat);
  socket.on('unlock seat', onUnlockSeat);
  socket.on('sold seat', onSoldSeat);
  socket.on('disconnect', onDisconnect);
});

httpServer.listen(PORT, () => {
  console.log(`Server is listening on port ${PORT}...`);
});
