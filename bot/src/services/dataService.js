import { wsClient } from './websocketClient.js';
import { botConfig } from '../config.js';

/**
 * Data Service - Abstrai operações de dados usando WebSocket ou fallback
 */
export class DataService {
  constructor() {
    this.useWebSocket = botConfig.features.useWebSocket;
    this.enableFallback = botConfig.features.enableFallback;
  }

  /**
   * Executa operação com fallback automático
   */
  async executeWithFallback(operation, ...args) {
    if (this.useWebSocket && wsClient.isReady()) {
      try {
        return await this[`ws_${operation}`](...args);
      } catch (error) {
        console.warn(`⚠️ WebSocket operation failed: ${operation}`, error.message);
        
        if (this.enableFallback) {
          console.log(`🔄 Falling back for operation: ${operation}`);
          return await this[`fallback_${operation}`](...args);
        } else {
          throw error;
        }
      }
    } else {
      if (this.enableFallback) {
        return await this[`fallback_${operation}`](...args);
      } else {
        throw new Error('WebSocket not available and fallback disabled');
      }
    }
  }

  // USER OPERATIONS

  /**
   * Get or create user
   */
  async getOrCreateUser(discordId, username) {
    return await this.executeWithFallback('getOrCreateUser', discordId, username);
  }

  async ws_getOrCreateUser(discordId, username) {
    try {
      return await wsClient.getUser(discordId);
    } catch (error) {
      if (error.message.includes('not found')) {
        return await wsClient.createUser({ discordId, username });
      }
      throw error;
    }
  }

  async fallback_getOrCreateUser(discordId, username) {
    const { prisma } = await import('../database/client.js');
    
    let user = await prisma.user.findUnique({
      where: { discordId }
    });

    if (!user) {
      user = await prisma.user.create({
        data: { discordId, username }
      });
    }

    return user;
  }

  /**
   * Get user profile
   */
  async getUserProfile(discordId) {
    return await this.executeWithFallback('getUserProfile', discordId);
  }

  async ws_getUserProfile(discordId) {
    return await wsClient.getUser(discordId);
  }

  async fallback_getUserProfile(discordId) {
    const { prisma } = await import('../database/client.js');
    
    return await prisma.user.findUnique({
      where: { discordId },
      include: {
        userCharacters: {
          include: {
            character: true
          }
        }
      }
    });
  }

  /**
   * Get leaderboard
   */
  async getLeaderboard(type = 'xp', limit = 10) {
    return await this.executeWithFallback('getLeaderboard', type, limit);
  }

  async ws_getLeaderboard(type, limit) {
    return await wsClient.getLeaderboard(type, limit);
  }

  async fallback_getLeaderboard(type, limit) {
    const { prisma } = await import('../database/client.js');
    
    const orderBy = {};
    orderBy[type] = 'desc';

    return await prisma.user.findMany({
      orderBy,
      take: limit,
      select: {
        discordId: true,
        username: true,
        xp: true,
        coins: true,
        level: true
      }
    });
  }

  // ECONOMY OPERATIONS

  /**
   * Process daily reward
   */
  async processDailyReward(discordId) {
    return await this.executeWithFallback('processDailyReward', discordId);
  }

  async ws_processDailyReward(discordId) {
    return await wsClient.processDailyReward(discordId);
  }

  async fallback_processDailyReward(discordId) {
    const { prisma } = await import('../database/client.js');
    
    const user = await this.getOrCreateUser(discordId, 'Unknown');
    
    // Check if already claimed today
    const now = new Date();
    const lastDaily = user.lastDaily;
    
    if (lastDaily) {
      const lastDailyDate = new Date(lastDaily);
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const lastDate = new Date(lastDailyDate.getFullYear(), lastDailyDate.getMonth(), lastDailyDate.getDate());
      
      if (today.getTime() === lastDate.getTime()) {
        throw new Error('Daily reward already claimed today');
      }
    }

    // Calculate rewards
    const level = Math.floor(user.xp / 100) + 1;
    const baseCoins = 50;
    const bonusCoins = Math.floor(level * 10);
    const totalCoins = baseCoins + bonusCoins;
    const xpReward = 25;

    // Update user
    const updatedUser = await prisma.user.update({
      where: { discordId },
      data: {
        coins: { increment: totalCoins },
        xp: { increment: xpReward },
        lastDaily: now,
        dailyStreak: user.lastDaily && 
          (now.getTime() - new Date(user.lastDaily).getTime()) <= 48 * 60 * 60 * 1000
          ? { increment: 1 }
          : 1
      }
    });

    return {
      coins: totalCoins,
      xp: xpReward,
      streak: updatedUser.dailyStreak,
      user: updatedUser
    };
  }

  /**
   * Add coins to user
   */
  async addCoins(discordId, amount, reason) {
    return await this.executeWithFallback('addCoins', discordId, amount, reason);
  }

  async ws_addCoins(discordId, amount, reason) {
    return await wsClient.addCoins(discordId, amount, reason);
  }

  async fallback_addCoins(discordId, amount, reason) {
    const { prisma } = await import('../database/client.js');
    
    return await prisma.user.update({
      where: { discordId },
      data: {
        coins: { increment: amount }
      }
    });
  }

  /**
   * Add XP to user
   */
  async addXP(discordId, amount, reason) {
    return await this.executeWithFallback('addXP', discordId, amount, reason);
  }

