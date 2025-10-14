import { prisma } from '../database/client.js';
import { validationResult } from 'express-validator';

export class UserController {
  // Get user by Discord ID
  static async getUserByDiscordId(req, res, next) {
    try {
      const { discordId } = req.params;
      
      const user = await prisma.user.findUnique({
        where: { discordId },
        include: {
          characters: {
            include: {
              character: true
            }
          },
          inventory: {
            include: {
              item: true
            }
          },
          _count: {
            select: {
              characters: true,
              quizScores: true,
              battles: true,
              battleWins: true
            }
          }
        }
      });

      if (!user) {
        return res.status(404).json({
          error: 'User not found',
          message: `User with Discord ID ${discordId} not found`
        });
      }

      res.json({
        success: true,
        data: user
      });

    } catch (error) {
      next(error);
    }
  }

  // Create or update user
  static async createUser(req, res, next) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Validation error',
          details: errors.array()
        });
      }

      const { discordId, username } = req.body;

      const user = await prisma.user.upsert({
        where: { discordId },
        update: { 
          username,
          updatedAt: new Date()
        },
        create: {
          discordId,
          username
        },
        include: {
          _count: {
            select: {
              characters: true,
              quizScores: true
            }
          }
        }
      });

      res.status(user.createdAt === user.updatedAt ? 201 : 200).json({
        success: true,
        data: user,
        message: user.createdAt === user.updatedAt ? 'User created' : 'User updated'
      });

    } catch (error) {
      next(error);
    }
  }

  // Update user data
  static async updateUser(req, res, next) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Validation error',
          details: errors.array()
        });
      }

      const { discordId } = req.params;
      const updateData = req.body;

      // Remove fields that shouldn't be updated directly
      delete updateData.id;
      delete updateData.discordId;
      delete updateData.createdAt;

      const user = await prisma.user.update({
        where: { discordId },
        data: {
          ...updateData,
          updatedAt: new Date()
        },
        include: {
          _count: {
            select: {
              characters: true,
              quizScores: true
            }
          }
        }
      });

      res.json({
        success: true,
        data: user,
        message: 'User updated successfully'
      });

    } catch (error) {
      next(error);
    }
  }

  // Get leaderboard
  static async getLeaderboard(req, res, next) {
    try {
      const { type = 'xp', limit = 10, offset = 0 } = req.query;
      
      let orderBy = {};
      let include = {};

      switch (type) {
        case 'coins':
          orderBy = { coins: 'desc' };
          break;
        case 'level':
          orderBy = { xp: 'desc' };
          break;
        case 'characters':
          include = {
            characters: true,
            _count: {
              select: {
                characters: true
              }
            }
          };
          orderBy = { characters: { _count: 'desc' } };
          break;
        default:
          orderBy = { xp: 'desc' };
      }

      const users = await prisma.user.findMany({
        orderBy,
        take: parseInt(limit),
        skip: parseInt(offset),
        include,
        select: {
          id: true,
          discordId: true,
          username: true,
          xp: true,
          coins: true,
          level: true,
          createdAt: true,
          ...include
        }
      });

      // Calculate levels for users if needed
      const processedUsers = users.map(user => ({
        ...user,
        level: Math.floor(user.xp / 100) + 1,
        ...(type === 'characters' && {
          characterCount: user._count?.characters || 0
        })
      }));

      res.json({
        success: true,
        data: processedUsers,
        pagination: {
          limit: parseInt(limit),
          offset: parseInt(offset),
          type
        }
      });

    } catch (error) {
      next(error);
    }
  }

  // Get user statistics
  static async getUserStats(req, res, next) {
    try {
      const { discordId } = req.params;

      const user = await prisma.user.findUnique({
        where: { discordId },
        include: {
          _count: {
            select: {
              characters: true,
              quizScores: true,
              battles: true,
              battleWins: true
            }
          },
          characters: {
            include: {
              character: {
                select: {
                  rarity: true
                }
              }
            }
          }
        }
      });

      if (!user) {
        return res.status(404).json({
          error: 'User not found'
        });
      }

      // Calculate statistics
      const level = Math.floor(user.xp / 100) + 1;
      const xpForNextLevel = (level * 100) - user.xp;
      const rareCharacters = user.characters.filter(uc => uc.character.rarity >= 4).length;
      const totalQuizzes = user._count.quizScores;
      const winRate = user._count.battles > 0 ? (user._count.battleWins / user._count.battles) * 100 : 0;

      const stats = {
        level,
        xpForNextLevel,
        totalCharacters: user._count.characters,
        rareCharacters,
        totalQuizzes,
        totalBattles: user._count.battles,
        battleWins: user._count.battleWins,
        winRate: Math.round(winRate * 100) / 100
      };

      res.json({
        success: true,
        data: {
          user: {
            id: user.id,
            discordId: user.discordId,
            username: user.username,
            xp: user.xp,
            coins: user.coins,
            bio: user.bio,
            lastDaily: user.lastDaily,
            createdAt: user.createdAt
          },
          stats
        }
      });

    } catch (error) {
      next(error);
    }
  }
}