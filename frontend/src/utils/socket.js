import { io } from 'socket.io-client';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8001';


let socket = null;

export const initializeSocket = (token) => {
  if (socket && socket.connected) {
    console.log('Socket already initialized');
    return socket;
  }

  socket = io(`${BACKEND_URL}/chat`, {
    auth: {
      token,
    },
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    reconnectionAttempts: 5,
  });

  socket.on('connect', () => {
    console.log('✅ Connected to chat server');
  });

  socket.on('connect_error', (error) => {
    console.error('❌ Socket connection error:', error);
  });

  socket.on('disconnect', () => {
    console.log('👋 Disconnected from chat server');
  });

  return socket;
};

export const waitForSocket = () => {
  return new Promise((resolve) => {
    if (socket && socket.connected) {
      console.log('⚡ Socket already connected');
      resolve(socket);
    } else if (socket) {
      console.log('⏳ Waiting for socket connection...');
      socket.once('connect', () => {
        console.log('✅ Socket connected via waitForSocket');
        resolve(socket);
      });
      // Failsafe timeout
      setTimeout(() => {
        if (socket && socket.connected) {
          resolve(socket);
        } else {
          console.warn('⚠️ Socket connection timeout, proceeding anyway');
          resolve(socket);
        }
      }, 3000);
    } else {
      console.error('❌ Socket not initialized');
      resolve(null);
    }
  });
};

export const getSocket = () => {
  return socket;
};

export const getSocketStatus = () => {
  return {
    socketExists: !!socket,
    isConnected: socket?.connected,
    socketId: socket?.id,
    socketUrl: socket?.io?.uri,
  };
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
    console.log('Socket disconnected');
  }
};

export const emitMessage = (chatId, content, userId, replyTo = null) => {
  if (socket && socket.connected) {
    console.log('📤 Emitting message:', { chatId, content, replyTo });
    socket.emit('chat:message', { chatId, content, userId, replyTo });
  } else {
    console.error('Socket not connected. State:', {
      socketExists: !!socket,
      isConnected: socket?.connected,
      socketId: socket?.id,
    });
  }
};

export const emitJoin = (chatId, userId) => {
  if (socket && socket.connected) {
    console.log('🚪 Emitting join event:', { chatId, userId });
    socket.emit('chat:join', { chatId, userId });
  } else {
    console.error('Socket not connected for join. State:', {
      socketExists: !!socket,
      isConnected: socket?.connected,
      socketId: socket?.id,
    });
  }
};

export const emitTyping = (chatId, userId) => {
  if (socket && socket.connected) {
    socket.emit('chat:typing', { chatId, userId });
  }
};

export const emitStopTyping = (chatId, userId) => {
  if (socket && socket.connected) {
    socket.emit('chat:stop-typing', { chatId, userId });
  }
};

export const onMessage = (callback) => {
  if (socket) {
    socket.on('chat:message', callback);
    return () => socket.off('chat:message', callback);
  }
  return null;
};

export const onHistory = (callback) => {
  if (socket) {
    socket.on('chat:history', callback);
    return () => socket.off('chat:history', callback);
  }
};

export const onUserTyping = (callback) => {
  if (socket) {
    socket.on('chat:user-typing', callback);
    return () => socket.off('chat:user-typing', callback);
  }
};

export const onUserStopTyping = (callback) => {
  if (socket) {
    socket.on('chat:user-stop-typing', callback);
    return () => socket.off('chat:user-stop-typing', callback);
  }
};

export const onUserJoined = (callback) => {
  if (socket) {
    socket.on('chat:user-joined', callback);
    return () => socket.off('chat:user-joined', callback);
  }
};

export const onError = (callback) => {
  if (socket) {
    socket.on('chat:error', callback);
    return () => socket.off('chat:error', callback);
  }
};
