import { parentPort, workerData } from 'worker_threads';
import axios from 'axios';

/**
 * Notification Worker - Handles batch notification processing
 */
class NotificationWorker {
  constructor(jobData) {
    this.jobData = jobData;
    this.apiBaseUrl = process.env.API_BASE_URL || 'http://localhost:3001';
    this.maxBatchSize = 100;
    this.retryAttempts = 3;
  }

  async process() {
    try {
      const { notificationType, recipients, data, options = {} } = this.jobData.job;
      
      let result;
      
      switch (notificationType) {
        case 'level_up':
          result = await this.sendLevelUpNotifications(recipients, data);
          break;
        case 'daily_reminder':
          result = await this.sendDailyReminders(recipients, data);
          break;
        case 'event_announcement':
          result = await this.sendEventAnnouncements(recipients, data);
          break;
        case 'achievement_unlock':
          result = await this.sendAchievementNotifications(recipients, data);
          break;
        case 'system_maintenance':
          result = await this.sendMaintenanceNotifications(recipients, data);
          break;
        case 'custom':
          result = await this.sendCustomNotifications(recipients, data, options);
          break;
        default:
          throw new Error(`Unknown notification type: ${notificationType}`);
      }

      return {
        success: true,
        notificationType,
        result,
        timestamp: new Date(),
        processingTime: Date.now() - this.startTime
      };

    } catch (error) {
      return {
        success: false,
        error: error.message,
        timestamp: new Date()
      };
    }
  }

  async sendLevelUpNotifications(recipients, data) {
    const notifications = recipients.map(recipient => ({
      userId: recipient.userId,
      type: 'level_up',
      title: '🎉 Level Up!',
      message: `Congratulations! You've reached level ${data.newLevel}!`,
      data: {
        oldLevel: data.oldLevel,
        newLevel: data.newLevel,
        coinsReward: data.coinsReward,
        timestamp: new Date()
      },
      priority: 'high'
    }));

    return await this.sendNotificationBatch(notifications);
  }

