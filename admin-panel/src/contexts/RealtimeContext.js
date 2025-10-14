import { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';

const RealtimeContext = createContext();

export function RealtimeProvider({ children }) {
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [stats, setStats] = useState(null);
  const [events, setEvents] = useState([]);

  useEffect(() => {
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_SERVICE_URL || 'http://localhost:3002';
    const socketInstance = io(backendUrl, {
      auth: {
        token: process.env.NEXT_PUBLIC_BACKEND_SERVICE_TOKEN || 'admin-panel-token',
        service: 'admin-panel'
      },
      transports: ['websocket', 'polling']
    });

    // Connection handlers
    socketInstance.on('connect', () => {
      console.log('✅ Connected to Backend Service');
      setIsConnected(true);
    });

    socketInstance.on('disconnect', () => {
      console.log('❌ Disconnected from Backend Service');
      setIsConnected(false);
    });

    socketInstance.on('connect_error', (error) => {
      console.error('Connection error:', error);
      setIsConnected(false);
    });

    // Real-time event handlers
    socketInstance.on('stats:update', (data) => {
      setStats(data);
    });

    socketInstance.on('user:levelUp', (data) => {
      setEvents(prev => [{
        id: Date.now(),
        type: 'level_up',
        message: `${data.username} alcançou o nível ${data.newLevel}!`,
        timestamp: new Date(),
        data
      }, ...prev.slice(0, 49)]); // Keep last 50 events
    });

    socketInstance.on('user:dailyClaimed', (data) => {
      setEvents(prev => [{
        id: Date.now(),
        type: 'daily_claimed',
        message: `${data.username} coletou a recompensa diária`,
        timestamp: new Date(),
        data
      }, ...prev.slice(0, 49)]);
    });

    socketInstance.on('command:executed', (data) => {
      setEvents(prev => [{
        id: Date.now(),
        type: 'command_executed',
        message: `Comando /${data.commandName} executado por ${data.username}`,
        timestamp: new Date(),
        data
      }, ...prev.slice(0, 49)]);
    });

    socketInstance.on('system:notification', (data) => {
      setEvents(prev => [{
        id: Date.now(),
        type: 'system_notification',
        message: data.message,
        timestamp: new Date(),
        data
      }, ...prev.slice(0, 49)]);
    });

    setSocket(socketInstance);

    // Request initial stats
    setTimeout(() => {
      socketInstance.emit('admin:getStats');
    }, 1000);

    return () => {
      socketInstance.disconnect();
    };
  }, []);

  const reconnect = () => {
    if (socket) {
      socket.disconnect();
      socket.connect();
    }
  };

  const sendEvent = (eventName, data) => {
    if (socket && isConnected) {
      socket.emit(eventName, data);
    }
  };

  return (
    <RealtimeContext.Provider value={{
      socket,
      isConnected,
      stats,
      events,
      reconnect,
      sendEvent
    }}>
      {children}
    </RealtimeContext.Provider>
  );
}

export function useRealtime() {
  const context = useContext(RealtimeContext);
  if (!context) {
    throw new Error('useRealtime must be used within a RealtimeProvider');
  }
  return context;
}