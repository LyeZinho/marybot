import { io } from 'socket.io-client';
import { EventEmitter } from 'events';

/**
 * WebSocket Client para comunicação com o Backend Service
 */
export class WebSocketClient extends EventEmitter {
  constructor() {
    super();
    this.socket = null;
    this.connected = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectInterval = 5000;
    this.authenticated = false;
    
    this.setupEventHandlers();
  }

  /**
   * Conecta ao Backend Service
   */
  async connect() {
    const backendUrl = process.env.BACKEND_SERVICE_URL || 'http://localhost:3002';
    
    try {
      this.socket = io(backendUrl, {
        transports: ['websocket', 'polling'],
        timeout: 10000,
        reconnection: true,
        reconnectionDelay: this.reconnectInterval,
        reconnectionAttempts: this.maxReconnectAttempts
      });

      this.setupSocketHandlers();
      
      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Connection timeout'));
        }, 10000);

        this.socket.on('connect', () => {
          clearTimeout(timeout);
          this.connected = true;
          this.reconnectAttempts = 0;
          console.log('🔌 Connected to Backend Service');
          this.authenticate();
          resolve();
        });

        this.socket.on('connect_error', (error) => {
          clearTimeout(timeout);
          reject(error);
        });
      });
    } catch (error) {
      console.error('❌ Failed to connect to Backend Service:', error);
      throw error;
    }
  }

  /**
   * Autentica o bot service no backend
   */
  authenticate() {
    const token = process.env.SERVICE_TOKEN || 'bot-service-token';
    
    this.socket.emit('authenticate', {
      service: 'discord-bot',
      token: token,
      version: '1.0.0'
    });
  }

  /**
   * Configura os handlers dos eventos do socket
   */
  setupSocketHandlers() {
    this.socket.on('connect', () => {
      this.connected = true;
      console.log('✅ WebSocket connected');
      this.emit('connected');
    });

    this.socket.on('disconnect', (reason) => {
      this.connected = false;
      this.authenticated = false;
      console.log(`🔌 WebSocket disconnected: ${reason}`);
      this.emit('disconnected', reason);
    });

    this.socket.on('authenticated', (data) => {
      this.authenticated = true;
      console.log('🔑 Successfully authenticated with Backend Service');
      this.emit('authenticated', data);
    });

    this.socket.on('auth_error', (error) => {
      console.error('❌ Authentication failed:', error);
      this.emit('auth_error', error);
    });

    // Backend notifications
    this.socket.on('discord_notification', (data) => {
      this.emit('notification', data);
    });

    this.socket.on('level_up', (data) => {
      this.emit('level_up', data);
    });

    this.socket.on('quiz_next_question', (data) => {
      this.emit('quiz_next_question', data);
    });

    this.socket.on('quiz_completed', (data) => {
      this.emit('quiz_completed', data);
    });

    this.socket.on('quiz_expired', (data) => {
      this.emit('quiz_expired', data);
    });

    this.socket.on('battle_completed', (data) => {
      this.emit('battle_completed', data);
    });

    this.socket.on('character_spotlight', (data) => {
      this.emit('character_spotlight', data);
    });

    this.socket.on('rate_up_event', (data) => {
      this.emit('rate_up_event', data);
    });

    this.socket.on('economy_event', (data) => {
      this.emit('economy_event', data);
    });

    // Error handling
    this.socket.on('error', (error) => {
      console.error('❌ WebSocket error:', error);
      this.emit('error', error);
    });

    this.socket.on('reconnect', (attemptNumber) => {
      console.log(`🔄 Reconnected after ${attemptNumber} attempts`);
      this.authenticate();
    });

    this.socket.on('reconnect_failed', () => {
      console.error('💀 Failed to reconnect to Backend Service');
      this.emit('reconnect_failed');
    });
  }

  /**
   * Configura handlers de eventos personalizados
   */
  setupEventHandlers() {
    this.on('notification', this.handleNotification.bind(this));
    this.on('level_up', this.handleLevelUp.bind(this));
  }

  /**
   * Envia evento para o backend
   */
  emit(event, data) {
    if (this.socket && this.connected) {
      this.socket.emit(event, data);
    } else {
      console.warn(`⚠️ Cannot emit ${event}: not connected`);
      // Emit locally for event handling
      super.emit(event, data);
    }
  }

  /**
   * Faz requisição HTTP via backend
   */
  async request(method, endpoint, data = null) {
    if (!this.connected || !this.authenticated) {
      throw new Error('Not connected or authenticated');
    }

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Request timeout'));
      }, 15000);

      const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Listen for response
      const responseHandler = (response) => {
        if (response.requestId === requestId) {
          clearTimeout(timeout);
          this.socket.off('api_response', responseHandler);
          
          if (response.success) {
            resolve(response.data);
          } else {
            reject(new Error(response.error || 'Request failed'));
          }
        }
      };

      this.socket.on('api_response', responseHandler);

      // Send request
      this.socket.emit('api_request', {
        requestId,
        method,
        endpoint,
        data
      });
    });
  }

  /**
   * Métodos específicos para operações comuns
   */
  
  // User operations
  async getUser(discordId) {
    return await this.request('GET', `/api/users/${discordId}`);
  }

  async createUser(userData) {
    return await this.request('POST', '/api/users', userData);
  }

  async updateUser(discordId, userData) {
    return await this.request('PUT', `/api/users/${discordId}`, userData);
  }

  // Economy operations
  async processDailyReward(discordId) {
    return await this.request('POST', '/api/economy/daily', { discordId });
  }

  async addCoins(discordId, amount, reason) {
    return await this.request('POST', '/api/economy/coins', { discordId, amount, reason });
  }

  async addXP(discordId, amount, reason) {
    return await this.request('POST', '/api/economy/xp', { discordId, amount, reason });
  }

  async getLeaderboard(type = 'xp', limit = 10) {
    return await this.request('GET', `/api/users/leaderboard?type=${type}&limit=${limit}`);
  }

  // Character operations
  async getCharacters(filters = {}) {
    const params = new URLSearchParams(filters);
    return await this.request('GET', `/api/characters?${params}`);
  }

  async getUserCharacters(discordId) {
    return await this.request('GET', `/api/characters/user/${discordId}`);
  }

  async addCharacterToUser(discordId, characterId, rarity) {
    return await this.request('POST', '/api/characters/collect', { discordId, characterId, rarity });
  }

  // Quiz operations
  async getQuizQuestions(difficulty, count = 5) {
    return await this.request('GET', `/api/quiz/questions?difficulty=${difficulty}&count=${count}`);
  }

  async submitQuizResult(userId, score, answers) {
    return await this.request('POST', '/api/quiz/result', { userId, score, answers });
  }

  // Game events
  async triggerDiscordEvent(eventType, payload) {
    this.emit('discord_event', { type: eventType, payload });
  }

  async startQuiz(userId, questions) {
    const quizId = `quiz_${Date.now()}_${userId}`;
    this.emit('quiz_started', { 
      quizId, 
      userId, 
      questions,
      timeLimit: 30000 // 30 seconds per question
    });
    return quizId;
  }

  async answerQuiz(quizId, answer, timeToAnswer) {
    this.emit('quiz_answered', { quizId, answer, timeToAnswer });
  }

  async initiateBattle(battleData) {
    this.emit('battle_initiated', battleData);
  }

  async pullCharacter(userId, character, rarity, cost) {
    this.emit('character_pulled', { userId, character, rarity, cost });
  }

  // Notification handlers
  handleNotification(data) {
    console.log('📢 Backend notification:', data);
    // This will be handled by the Discord bot to send messages
    super.emit('backend_notification', data);
  }

  handleLevelUp(data) {
    console.log('🎉 Level up event:', data);
    super.emit('user_level_up', data);
  }

  /**
   * Verifica se está conectado e autenticado
   */
  isReady() {
    return this.connected && this.authenticated;
  }

  /**
   * Desconecta do backend
   */
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.connected = false;
      this.authenticated = false;
    }
  }

  /**
   * Reconecta ao backend
   */
  async reconnect() {
    this.disconnect();
    await this.connect();
  }

  /**
   * Fallback para operações offline (modo degradado)
   */
  async fallbackOperation(operation, ...args) {
    console.warn(`⚠️ Fallback mode: ${operation} - Backend not available`);
    
    // Implementar fallbacks básicos aqui se necessário
    switch (operation) {
      case 'getUser':
        return { 
          id: args[0], 
          discordId: args[0], 
          username: 'Unknown', 
          xp: 0, 
          coins: 0,
          offline: true 
        };
      case 'addXP':
        console.log(`Would add ${args[1]} XP to ${args[0]}`);
        return { success: true, offline: true };
      default:
        throw new Error(`Operation ${operation} not available in fallback mode`);
    }
  }
}

// Singleton instance
export const wsClient = new WebSocketClient();