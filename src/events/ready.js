import config from "../config.js";
import { logger } from "../utils/logger.js";

export default async (client) => {
  logger.success(`🤖 ${client.user.tag} está online!`);
  logger.info(`📊 Conectado a ${client.guilds.cache.size} servidor(es)`);
  logger.info(`👥 Servindo ${client.users.cache.size} usuário(s)`);
  logger.info(`🎯 Prefix: ${config.prefix}`);
  
  // Definir atividade do bot
  try {
    await client.user.setActivity({
      name: `${config.prefix}help | ${client.guilds.cache.size} servidores`,
      type: 0, // PLAYING
    });
    
    logger.info("✨ Status do bot definido com sucesso!");
  } catch (error) {
    logger.error("Erro ao definir status do bot:", error);
  }

  // Log de informações adicionais
  logger.info(`🆔 ID do Bot: ${client.user.id}`);
  logger.info(`📝 Comandos carregados: ${client.commands?.size || 0}`);
  
  // Verificar se há comandos carregados
  if (!client.commands || client.commands.size === 0) {
    logger.warn("⚠️  Nenhum comando foi carregado!");
  }

  logger.success("🚀 MaryBot inicializado com sucesso!");
};