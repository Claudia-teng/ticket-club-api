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
  let chatroom;
  socket.on('join room', (data) => {
    console.log(`in ${data.sessionId}-${data.areaId} room`);
    chatroom = `${data.sessionId}-${data.areaId}`;
    socket.join(chatroom);
  });

  socket.on('select seat', async (data) => {
    console.log(data);
    if (data.status_id === 4) {
      data.status_id = 5;
    }
    if (data.status_id === 1) {
      data.status_id = 1;
    }
    socket.to(chatroom).emit('select seat', data);
  });
});

httpServer.listen(PORT, () => {
  console.log(`Server is listening on port ${PORT}...`);
});
