import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger.js';

// Instância global do Prisma Client
let prisma;

// Função para criar conexão com o banco
function createPrismaClient() {
  return new PrismaClient({
    log: [
      {
        emit: 'event',
        level: 'query',
      },
      {
        emit: 'event',
        level: 'error',
      },
      {
        emit: 'event',
        level: 'info',
      },
      {
        emit: 'event',
        level: 'warn',
      },
    ],
    errorFormat: 'pretty',
  });
}

// Função para inicializar o banco de dados
export async function initDatabase() {
  try {
    if (!prisma) {
      prisma = createPrismaClient();
      
      // Event listeners para logs
      prisma.$on('query', (e) => {
        if (process.env.NODE_ENV === 'development') {
          logger.debug(`Prisma Query: ${e.query} | Params: ${e.params} | Duration: ${e.duration}ms`);
        }
      });

      prisma.$on('error', (e) => {
        logger.error('Prisma Error:', e);
      });

      prisma.$on('info', (e) => {
        logger.info('Prisma Info:', e.message);
      });

      prisma.$on('warn', (e) => {
        logger.warn('Prisma Warning:', e.message);
      });
    }

    // Testar conexão
    await prisma.$connect();
    logger.success('🗄️ Conexão com o banco de dados estabelecida!');
    
    return prisma;
  } catch (error) {
    logger.error('Erro ao conectar com o banco de dados:', error);
    throw error;
  }
}

// Função para desconectar do banco
export async function disconnectDatabase() {
  if (prisma) {
    await prisma.$disconnect();
    logger.info('🗄️ Desconectado do banco de dados');
  }
}

// Função para obter a instância do Prisma
export function getPrisma() {
  if (!prisma) {
    // Retornar null ao invés de lançar erro
    // Permite código mais resiliente
    return null;
  }
  return prisma;
}

// Funções utilitárias para operações comuns

// Buscar ou criar usuário
export async function getOrCreateUser(discordId, username) {
  const client = getPrisma();
  
  return await client.user.upsert({
    where: { discordId },
    update: { username },
    create: {
      discordId,
      username,
      coins: 100, // Moedas iniciais
      bank: 0,
      xp: 0,
      level: 1,
    },
  });
}

// Buscar ou criar configurações do servidor
export async function getOrCreateGuild(guildId, guildName) {
  const client = getPrisma();
  
  return await client.guild.upsert({
    where: { id: guildId },
    update: { name: guildName },
    create: {
      id: guildId,
      name: guildName,
      prefix: 'm.',
    },
  });
}

// Adicionar transação
export async function addTransaction(userId, type, amount, reason) {
  const client = getPrisma();
  
  return await client.transaction.create({
    data: {
      userId,
      type,
      amount,
      reason,
    },
  });
}

// Atualizar saldo do usuário
export async function updateUserBalance(discordId, coins = 0, bank = 0) {
  const client = getPrisma();
  
  return await client.user.update({
    where: { discordId },
    data: {
      coins: { increment: coins },
      bank: { increment: bank },
    },
  });
}

// Verificar se usuário pode usar daily
export async function canUseDailyReward(discordId) {
  const client = getPrisma();
  
  const user = await client.user.findUnique({
    where: { discordId },
    select: { lastDaily: true },
  });
  
  if (!user?.lastDaily) return true;
  
  const now = new Date();
  const lastDaily = new Date(user.lastDaily);
  const diffHours = Math.abs(now - lastDaily) / 36e5;
  
  return diffHours >= 24;
}

// Atualizar último daily do usuário
export async function updateLastDaily(discordId) {
  const client = getPrisma();
  
  return await client.user.update({
    where: { discordId },
    data: { lastDaily: new Date() },
  });
}

// === FUNÇÕES PARA SISTEMA DE DUNGEON ===

// Buscar ou criar dungeon run ativa
export async function getOrCreateDungeonRun(discordId) {
  const client = getPrisma();
  
  const user = await getOrCreateUser(discordId, 'Unknown');
  
  // Verificar se há dungeon ativa
  let dungeonRun = await client.dungeonRun.findFirst({
    where: {
      userId: user.id,
      isActive: true
    }
  });
  
  if (!dungeonRun) {
    // Criar nova dungeon
    const seed = `${user.id}_${Date.now()}`;
    dungeonRun = await client.dungeonRun.create({
      data: {
        userId: user.id,
        seed,
        currentFloor: 1,
        positionX: 0,
        positionY: 0,
        mapData: {},
        inventory: {},
        health: user.maxHp,
        maxHealth: user.maxHp,
        biome: 'CRYPT'
      }
    });
  }
  
  return dungeonRun;
}

// Atualizar posição do jogador na dungeon
export async function updateDungeonPosition(discordId, x, y, mapData = null) {
  const client = getPrisma();
  
  const user = await getOrCreateUser(discordId, 'Unknown');
  
  const updateData = {
    positionX: x,
    positionY: y
  };
  
  if (mapData) {
    updateData.mapData = mapData;
  }
  
  return await client.dungeonRun.updateMany({
    where: { 
      userId: user.id,
      isActive: true 
    },
    data: updateData
  });
}

// Atualizar saúde do jogador
export async function updateDungeonHealth(discordId, health) {
  const client = getPrisma();
  
  const user = await getOrCreateUser(discordId, 'Unknown');
  
  return await client.dungeonRun.updateMany({
    where: { 
      userId: user.id,
      isActive: true 
    },
    data: { health }
  });
}

// Atualizar progresso de salas visitadas (comprimido)
export async function updateDungeonProgress(discordId, compressedVisitedRooms, explorationPercentage = null) {
  const client = getPrisma();
  
  const user = await getOrCreateUser(discordId, 'Unknown');
  
  const updateData = {
    visitedRooms: compressedVisitedRooms
  };
  
  if (explorationPercentage !== null) {
    updateData.progress = explorationPercentage;
  }
  
  return await client.dungeonRun.updateMany({
    where: { 
      userId: user.id,
      isActive: true 
    },
    data: updateData
  });
}

