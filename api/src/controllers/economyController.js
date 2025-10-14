import { prisma } from '../database/client.js';
import { validationResult } from 'express-validator';

export class EconomyController {
  // Process daily reward
  static async processDailyReward(req, res, next) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Validation error',
          details: errors.array()
        });
      }

      const { discordId } = req.body;

      const user = await prisma.user.findUnique({
        where: { discordId }
      });

      if (!user) {
        return res.status(404).json({
          error: 'User not found'
        });
      }

      // Check if user already claimed daily today
      const now = new Date();
      const lastDaily = user.lastDaily;
      
      if (lastDaily) {
        const timeSinceDaily = now.getTime() - lastDaily.getTime();
        const hoursUntilDaily = 24 - Math.floor(timeSinceDaily / (1000 * 60 * 60));
        
        if (hoursUntilDaily > 0) {
          return res.status(400).json({
            error: 'Daily already claimed',
            message: `You can claim your daily reward in ${hoursUntilDaily} hours`,
            hoursUntilDaily
          });
        }
      }

      // Calculate rewards
      const level = Math.floor(user.xp / 100) + 1;
      const baseCoins = 50;
      const baseLevelBonus = Math.floor(level * 2.5);
      const randomBonus = Math.floor(Math.random() * 21) + 10; // 10-30
      const totalCoins = baseCoins + baseLevelBonus + randomBonus;
      
      const baseXP = 25;
      const xpLevelBonus = Math.floor(level * 1.2);
      const xpRandomBonus = Math.floor(Math.random() * 11) + 5; // 5-15
      const totalXP = baseXP + xpLevelBonus + xpRandomBonus;

      // Calculate streak bonus
      let streakBonus = 0;
      let streak = 1;
      
      if (lastDaily) {
        const daysDiff = Math.floor((now - lastDaily) / (1000 * 60 * 60 * 24));
        if (daysDiff === 1) {
          streak = (user.streak || 1) + 1;
          if (streak <= 7) {
            streakBonus = Math.floor(totalCoins * (streak * 0.1));
          }
        }
      }

      const finalCoins = totalCoins + streakBonus;
      const finalXP = totalXP;

      // Update user
      const updatedUser = await prisma.user.update({
        where: { discordId },
        data: {
          coins: { increment: finalCoins },
          xp: { increment: finalXP },
          lastDaily: now,
          streak: streak
        }
      });

      // Check if leveled up
      const newLevel = Math.floor(updatedUser.xp / 100) + 1;
      const leveledUp = newLevel > level;

      res.json({
        success: true,
        data: {
          coinsEarned: finalCoins,
          xpEarned: finalXP,
          streakBonus,
          streak,
          leveledUp,
          newLevel: leveledUp ? newLevel : level,
          user: {
            coins: updatedUser.coins,
            xp: updatedUser.xp,
            level: newLevel
          }
        },
        message: 'Daily reward claimed successfully'
      });

    } catch (error) {
      next(error);
    }
  }

  // Process XP gain
  static async addXP(req, res, next) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Validation error',
          details: errors.array()
        });
      }

      const { discordId, amount, reason } = req.body;

      const user = await prisma.user.findUnique({
        where: { discordId }
      });

      if (!user) {
        return res.status(404).json({
          error: 'User not found'
        });
      }

      const oldLevel = Math.floor(user.xp / 100) + 1;
      
      const updatedUser = await prisma.user.update({
        where: { discordId },
        data: {
          xp: { increment: amount }
        }
      });

      const newLevel = Math.floor(updatedUser.xp / 100) + 1;
      const leveledUp = newLevel > oldLevel;

      res.json({
        success: true,
        data: {
          xpAdded: amount,
          totalXP: updatedUser.xp,
          oldLevel,
          newLevel,
          leveledUp,
          reason
        },
        message: `Added ${amount} XP${reason ? ` for ${reason}` : ''}`
      });

    } catch (error) {
      next(error);
    }
  }

  // Process coin transaction
  static async addCoins(req, res, next) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Validation error',
          details: errors.array()
        });
      }

      const { discordId, amount, reason } = req.body;

      if (amount === 0) {
        return res.status(400).json({
          error: 'Invalid amount',
          message: 'Amount cannot be zero'
        });
      }

      const user = await prisma.user.findUnique({
        where: { discordId }
      });

      if (!user) {
        return res.status(404).json({
          error: 'User not found'
        });
      }

      // Check if user has enough coins for negative amounts
      if (amount < 0 && user.coins < Math.abs(amount)) {
        return res.status(400).json({
          error: 'Insufficient coins',
          message: `User has ${user.coins} coins but trying to deduct ${Math.abs(amount)}`
        });
      }

      const updatedUser = await prisma.user.update({
        where: { discordId },
        data: {
          coins: { increment: amount }
        }
      });

      res.json({
        success: true,
        data: {
          coinsChanged: amount,
          totalCoins: updatedUser.coins,
          reason
        },
        message: `${amount > 0 ? 'Added' : 'Deducted'} ${Math.abs(amount)} coins${reason ? ` for ${reason}` : ''}`
      });

    } catch (error) {
      next(error);
    }
  }

  // Get user's transaction history (if implemented)
  static async getTransactionHistory(req, res, next) {
    try {
      const { discordId } = req.params;
      const { limit = 50, offset = 0 } = req.query;

      // For now, return basic info since we don't have transaction history table
      // This can be extended to include a transactions table
      const user = await prisma.user.findUnique({
        where: { discordId },
        select: {
          id: true,
          discordId: true,
          username: true,
          coins: true,
          xp: true,
          lastDaily: true,
          createdAt: true
        }
      });

      if (!user) {
        return res.status(404).json({
          error: 'User not found'
        });
      }

      res.json({
        success: true,
        data: {
          user,
          transactions: [], // Will be populated when transaction history is implemented
          pagination: {
            limit: parseInt(limit),
            offset: parseInt(offset)
          }
        },
        message: 'Transaction history retrieved (placeholder - implement transaction table for full history)'
      });

    } catch (error) {
      next(error);
    }
  }
}