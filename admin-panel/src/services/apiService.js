import axios from 'axios';

class ApiService {
  constructor() {
    this.baseURL = process.env.NEXT_PUBLIC_API_SERVICE_URL || 'http://localhost:3001';
    this.token = process.env.NEXT_PUBLIC_API_SERVICE_TOKEN || 'admin-panel-token';
    
    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.token}`
      }
    });

    // Response interceptor for error handling
    this.client.interceptors.response.use(
      response => response.data,
      error => {
        console.error('API Error:', error);
        throw new Error(error.response?.data?.message || 'Erro na comunicação com a API');
      }
    );
  }

  // Dashboard
  async getDashboardStats() {
    try {
      const [stats, userGrowth, commandUsage, economy, recentActivity] = await Promise.all([
        this.client.get('/users/stats'),
        this.client.get('/users/growth'),
        this.client.get('/analytics/commands'),
        this.client.get('/economy/overview'),
        this.client.get('/users/recent-activity')
      ]);

      return {
        stats: stats.data || {},
        userGrowth: userGrowth.data || [],
        commandUsage: commandUsage.data || [],
        economy: economy.data || {},
        recentActivity: recentActivity.data || []
      };
    } catch (error) {
      // Return mock data if API is unavailable
      return this.getMockDashboardData();
    }
  }

  getMockDashboardData() {
    return {
      stats: {
        totalUsers: 1250,
        activeUsers: 890,
        totalCommands: 15420,
        totalCoins: 2500000,
        averageLevel: 12.5,
        newUsersToday: 25
      },
      userGrowth: [
        { date: '2024-01-01', users: 1000 },
        { date: '2024-01-02', users: 1050 },
        { date: '2024-01-03', users: 1120 },
        { date: '2024-01-04', users: 1200 },
        { date: '2024-01-05', users: 1250 }
      ],
      commandUsage: [
        { command: 'daily', count: 3500 },
        { command: 'profile', count: 2800 },
        { command: 'gacha', count: 2200 },
        { command: 'quiz', count: 1900 },
        { command: 'leaderboard', count: 1500 }
      ],
      economy: {
        totalCoins: 2500000,
        dailyTransactions: 450,
        averageCoinsPerUser: 2000,
        topSpenders: [
          { username: 'User1', spent: 50000 },
          { username: 'User2', spent: 45000 },
          { username: 'User3', spent: 40000 }
        ]
      },
      recentActivity: [
        { id: 1, user: 'User1', action: 'Comando /daily executado', timestamp: '2024-01-05T10:30:00Z' },
        { id: 2, user: 'User2', action: 'Level up para 25', timestamp: '2024-01-05T10:25:00Z' },
        { id: 3, user: 'User3', action: 'Gacha pull realizado', timestamp: '2024-01-05T10:20:00Z' }
      ]
    };
  }

  // Users
  async getUsers(filters = {}) {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== '' && value !== null && value !== undefined) {
        params.append(key, value);
      }
    });

    return this.client.get(`/users?${params.toString()}`);
  }

  async getUserById(id) {
    return this.client.get(`/users/${id}`);
  }

  async createUser(userData) {
    return this.client.post('/users', userData);
  }

  async updateUser(id, userData) {
    return this.client.put(`/users/${id}`, userData);
  }

  async deleteUser(id) {
    return this.client.delete(`/users/${id}`);
  }

  // Economy
  async getEconomyStats() {
    return this.client.get('/economy/stats');
  }

  async processDailyReward(discordId) {
    return this.client.post('/economy/daily', { discordId });
  }

  async addCoins(discordId, amount, reason) {
    return this.client.post('/economy/add-coins', { discordId, amount, reason });
  }

  async removeCoins(discordId, amount, reason) {
    return this.client.post('/economy/remove-coins', { discordId, amount, reason });
  }

  async addXp(discordId, amount) {
    return this.client.post('/economy/add-xp', { discordId, amount });
  }

  // Characters
  async getCharacters(filters = {}) {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== '' && value !== null && value !== undefined) {
        params.append(key, value);
      }
    });

    return this.client.get(`/characters?${params.toString()}`);
  }

  async createCharacter(characterData) {
    return this.client.post('/characters', characterData);
  }

  async updateCharacter(id, characterData) {
    return this.client.put(`/characters/${id}`, characterData);
  }

  async deleteCharacter(id) {
    return this.client.delete(`/characters/${id}`);
  }

  // Quiz
  async getQuizQuestions(filters = {}) {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== '' && value !== null && value !== undefined) {
        params.append(key, value);
      }
    });

    return this.client.get(`/quiz/questions?${params.toString()}`);
  }

  async createQuizQuestion(questionData) {
    return this.client.post('/quiz/questions', questionData);
  }

  async updateQuizQuestion(id, questionData) {
    return this.client.put(`/quiz/questions/${id}`, questionData);
  }

  async deleteQuizQuestion(id) {
    return this.client.delete(`/quiz/questions/${id}`);
  }

  // System Settings
  async getSystemSettings() {
    try {
      return await this.client.get('/system/settings');
    } catch (error) {
      // Return default settings if API is unavailable
      return {
        general: {
          botName: 'MaryBot',
          prefix: '/',
          language: 'pt-BR',
          timezone: 'America/Sao_Paulo'
        },
        notifications: {
          enableLevelUpNotifications: true,
          enableDailyReminders: true,
          enableEventAnnouncements: true,
          notificationChannel: 'general'
        },
        security: {
          enableRateLimit: true,
          maxCommandsPerMinute: 10,
          enableAutoMod: false,
          logLevel: 'info'
        },
        database: {
          autoBackup: true,
          backupInterval: 24,
          retentionDays: 30
        },
        analytics: {
          enableAnalytics: true,
          dataRetentionDays: 90,
          enableUserTracking: true,
          enableCommandTracking: true
        }
      };
    }
  }

  async updateSystemSettings(settings) {
    return this.client.put('/system/settings', settings);
  }

  // System Actions
  async restartBotService() {
    return this.client.post('/system/restart-bot');
  }

  async clearSystemCache() {
    return this.client.post('/system/clear-cache');
  }

  async createDatabaseBackup() {
    return this.client.post('/system/backup-database');
  }

  // Analytics
  async getAnalytics(period = '7d') {
    return this.client.get(`/analytics?period=${period}`);
  }

  async getCommandAnalytics(period = '7d') {
    return this.client.get(`/analytics/commands?period=${period}`);
  }

  async getUserAnalytics(period = '7d') {
    return this.client.get(`/analytics/users?period=${period}`);
  }
}

export const apiService = new ApiService();