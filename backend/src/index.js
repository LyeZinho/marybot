import { createServer } from 'http';
import { Server } from 'socket.io';
import express from 'express';
import cors from 'cors';
import { config } from 'dotenv';
import { EventEmitter } from 'events';
import axios from 'axios';
import jwt from 'jsonwebtoken';

// Import services
import { discordService } from './services/discordService.js';
import { economyService } from './services/economyService.js';
import { gameService } from './services/gameService.js';
import { workerManager } from './services/workerManager.js';

// Load environment variables
config();

const app = express();
const server = createServer(app);

// Event bus for inter-service communication
class EventBus extends EventEmitter {
  constructor() {
    super();
    this.setMaxListeners(100);
  }

  // Emit event to all connected services
  broadcast(event, data, excludeSocket = null) {
    console.log(`📡 Broadcasting event: ${event}`, data);
    this.emit(event, data);
    
    // Also emit via WebSocket to connected services
    if (io) {
      const payload = { event, data, timestamp: new Date() };
      if (excludeSocket) {
        excludeSocket.broadcast.emit('service_event', payload);
      } else {
        io.emit('service_event', payload);
      }
    }
  }

  // Handle service-to-service requests
  async request(serviceName, endpoint, data = {}) {
    const serviceUrls = {
      api: process.env.API_SERVICE_URL || 'http://localhost:3001',
      admin: process.env.ADMIN_SERVICE_URL || 'http://localhost:3002'
    };

    if (!serviceUrls[serviceName]) {
      throw new Error(`Unknown service: ${serviceName}`);
    }

    try {
      const response = await axios.post(`${serviceUrls[serviceName]}${endpoint}`, data, {
        headers: {
          'Authorization': `Bearer ${process.env.SERVICE_TOKEN}`,
          'Content-Type': 'application/json'
        },
        timeout: 10000
      });
      return response.data;
    } catch (error) {
      console.error(`❌ Service request failed: ${serviceName}${endpoint}`, error.message);
      throw error;
    }
  }
}

const eventBus = new EventBus();

// Socket.IO configuration
const io = new Server(server, {
  cors: {
    origin: process.env.ALLOWED_ORIGINS?.split(',') || [
      'http://localhost:3000',
      'http://localhost:3002'
    ],
    methods: ['GET', 'POST'],
    credentials: true
  },
  transports: ['websocket', 'polling']
});

// Express middleware
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || [
    'http://localhost:3000',
    'http://localhost:3002'
  ],
  credentials: true
}));
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  const healthData = {
    status: 'healthy',
    service: 'marybot-backend',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    connectedClients: io.sockets.sockets.size,
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    eventBus: {
      listeners: eventBus.listenerCount(),
      maxListeners: eventBus.getMaxListeners()
    },
    services: {
      discord: !!discordService,
      economy: !!economyService,
      game: !!gameService,
      workers: !!workerManager
    },
    workers: workerManager.getStats(),
    activeQuizzes: gameService.getQuizStats()
  };
  
  res.json(healthData);
});

