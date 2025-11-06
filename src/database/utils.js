// Utilitários para criação e verificação de usuários e servidores
import { getPrisma } from "./client.js";

/**
 * Garante que um usuário existe no banco de dados
 * @param {string} discordId - ID do Discord do usuário
 * @param {string} username - Nome do usuário
 * @returns {Promise<object>} - Objeto do usuário
 */
export async function ensureUser(discordId, username) {
  const prisma = getPrisma();
  
  try {
    const user = await prisma.user.upsert({
      where: { id: discordId },
      update: { username: username },
      create: {
        id: discordId,
        discordId: discordId,
        username: username,
        coins: 100,
        level: 1,
        xp: 0,
        playerClass: "ADVENTURER"
      }
    });
    
    return user;
  } catch (error) {
    console.error("Erro ao garantir usuário:", error);
    throw error;
  }
}

/**
 * Garante que um servidor existe no banco de dados
 * @param {string} guildId - ID do Discord do servidor
 * @param {string} guildName - Nome do servidor
 * @returns {Promise<object>} - Objeto do servidor
 */
export async function ensureGuild(guildId, guildName) {
  const prisma = getPrisma();
  
  try {
    const guild = await prisma.guild.upsert({
      where: { id: guildId },
      update: { name: guildName },
      create: {
        id: guildId,
        name: guildName,
        prefix: "m.",
        language: "pt-BR"
      }
    });
    
    return guild;
  } catch (error) {
    console.error("Erro ao garantir servidor:", error);
    throw error;
  }
}

/**
 * Pega dados do usuário
 * @param {string} discordId - ID do Discord do usuário
 * @returns {Promise<object|null>} - Objeto do usuário ou null
 */
export async function getUser(discordId) {
  const prisma = getPrisma();
  
  try {
    return await prisma.user.findUnique({
      where: { id: discordId }
    });
  } catch (error) {
    console.error("Erro ao buscar usuário:", error);
    return null;
  }
}

/**
 * Pega dados do servidor
 * @param {string} guildId - ID do Discord do servidor
 * @returns {Promise<object|null>} - Objeto do servidor ou null
 */
export async function getGuild(guildId) {
  const prisma = getPrisma();
  
  try {
    return await prisma.guild.findUnique({
      where: { id: guildId },
      include: {
        config: true
      }
    });
  } catch (error) {
    console.error("Erro ao buscar servidor:", error);
    return null;
  }
}