  async sendDailyReminders(recipients, data) {
    const { reminderType = 'daily_coins' } = data;
    
    let title, message;
    
    switch (reminderType) {
      case 'daily_coins':
        title = '💰 Daily Reward Available!';
        message = 'Don\'t forget to claim your daily coins and XP bonus!';
        break;
      case 'quiz_available':
        title = '🧠 New Quiz Available!';
        message = 'Test your anime knowledge and earn rewards!';
        break;
      case 'gacha_discount':
        title = '🎲 Special Gacha Discount!';
        message = 'Limited time: 50% off all gacha pulls!';
        break;
      default:
        title = '🔔 Reminder';
        message = data.customMessage || 'You have pending activities!';
    }

    const notifications = recipients.map(recipient => ({
      userId: recipient.userId,
      type: 'daily_reminder',
      title,
      message,
      data: {
        reminderType,
        timestamp: new Date(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
      },
      priority: 'medium'
    }));

    return await this.sendNotificationBatch(notifications);
  }

  async sendEventAnnouncements(recipients, data) {
    const { eventType, eventData } = data;
    
    const notifications = recipients.map(recipient => ({
      userId: recipient.userId,
      type: 'event_announcement',
      title: eventData.title || '🎉 New Event!',
      message: eventData.description,
      data: {
        eventType,
        eventId: eventData.id,
        startTime: eventData.startTime,
        endTime: eventData.endTime,
        rewards: eventData.rewards,
        timestamp: new Date()
      },
      priority: 'high',
      actionButtons: [
        { label: 'Participate', action: `event_join:${eventData.id}` },
        { label: 'Learn More', action: `event_info:${eventData.id}` }
      ]
    }));

    return await this.sendNotificationBatch(notifications);
  }

  async sendAchievementNotifications(recipients, data) {
    const { achievements } = data;
    
    const notifications = [];
    
    recipients.forEach(recipient => {
      const userAchievements = achievements.filter(a => a.userId === recipient.userId);
      
      userAchievements.forEach(achievement => {
        notifications.push({
          userId: recipient.userId,
          type: 'achievement_unlock',
          title: '🏆 Achievement Unlocked!',
          message: `You've earned: ${achievement.name}`,
          data: {
            achievementId: achievement.id,
            achievementName: achievement.name,
            description: achievement.description,
            rewards: achievement.rewards,
            rarity: achievement.rarity,
            timestamp: new Date()
          },
          priority: achievement.rarity === 'legendary' ? 'high' : 'medium'
        });
      });
    });

    return await this.sendNotificationBatch(notifications);
  }

  async sendMaintenanceNotifications(recipients, data) {
    const { maintenanceType, scheduledTime, duration, affectedFeatures } = data;
    
    let title, message;
    
    switch (maintenanceType) {
      case 'scheduled':
        title = '🔧 Scheduled Maintenance';
        message = `Maintenance scheduled for ${new Date(scheduledTime).toLocaleString()}. Duration: ${duration}`;
        break;
      case 'emergency':
        title = '⚠️ Emergency Maintenance';
        message = 'Emergency maintenance in progress. Some features may be unavailable.';
        break;
      case 'completed':
        title = '✅ Maintenance Complete';
        message = 'Maintenance has been completed. All features are now available.';
        break;
      default:
        title = '🔧 System Maintenance';
        message = data.customMessage || 'System maintenance notification';
    }

    const notifications = recipients.map(recipient => ({
      userId: recipient.userId,
      type: 'system_maintenance',
      title,
      message,
      data: {
        maintenanceType,
        scheduledTime,
        duration,
        affectedFeatures,
        timestamp: new Date()
      },
      priority: maintenanceType === 'emergency' ? 'high' : 'low'
    }));

    return await this.sendNotificationBatch(notifications);
  }

  async sendCustomNotifications(recipients, data, options) {
    const { title, message, customData = {}, actionButtons = [] } = data;
    const { priority = 'medium', expiresIn = 24 * 60 * 60 * 1000 } = options;
    
    const notifications = recipients.map(recipient => ({
      userId: recipient.userId,
      type: 'custom',
      title,
      message,
      data: {
        ...customData,
        timestamp: new Date(),
        expiresAt: new Date(Date.now() + expiresIn)
      },
      priority,
      actionButtons
    }));

    return await this.sendNotificationBatch(notifications);
  }

  async sendNotificationBatch(notifications) {
    const results = {
      total: notifications.length,
      sent: 0,
      failed: 0,
      errors: []
    };

    // Process notifications in batches
    for (let i = 0; i < notifications.length; i += this.maxBatchSize) {
      const batch = notifications.slice(i, i + this.maxBatchSize);
      
      try {
        const batchResult = await this.processBatch(batch);
        results.sent += batchResult.sent;
        results.failed += batchResult.failed;
        results.errors.push(...batchResult.errors);
      } catch (error) {
        results.failed += batch.length;
        results.errors.push({
          batch: i / this.maxBatchSize + 1,
          error: error.message,
          affectedCount: batch.length
        });
      }

      // Small delay between batches to avoid overwhelming the system
      if (i + this.maxBatchSize < notifications.length) {
        await this.delay(100);
      }
    }

    return results;
  }

  async processBatch(notifications) {
    const results = {
      sent: 0,
      failed: 0,
      errors: []
    };

    // Process each notification in the batch
    const promises = notifications.map(async (notification) => {
      try {
        await this.sendSingleNotification(notification);
        results.sent++;
      } catch (error) {
        results.failed++;
        results.errors.push({
          userId: notification.userId,
          error: error.message,
          notification: notification.type
        });
      }
    });

    await Promise.allSettled(promises);
    return results;
  }

  async sendSingleNotification(notification) {
    // Try multiple delivery methods
    const deliveryMethods = ['discord', 'database', 'websocket'];
    
    for (const method of deliveryMethods) {
      try {
        await this.deliverNotification(notification, method);
        return; // Success, exit loop
      } catch (error) {
        console.warn(`Failed to deliver notification via ${method}:`, error.message);
        
        // If it's the last method, throw the error
        if (method === deliveryMethods[deliveryMethods.length - 1]) {
          throw error;
        }
      }
    }
  }

  async deliverNotification(notification, method) {
    switch (method) {
      case 'discord':
        return await this.sendDiscordNotification(notification);
      case 'database':
        return await this.storeNotificationInDatabase(notification);
      case 'websocket':
        return await this.sendWebSocketNotification(notification);
      default:
        throw new Error(`Unknown delivery method: ${method}`);
    }
  }

  async sendDiscordNotification(notification) {
    // In a real implementation, this would send via Discord API
    // For now, we'll simulate the process
    
    const discordPayload = {
      userId: notification.userId,
      embed: {
        title: notification.title,
        description: notification.message,
        color: this.getPriorityColor(notification.priority),
        timestamp: notification.data.timestamp,
        fields: this.formatNotificationFields(notification.data)
      },
      components: notification.actionButtons ? [
        {
          type: 1,
          components: notification.actionButtons.map(button => ({
            type: 2,
            style: 1,
            label: button.label,
            custom_id: button.action
          }))
        }
      ] : undefined
    };

    // Simulate API call delay
    await this.delay(50);
    
    // In production, this would be a real Discord API call
    // await axios.post(`${this.apiBaseUrl}/api/discord/send-notification`, discordPayload);
    
    return { method: 'discord', status: 'sent' };
  }

  async storeNotificationInDatabase(notification) {
    try {
      const response = await axios.post(`${this.apiBaseUrl}/api/notifications`, {
        userId: notification.userId,
        type: notification.type,
        title: notification.title,
        message: notification.message,
        data: notification.data,
        priority: notification.priority,
        status: 'pending',
        createdAt: new Date()
      });

      return { method: 'database', status: 'stored', id: response.data.id };
    } catch (error) {
      // Fallback to mock storage for development
      return { method: 'database', status: 'stored', id: `mock_${Date.now()}` };
    }
  }

  async sendWebSocketNotification(notification) {
    // In a real implementation, this would send via WebSocket
    const wsPayload = {
      type: 'notification',
      userId: notification.userId,
      notification
    };

    // Simulate WebSocket send
    await this.delay(10);
    
    return { method: 'websocket', status: 'sent' };
  }

  getPriorityColor(priority) {
    const colors = {
      low: 0x95a5a6,     // Gray
      medium: 0x3498db,   // Blue
      high: 0xe74c3c,     // Red
      urgent: 0x9b59b6   // Purple
    };
    
    return colors[priority] || colors.medium;
  }

  formatNotificationFields(data) {
    const fields = [];
    
    // Add relevant fields based on notification data
    if (data.newLevel) {
      fields.push({
        name: 'New Level',
        value: data.newLevel.toString(),
        inline: true
      });
    }
    
    if (data.coinsReward) {
      fields.push({
        name: 'Coins Reward',
        value: `${data.coinsReward} 🪙`,
        inline: true
      });
    }
    
    if (data.eventType) {
      fields.push({
        name: 'Event Type',
        value: data.eventType,
        inline: true
      });
    }
    
    if (data.expiresAt) {
      fields.push({
        name: 'Expires',
        value: new Date(data.expiresAt).toLocaleString(),
        inline: true
      });
    }

    return fields;
  }

  async delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Retry logic for failed notifications
  async retryFailedNotifications(failedNotifications) {
    const retryResults = {
      retried: 0,
      succeeded: 0,
      stillFailed: 0
    };

    for (const failed of failedNotifications) {
      retryResults.retried++;
      
      try {
        await this.sendSingleNotification(failed.notification);
        retryResults.succeeded++;
      } catch (error) {
        retryResults.stillFailed++;
        console.error(`Retry failed for notification to user ${failed.userId}:`, error.message);
      }
      
      // Small delay between retries
      await this.delay(200);
    }

    return retryResults;
  }
}

// Worker execution
if (parentPort) {
  const worker = new NotificationWorker(workerData);
  worker.startTime = Date.now();
  
  worker.process()
    .then(result => {
      parentPort.postMessage(result);
    })
    .catch(error => {
      parentPort.postMessage({
        success: false,
        error: error.message,
        stack: error.stack
      });
    });
}