// Service status endpoint
app.get('/status', async (req, res) => {
  const services = {
    api: { url: process.env.API_SERVICE_URL || 'http://localhost:3001', status: 'unknown' },
    backend: { url: `http://localhost:${PORT}`, status: 'online' }
  };

  // Check API service health
  try {
    await axios.get(`${services.api.url}/health`, { timeout: 5000 });
    services.api.status = 'online';
  } catch (error) {
    services.api.status = 'offline';
  }

  res.json({
    services,
    connectedClients: io.sockets.sockets.size,
    eventBusListeners: eventBus.listenerCount('*'),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Worker management endpoints
app.post('/api/workers/schedule', express.json(), async (req, res) => {
  const { type, payload, options } = req.body;
  
  try {
    const jobId = await workerManager.scheduleJob({
      type,
      payload,
      priority: options?.priority || 'normal',
      delay: options?.delay || 0
    });
    
    res.json({ success: true, jobId });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

app.get('/api/workers/stats', (req, res) => {
  res.json(workerManager.getStats());
});

// Event broadcasting endpoint
app.post('/api/events/broadcast', express.json(), (req, res) => {
  const { event, data } = req.body;
  
  try {
    eventBus.broadcast(event, data);
    res.json({ success: true, message: 'Event broadcasted' });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log(`🔌 Client connected: ${socket.id}`);

  // Handle service authentication
  socket.on('authenticate', (data) => {
    try {
      const { service, token } = data;
      
      // Verify service token (simplified for demo)
      if (token === process.env.SERVICE_TOKEN) {
        socket.service = service;
        socket.authenticated = true;
        socket.join(`service:${service}`);
        
        console.log(`✅ Service authenticated: ${service} (${socket.id})`);
        socket.emit('authenticated', { success: true, service });
        
        // Notify other services
        eventBus.broadcast('service_connected', { service, socketId: socket.id }, socket);
      } else {
        socket.emit('authenticated', { success: false, error: 'Invalid token' });
      }
    } catch (error) {
      console.error('❌ Authentication error:', error);
      socket.emit('authenticated', { success: false, error: 'Authentication failed' });
    }
  });

  // Handle service requests
  socket.on('service_request', async (data, callback) => {
    try {
      const { target, endpoint, payload } = data;
      console.log(`📨 Service request: ${socket.service} -> ${target}${endpoint}`);
      
      const result = await eventBus.request(target, endpoint, payload);
      callback({ success: true, data: result });
    } catch (error) {
      console.error('❌ Service request error:', error);
      callback({ success: false, error: error.message });
    }
  });

  // Handle Discord bot events
  socket.on('discord_event', (data) => {
    console.log(`🤖 Discord event received:`, data.type);
    eventBus.broadcast('discord_event', data, socket);
  });

  // Handle user actions from Discord
  socket.on('user_action', async (data) => {
    try {
      console.log(`👤 User action:`, data.action, data.userId);
      
      // Process the action based on type
      switch (data.action) {
        case 'daily_reward':
          const result = await eventBus.request('api', '/api/economy/daily', {
            discordId: data.userId
          });
          socket.emit('user_action_result', { success: true, data: result });
          break;
          
        case 'user_lookup':
          const user = await eventBus.request('api', `/api/users/${data.userId}`);
          socket.emit('user_action_result', { success: true, data: user });
          break;
          
        default:
          socket.emit('user_action_result', { 
            success: false, 
            error: `Unknown action: ${data.action}` 
          });
      }
    } catch (error) {
      console.error('❌ User action error:', error);
      socket.emit('user_action_result', { success: false, error: error.message });
    }
  });

  // Handle real-time data subscriptions
  socket.on('subscribe', (data) => {
    const { channels } = data;
    channels.forEach(channel => {
      socket.join(channel);
      console.log(`📺 Socket ${socket.id} subscribed to: ${channel}`);
    });
  });

  socket.on('unsubscribe', (data) => {
    const { channels } = data;
    channels.forEach(channel => {
      socket.leave(channel);
      console.log(`📺 Socket ${socket.id} unsubscribed from: ${channel}`);
    });
  });

  // Handle disconnect
  socket.on('disconnect', (reason) => {
    console.log(`🔌 Client disconnected: ${socket.id} (${reason})`);
    if (socket.service) {
      eventBus.broadcast('service_disconnected', { 
        service: socket.service, 
        socketId: socket.id,
        reason 
      }, socket);
    }
  });
});

// Export eventBus for use in other modules
export { eventBus, io };

// Start server
const PORT = process.env.BACKEND_PORT || 3003;

server.listen(PORT, () => {
  console.log(`🚀 MaryBot Backend Service running on port ${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 WebSocket server ready`);
  console.log(`💡 Health check: http://localhost:${PORT}/health`);
});