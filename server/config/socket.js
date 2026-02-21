const { Server } = require('socket.io');

let io;

const initSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: process.env.FRONTEND_URL || 'http://localhost:3000',
      methods: ['GET', 'POST'],
      credentials: true
    }
  });

  io.on('connection', (socket) => {
    console.log(`Client connected: ${socket.id}`);

    // Join user-specific room
    socket.on('join', (userId) => {
      socket.join(`user_${userId}`);
      console.log(`User ${userId} joined their room`);
    });

    // Join hospital room
    socket.on('joinHospital', (hospitalId) => {
      socket.join(`hospital_${hospitalId}`);
    });

    // Join queue room
    socket.on('joinQueue', (data) => {
      socket.join(`queue_${data.doctorId}_${data.date}`);
    });

    // Doctor status update
    socket.on('doctorStatus', (data) => {
      io.to(`hospital_${data.hospitalId}`).emit('doctorStatusUpdate', data);
    });

    // Queue position update
    socket.on('queueUpdate', (data) => {
      io.to(`queue_${data.doctorId}_${data.date}`).emit('queuePositionUpdate', data);
    });

    // Emergency alert
    socket.on('emergencyAlert', (data) => {
      io.to(`hospital_${data.hospitalId}`).emit('emergencyNotification', data);
    });

    // Telemedicine signaling
    socket.on('callUser', (data) => {
      io.to(`user_${data.to}`).emit('incomingCall', {
        signal: data.signal,
        from: data.from,
        name: data.name
      });
    });

    socket.on('answerCall', (data) => {
      io.to(`user_${data.to}`).emit('callAccepted', data.signal);
    });

    // Chat message
    socket.on('sendMessage', (data) => {
      io.to(`user_${data.to}`).emit('receiveMessage', data);
    });

    socket.on('disconnect', () => {
      console.log(`Client disconnected: ${socket.id}`);
    });
  });

  return io;
};

const getIO = () => {
  if (!io) throw new Error('Socket.IO not initialized');
  return io;
};

module.exports = { initSocket, getIO };
