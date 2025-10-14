import { prisma } from '../database/client.js';
import { validationResult } from 'express-validator';

export class CharacterController {
  // Get all characters with pagination and filters
  static async getAllCharacters(req, res, next) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Validation error',
          details: errors.array()
        });
      }

      const { 
        limit = 20, 
        offset = 0, 
        rarity,
        anime,
        search,
        sortBy = 'name',
        sortOrder = 'asc'
      } = req.query;

      // Build where clause
      const where = {};
      
      if (rarity) {
        where.rarity = rarity;
      }
      
      if (anime) {
        where.anime = {
          contains: anime,
          mode: 'insensitive'
        };
      }
      
      if (search) {
        where.OR = [
          {
            name: {
              contains: search,
              mode: 'insensitive'
            }
          },
          {
            anime: {
              contains: search,
              mode: 'insensitive'
            }
          }
        ];
      }

      // Build orderBy clause
      const orderBy = {};
      orderBy[sortBy] = sortOrder;

      const [characters, total] = await Promise.all([
        prisma.character.findMany({
          where,
          orderBy,
          take: parseInt(limit),
          skip: parseInt(offset)
        }),
        prisma.character.count({ where })
      ]);

      res.json({
        success: true,
        data: {
          characters,
          pagination: {
            total,
            limit: parseInt(limit),
            offset: parseInt(offset),
            pages: Math.ceil(total / limit)
          }
        },
        message: `Retrieved ${characters.length} characters`
      });

    } catch (error) {
      next(error);
    }
  }

  // Get character by ID
  static async getCharacterById(req, res, next) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Validation error',
          details: errors.array()
        });
      }

      const { id } = req.params;

      const character = await prisma.character.findUnique({
        where: { id: parseInt(id) }
      });

      if (!character) {
        return res.status(404).json({
          error: 'Character not found'
        });
      }

      res.json({
        success: true,
        data: { character },
        message: 'Character retrieved successfully'
      });

    } catch (error) {
      next(error);
    }
  }

  // Create new character
  static async createCharacter(req, res, next) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Validation error',
          details: errors.array()
        });
      }

      const { name, anime, rarity, imageUrl, description } = req.body;

      // Check if character already exists
      const existingCharacter = await prisma.character.findFirst({
        where: {
          name: {
            equals: name,
            mode: 'insensitive'
          },
          anime: {
            equals: anime,
            mode: 'insensitive'
          }
        }
      });

      if (existingCharacter) {
        return res.status(409).json({
          error: 'Character already exists',
          message: `Character "${name}" from "${anime}" already exists`
        });
      }

      const character = await prisma.character.create({
        data: {
          name,
          anime,
          rarity,
          imageUrl,
          description
        }
      });

      res.status(201).json({
        success: true,
        data: { character },
        message: 'Character created successfully'
      });

    } catch (error) {
      next(error);
    }
  }

  // Update character
  static async updateCharacter(req, res, next) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Validation error',
          details: errors.array()
        });
      }

      const { id } = req.params;
      const { name, anime, rarity, imageUrl, description } = req.body;

      // Check if character exists
      const existingCharacter = await prisma.character.findUnique({
        where: { id: parseInt(id) }
      });

      if (!existingCharacter) {
        return res.status(404).json({
          error: 'Character not found'
        });
      }

      // If name or anime is being changed, check for duplicates
      if ((name && name !== existingCharacter.name) || (anime && anime !== existingCharacter.anime)) {
        const duplicateCharacter = await prisma.character.findFirst({
          where: {
            id: { not: parseInt(id) },
            name: {
              equals: name || existingCharacter.name,
              mode: 'insensitive'
            },
            anime: {
              equals: anime || existingCharacter.anime,
              mode: 'insensitive'
            }
          }
        });

        if (duplicateCharacter) {
          return res.status(409).json({
            error: 'Character already exists',
            message: `Character "${name || existingCharacter.name}" from "${anime || existingCharacter.anime}" already exists`
          });
        }
      }

      const updatedCharacter = await prisma.character.update({
        where: { id: parseInt(id) },
        data: {
          ...(name && { name }),
          ...(anime && { anime }),
          ...(rarity && { rarity }),
          ...(imageUrl && { imageUrl }),
          ...(description !== undefined && { description })
        }
      });

      res.json({
        success: true,
        data: { character: updatedCharacter },
        message: 'Character updated successfully'
      });

    } catch (error) {
      next(error);
    }
  }

  // Delete character
  static async deleteCharacter(req, res, next) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Validation error',
          details: errors.array()
        });
      }

      const { id } = req.params;

      // Check if character exists
      const character = await prisma.character.findUnique({
        where: { id: parseInt(id) }
      });

      if (!character) {
        return res.status(404).json({
          error: 'Character not found'
        });
      }

      await prisma.character.delete({
        where: { id: parseInt(id) }
      });

      res.json({
        success: true,
        data: { deletedCharacter: character },
        message: 'Character deleted successfully'
      });

    } catch (error) {
      next(error);
    }
  }

  // Get characters by rarity
  static async getCharactersByRarity(req, res, next) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Validation error',
          details: errors.array()
        });
      }

      const { rarity } = req.params;
      const { limit = 20, offset = 0 } = req.query;

      const [characters, total] = await Promise.all([
        prisma.character.findMany({
          where: { rarity },
          orderBy: { name: 'asc' },
          take: parseInt(limit),
          skip: parseInt(offset)
        }),
        prisma.character.count({ where: { rarity } })
      ]);

      res.json({
        success: true,
        data: {
          characters,
          rarity,
          pagination: {
            total,
            limit: parseInt(limit),
            offset: parseInt(offset),
            pages: Math.ceil(total / limit)
          }
        },
        message: `Retrieved ${characters.length} ${rarity} characters`
      });

    } catch (error) {
      next(error);
    }
  }

  // Get random character for gacha
  static async getRandomCharacter(req, res, next) {
    try {
      // Get character counts by rarity
      const rarityCounts = await prisma.character.groupBy({
        by: ['rarity'],
        _count: {
          id: true
        }
      });

      if (rarityCounts.length === 0) {
        return res.status(404).json({
          error: 'No characters found',
          message: 'No characters available for gacha'
        });
      }

      // Define rarity weights (higher weight = more likely)
      const rarityWeights = {
        'COMMON': 50,
        'RARE': 30,
        'EPIC': 15,
        'LEGENDARY': 4,
        'MYTHICAL': 1
      };

      // Build weighted array
      let weightedRarities = [];
      rarityCounts.forEach(({ rarity, _count }) => {
        const weight = rarityWeights[rarity] || 1;
        for (let i = 0; i < weight; i++) {
          weightedRarities.push(rarity);
        }
      });

      // Select random rarity
      const selectedRarity = weightedRarities[Math.floor(Math.random() * weightedRarities.length)];

      // Get random character of selected rarity
      const charactersOfRarity = await prisma.character.findMany({
        where: { rarity: selectedRarity }
      });

      const randomCharacter = charactersOfRarity[Math.floor(Math.random() * charactersOfRarity.length)];

      res.json({
        success: true,
        data: {
          character: randomCharacter,
          selectedRarity,
          availableRarities: rarityCounts
        },
        message: 'Random character selected for gacha'
      });

    } catch (error) {
      next(error);
    }
  }
}