import { eventBus } from '../index.js';
import axios from 'axios';

/**
 * Discord Service - Handles Discord-specific events and commands
 */
export class DiscordService {
  constructor() {
    this.setupEventListeners();
  }

  setupEventListeners() {
    // Listen for Discord events
    eventBus.on('discord_event', this.handleDiscordEvent.bind(this));
    eventBus.on('user_interaction', this.handleUserInteraction.bind(this));
  }

  async handleDiscordEvent(data) {
    const { type, payload } = data;
    
    switch (type) {
      case 'message_create':
        await this.handleMessage(payload);
        break;
      case 'interaction_create':
        await this.handleInteraction(payload);
        break;
      case 'guild_member_add':
        await this.handleMemberJoin(payload);
        break;
      default:
        console.log(`🤖 Unhandled Discord event: ${type}`);
    }
  }

  async handleMessage(message) {
    // Handle XP gain from messages
    if (!message.author.bot && Math.random() < 0.1) {
      try {
        await eventBus.request('api', '/api/economy/xp', {
          discordId: message.author.id,
          amount: Math.floor(Math.random() * 5) + 1,
          reason: 'Message activity'
        });
        
        eventBus.broadcast('xp_gained', {
          userId: message.author.id,
          amount: 1,
          source: 'message'
        });
      } catch (error) {
        console.error('❌ Failed to process message XP:', error);
      }
    }
  }

  async handleInteraction(interaction) {
    try {
      const { commandName, user } = interaction;
      
      // Log command usage
      eventBus.broadcast('command_used', {
        command: commandName,
        userId: user.id,
        timestamp: new Date()
      });

      // Handle specific commands that need backend processing
      switch (commandName) {
        case 'daily':
          return await this.processDailyReward(user.id);
        case 'profile':
          return await this.getUserProfile(user.id, interaction.options?.get('usuario')?.value);
        case 'leaderboard':
          return await this.getLeaderboard(interaction.options?.get('tipo')?.value || 'xp');
        default:
          return null; // Let Discord bot handle it directly
      }
    } catch (error) {
      console.error('❌ Interaction handling error:', error);
      throw error;
    }
  }

  async handleMemberJoin(member) {
    try {
      // Create user in database when they join
      await eventBus.request('api', '/api/users', {
        discordId: member.user.id,
        username: member.user.username
      });
      
      eventBus.broadcast('member_joined', {
        userId: member.user.id,
        username: member.user.username,
        guildId: member.guild.id
      });
    } catch (error) {
      console.error('❌ Failed to handle member join:', error);
    }
  }

  async processDailyReward(userId) {
    try {
      const result = await eventBus.request('api', '/api/economy/daily', {
        discordId: userId
      });

      eventBus.broadcast('daily_claimed', {
        userId,
        rewards: result.data
      });

      return result;
    } catch (error) {
      console.error('❌ Daily reward processing error:', error);
      throw error;
    }
  }

  async getUserProfile(userId, targetUserId = null) {
    try {
      const result = await eventBus.request('api', `/api/users/${targetUserId || userId}`);
      return result;
    } catch (error) {
      console.error('❌ Profile lookup error:', error);
      throw error;
    }
  }

  async getLeaderboard(type = 'xp') {
    try {
      const result = await eventBus.request('api', `/api/users/leaderboard?type=${type}`);
      return result;
    } catch (error) {
      console.error('❌ Leaderboard lookup error:', error);
      throw error;
    }
  }

  // Send notification to Discord bot
  notifyDiscord(event, data) {
    eventBus.broadcast('discord_notification', {
      event,
      data,
      timestamp: new Date()
    });
  }
}

// Initialize the service
export const discordService = new DiscordService();