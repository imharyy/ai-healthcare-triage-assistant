import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';

const SocketContext = createContext(null);

export const useSocket = () => useContext(SocketContext);

export const SocketProvider = ({ children }) => {
  const { user } = useAuth();
  const socketRef = useRef(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!user) {
      if (socketRef.current) { socketRef.current.disconnect(); socketRef.current = null; setConnected(false); }
      return;
    }
    const socket = io(process.env.REACT_APP_API_URL || 'http://localhost:5000', {
      auth: { token: localStorage.getItem('token') }
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      setConnected(true);
      socket.emit('joinRoom', `user_${user._id}`);
      if (user.hospital) socket.emit('joinRoom', `hospital_${user.hospital}`);
    });
    socket.on('disconnect', () => setConnected(false));

    return () => { socket.disconnect(); socketRef.current = null; setConnected(false); };
  }, [user]);

  const joinQueue = (queueId) => socketRef.current?.emit('joinRoom', `queue_${queueId}`);
  const leaveQueue = (queueId) => socketRef.current?.emit('leaveRoom', `queue_${queueId}`);

  return (
    <SocketContext.Provider value={{ socket: socketRef.current, connected, joinQueue, leaveQueue }}>
      {children}
    </SocketContext.Provider>
  );
};
