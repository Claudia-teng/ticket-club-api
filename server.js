require('dotenv').config();
const { createServer } = require('http');
const { Server } = require('socket.io');
const app = require('./app');
const httpServer = createServer(app);
const PORT = process.env.SERVER_PORT || 3000;
const io = new Server(httpServer, {
  cors: {
    origin: ['http://localhost:5000'],
  },
});

io.on('connection', (socket) => {
  // let chatroom;
  // socket.on('joinRoom', ({ room }) => {
  //   console.log('in room');
  //   chatroom = room;
  //   socket.join(room);
  // });

  socket.on('seatChange', async (data) => {
    socket.emit('seatChange', data);
  });
});

httpServer.listen(PORT, () => {
  console.log(`Server is listening on port ${PORT}...`);
});
