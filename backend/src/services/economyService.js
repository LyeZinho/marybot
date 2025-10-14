import { eventBus } from '../index.js';
import cron from 'node-cron';

/**
 * Economy Service - Handles all economy-related events and scheduled tasks
 */
export class EconomyService {
  constructor() {
    this.setupEventListeners();
    this.setupScheduledTasks();
  }

  setupEventListeners() {
    eventBus.on('xp_gained', this.handleXpGain.bind(this));
    eventBus.on('coins_earned', this.handleCoinsEarned.bind(this));
    eventBus.on('daily_claimed', this.handleDailyClaimed.bind(this));
    eventBus.on('level_up', this.handleLevelUp.bind(this));
  }

  setupScheduledTasks() {
    // Reset daily rewards at midnight
    cron.schedule('0 0 * * *', async () => {
      console.log('🔄 Resetting daily rewards...');
      await this.resetDailyRewards();
    }, {
      timezone: "America/Sao_Paulo"
    });

    // Weekly leaderboard reset
    cron.schedule('0 0 * * 0', async () => {
      console.log('🏆 Weekly leaderboard reset...');
      await this.weeklyLeaderboardReset();
    });

    // Economy statistics update
    cron.schedule('*/30 * * * *', async () => {
      await this.updateEconomyStats();
    });
  }

  async handleXpGain(data) {
    const { userId, amount, source } = data;
    
    try {
      // Check for level up
      const result = await eventBus.request('api', `/api/users/${userId}`);
      const user = result.data;
      
      const currentLevel = this.calculateLevel(user.xp);
      const newLevel = this.calculateLevel(user.xp + amount);
      
      if (newLevel > currentLevel) {
        // Level up rewards
        const coinsReward = newLevel * 100;
        
        await eventBus.request('api', '/api/economy/coins', {
          discordId: userId,
          amount: coinsReward,
          reason: `Level ${newLevel} reward`
        });

        eventBus.broadcast('level_up', {
          userId,
          oldLevel: currentLevel,
          newLevel,
          coinsReward,
          source
        });
      }
    } catch (error) {
      console.error('❌ XP gain processing error:', error);
    }
  }

  async handleCoinsEarned(data) {
    const { userId, amount, reason } = data;
    
    // Log coin transaction
    eventBus.broadcast('transaction_logged', {
      userId,
      type: 'earn',
      amount,
      reason,
      timestamp: new Date()
    });
  }

  async handleDailyClaimed(data) {
    const { userId, rewards } = data;
    
    console.log(`💰 Daily reward claimed by ${userId}:`, rewards);
    
    // Update streak statistics
    try {
      await eventBus.request('api', '/api/economy/streak', {
        discordId: userId,
        action: 'claim'
      });
    } catch (error) {
      console.error('❌ Streak update error:', error);
    }
  }

  async handleLevelUp(data) {
    const { userId, newLevel, coinsReward } = data;
    
    // Notify Discord service to send congratulations
    eventBus.broadcast('discord_notification', {
      event: 'level_up',
      data: {
        userId,
        level: newLevel,
        coinsReward
      }
    });

    // Special rewards for milestone levels
    if (newLevel % 10 === 0) {
      const bonusReward = newLevel * 50;
      
      await eventBus.request('api', '/api/economy/coins', {
        discordId: userId,
        amount: bonusReward,
        reason: `Level ${newLevel} milestone bonus`
      });

      eventBus.broadcast('milestone_reached', {
        userId,
        level: newLevel,
        bonusReward
      });
    }
  }

  calculateLevel(xp) {
    return Math.floor(Math.sqrt(xp / 100)) + 1;
  }

  async resetDailyRewards() {
    try {
      const result = await eventBus.request('api', '/api/economy/reset-daily');
      console.log(`✅ Daily rewards reset for ${result.data.count} users`);
      
      eventBus.broadcast('daily_reset_complete', {
        affectedUsers: result.data.count,
        timestamp: new Date()
      });
    } catch (error) {
      console.error('❌ Daily reset error:', error);
    }
  }

  async weeklyLeaderboardReset() {
    try {
      // Archive current leaderboard
      const leaderboard = await eventBus.request('api', '/api/users/leaderboard?type=xp&limit=10');
      
      eventBus.broadcast('leaderboard_archived', {
        week: new Date().toISOString().split('T')[0],
        topUsers: leaderboard.data
      });

      console.log('📊 Weekly leaderboard archived');
    } catch (error) {
      console.error('❌ Weekly reset error:', error);
    }
  }

  async updateEconomyStats() {
    try {
      const stats = await eventBus.request('api', '/api/economy/stats');
      
      eventBus.broadcast('economy_stats_updated', {
        totalUsers: stats.data.totalUsers,
        totalCoins: stats.data.totalCoins,
        averageLevel: stats.data.averageLevel,
        timestamp: new Date()
      });
    } catch (error) {
      console.error('❌ Stats update error:', error);
    }
  }

  // Economy event triggers
  async triggerEconomyEvent(eventType, data) {
    switch (eventType) {
      case 'bonus_weekend':
        await this.activateBonusWeekend();
        break;
      case 'inflation_event':
        await this.handleInflation(data.rate);
        break;
      case 'discount_event':
        await this.activateDiscount(data.percentage);
        break;
      default:
        console.log(`🎯 Unknown economy event: ${eventType}`);
    }
  }

  async activateBonusWeekend() {
    eventBus.broadcast('bonus_weekend_active', {
      multiplier: 2,
      duration: '48h',
      startTime: new Date()
    });
  }

  async handleInflation(rate) {
    eventBus.broadcast('inflation_active', {
      rate,
      affectedItems: ['gacha_pulls', 'shop_items'],
      duration: '24h'
    });
  }

  async activateDiscount(percentage) {
    eventBus.broadcast('discount_active', {
      percentage,
      affectedItems: ['shop_items'],
      duration: '12h'
    });
  }
}

// Initialize the service
export const economyService = new EconomyService();