// Finalizar dungeon run
export async function finishDungeonRun(dungeonRunId, success = false) {
  const client = getPrisma();
  
  return await client.dungeonRun.update({
    where: { id: dungeonRunId },
    data: {
      isActive: false,
      completedAt: new Date(),
      progress: success ? 100 : 50
    }
  });
}

// Criar log de batalha
export async function createBattleLog(userId, dungeonRunId, mobName, result, damageDealt, damageTaken, xpGained, coinsGained, loot = null) {
  const client = getPrisma();
  
  return await client.battleLog.create({
    data: {
      userId,
      dungeonRunId,
      mobName,
      result,
      damageDealt,
      damageTaken,
      xpGained,
      coinsGained,
      loot: loot || {}
    }
  });
}

// Buscar mobs por bioma
export async function getMobsByBiome(biome, level = 1) {
  const client = getPrisma();
  
  return await client.mob.findMany({
    where: {
      biomes: {
        has: biome
      },
      levelMin: { lte: level },
      levelMax: { gte: level }
    }
  });
}

// === SISTEMA DE INVENTÁRIO ===

// Adicionar item ao inventário do usuário
export async function addItemToInventory(discordId, itemId, quantity = 1) {
  const client = getPrisma();
  
  try {
    // Buscar usuário
    const user = await getOrCreateUser(discordId, 'Unknown');
    
    // Verificar se o item já existe no inventário
    const existingUserItem = await client.userItem.findFirst({
      where: {
        userId: user.id,
        itemId: itemId
      }
    });

    if (existingUserItem) {
      // Atualizar quantidade se já existe
      return await client.userItem.update({
        where: {
          id: existingUserItem.id
        },
        data: {
          quantity: existingUserItem.quantity + quantity
        }
      });
    } else {
      // Criar novo registro se não existe
      return await client.userItem.create({
        data: {
          userId: user.id,
          itemId: itemId,
          quantity: quantity
        }
      });
    }
  } catch (error) {
    console.error('Erro ao adicionar item ao inventário:', error);
    throw error;
  }
}

// Remover item do inventário
export async function removeItemFromInventory(discordId, itemId, quantity = 1) {
  const client = getPrisma();
  
  try {
    const user = await getOrCreateUser(discordId, 'Unknown');
    
    const userItem = await client.userItem.findFirst({
      where: {
        userId: user.id,
        itemId: itemId
      }
    });

    if (!userItem) {
      return null; // Item não encontrado
    }

    if (userItem.quantity <= quantity) {
      // Remove completamente se a quantidade for menor ou igual
      await client.userItem.delete({
        where: {
          id: userItem.id
        }
      });
      return null;
    } else {
      // Reduz a quantidade
      return await client.userItem.update({
        where: {
          id: userItem.id
        },
        data: {
          quantity: userItem.quantity - quantity
        }
      });
    }
  } catch (error) {
    console.error('Erro ao remover item do inventário:', error);
    throw error;
  }
}

// Buscar inventário do usuário
export async function getUserInventory(discordId) {
  const client = getPrisma();
  
  try {
    const user = await getOrCreateUser(discordId, 'Unknown');
    
    return await client.userItem.findMany({
      where: {
        userId: user.id
      },
      orderBy: [
        { isEquipped: 'desc' },
        { itemId: 'asc' }
      ]
    });
  } catch (error) {
    console.error('Erro ao buscar inventário:', error);
    return [];
  }
}

// Equipar item
export async function equipItem(discordId, itemId, slot = null) {
  const client = getPrisma();
  
  try {
    const user = await getOrCreateUser(discordId, 'Unknown');
    
    // Encontrar o item no inventário
    const userItem = await client.userItem.findFirst({
      where: {
        userId: user.id,
        itemId: itemId
      }
    });

    if (!userItem) {
      return { success: false, error: 'Item não encontrado no inventário' };
    }

    // Desequipar outros itens do mesmo slot (se aplicável)
    if (slot) {
      await client.userItem.updateMany({
        where: {
          userId: user.id,
          equipSlot: slot
        },
        data: {
          isEquipped: false,
          equipSlot: null
        }
      });
    }

    // Equipar o item
    const result = await client.userItem.update({
      where: {
        id: userItem.id
      },
      data: {
        isEquipped: true,
        equipSlot: slot
      }
    });

    return { success: true, item: result };
  } catch (error) {
    console.error('Erro ao equipar item:', error);
    return { success: false, error: 'Erro interno' };
  }
}

// Desequipar item
export async function unequipItem(discordId, itemId) {
  const client = getPrisma();
  
  try {
    const user = await getOrCreateUser(discordId, 'Unknown');
    
    const result = await client.userItem.updateMany({
      where: {
        userId: user.id,
        itemId: itemId,
        isEquipped: true
      },
      data: {
        isEquipped: false,
        equipSlot: null
      }
    });

    return result.count > 0;
  } catch (error) {
    console.error('Erro ao desequipar item:', error);
    return false;
  }
}

// Buscar itens equipados
export async function getEquippedItems(discordId) {
  const client = getPrisma();
  
  try {
    const user = await getOrCreateUser(discordId, 'Unknown');
    
    return await client.userItem.findMany({
      where: {
        userId: user.id,
        isEquipped: true
      }
    });
  } catch (error) {
    console.error('Erro ao buscar itens equipados:', error);
    return [];
  }
}

// Exportar instância do Prisma (para compatibilidade)
export { prisma };

// Export default da função de inicialização
export default initDatabase;