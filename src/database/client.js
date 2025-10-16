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
    throw new Error('Database not initialized. Call initDatabase() first.');
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

// Exportar instância do Prisma (para compatibilidade)
export { prisma };

// Export default da função de inicialização
export default initDatabase;