  async ws_addXP(discordId, amount, reason) {
    return await wsClient.addXP(discordId, amount, reason);
  }

  async fallback_addXP(discordId, amount, reason) {
    const { prisma } = await import('../database/client.js');
    
    const user = await prisma.user.update({
      where: { discordId },
      data: {
        xp: { increment: amount }
      }
    });

    // Check for level up
    const newLevel = Math.floor(user.xp / 100) + 1;
    const oldLevel = Math.floor((user.xp - amount) / 100) + 1;

    if (newLevel > oldLevel) {
      // Level up bonus
      const bonusCoins = newLevel * 100;
      await this.addCoins(discordId, bonusCoins, `Level ${newLevel} bonus`);
      
      return { ...user, levelUp: true, newLevel, bonusCoins };
    }

    return user;
  }

  // CHARACTER OPERATIONS

  /**
   * Get all characters
   */
  async getCharacters(filters = {}) {
    return await this.executeWithFallback('getCharacters', filters);
  }

  async ws_getCharacters(filters) {
    return await wsClient.getCharacters(filters);
  }

  async fallback_getCharacters(filters) {
    const { prisma } = await import('../database/client.js');
    
    const where = {};
    if (filters.rarity) where.rarity = parseInt(filters.rarity);
    if (filters.anime) where.anime = { contains: filters.anime, mode: 'insensitive' };

    return await prisma.character.findMany({
      where,
      orderBy: { name: 'asc' }
    });
  }

  /**
   * Get user characters
   */
  async getUserCharacters(discordId) {
    return await this.executeWithFallback('getUserCharacters', discordId);
  }

  async ws_getUserCharacters(discordId) {
    return await wsClient.getUserCharacters(discordId);
  }

  async fallback_getUserCharacters(discordId) {
    const { prisma } = await import('../database/client.js');
    
    return await prisma.userCharacter.findMany({
      where: { 
        user: { discordId }
      },
      include: {
        character: true
      },
      orderBy: {
        character: { rarity: 'desc' }
      }
    });
  }

  /**
   * Add character to user collection
   */
  async addCharacterToUser(discordId, characterId, rarity) {
    return await this.executeWithFallback('addCharacterToUser', discordId, characterId, rarity);
  }

  async ws_addCharacterToUser(discordId, characterId, rarity) {
    return await wsClient.addCharacterToUser(discordId, characterId, rarity);
  }

  async fallback_addCharacterToUser(discordId, characterId, rarity) {
    const { prisma } = await import('../database/client.js');
    
    const user = await this.getOrCreateUser(discordId, 'Unknown');
    
    return await prisma.userCharacter.create({
      data: {
        userId: user.id,
        characterId,
        obtainedAt: new Date()
      },
      include: {
        character: true
      }
    });
  }

  // QUIZ OPERATIONS

  /**
   * Get quiz questions
   */
  async getQuizQuestions(difficulty, count = 5) {
    return await this.executeWithFallback('getQuizQuestions', difficulty, count);
  }

  async ws_getQuizQuestions(difficulty, count) {
    return await wsClient.getQuizQuestions(difficulty, count);
  }

  async fallback_getQuizQuestions(difficulty, count) {
    const { prisma } = await import('../database/client.js');
    
    return await prisma.animeQuestion.findMany({
      where: { difficulty },
      take: count,
      orderBy: { id: 'asc' } // or use random ordering
    });
  }

  /**
   * Submit quiz result
   */
  async submitQuizResult(userId, score, answers) {
    return await this.executeWithFallback('submitQuizResult', userId, score, answers);
  }

  async ws_submitQuizResult(userId, score, answers) {
    return await wsClient.submitQuizResult(userId, score, answers);
  }

  async fallback_submitQuizResult(userId, score, answers) {
    const { prisma } = await import('../database/client.js');
    
    return await prisma.quizScore.create({
      data: {
        userId,
        score,
        questionsAnswered: answers.length,
        correctAnswers: answers.filter(a => a.correct).length
      }
    });
  }

  // UTILITY METHODS

  /**
   * Get random quotes
   */
  async getRandomQuote() {
    return await this.executeWithFallback('getRandomQuote');
  }

  async ws_getRandomQuote() {
    // WebSocket doesn't have a direct quote endpoint, use fallback
    return await this.fallback_getRandomQuote();
  }

  async fallback_getRandomQuote() {
    const { prisma } = await import('../database/client.js');
    
    const quotes = await prisma.animeQuote.findMany();
    if (quotes.length === 0) return null;
    
    return quotes[Math.floor(Math.random() * quotes.length)];
  }

  /**
   * Trigger Discord events via WebSocket
   */
  async triggerDiscordEvent(eventType, payload) {
    if (wsClient.isReady()) {
      await wsClient.triggerDiscordEvent(eventType, payload);
    }
  }

  /**
   * Start quiz via WebSocket
   */
  async startQuiz(userId, questions) {
    if (wsClient.isReady()) {
      return await wsClient.startQuiz(userId, questions);
    }
    return null;
  }

  /**
   * Answer quiz via WebSocket
   */
  async answerQuiz(quizId, answer, timeToAnswer) {
    if (wsClient.isReady()) {
      await wsClient.answerQuiz(quizId, answer, timeToAnswer);
    }
  }
}

// Singleton instance
export const dataService = new DataService();