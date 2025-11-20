import config from "../config.js";
import { logger } from "../utils/logger.js";
import { inviteSystem } from "../utils/inviteSystem.js";

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
  
  // 🎯 Registrar slash commands
  try {
    const slashCommands = [];
    
    // Coletar todos os slash commands
    client.commands.forEach((command, key) => {
      if (key.endsWith('_slash') && command.data) {
        slashCommands.push(command.data.toJSON());
      }
    });
    
    if (slashCommands.length > 0) {
      logger.info(`🔄 Registrando ${slashCommands.length} slash commands...`);
      await client.application.commands.set(slashCommands);
      logger.success(`✅ ${slashCommands.length} slash commands registrados!`);
    }
    
  } catch (error) {
    logger.error('❌ Erro ao registrar slash commands:', error.message);
  }
  
  // Verificar se há comandos carregados
  if (!client.commands || client.commands.size === 0) {
    logger.warn("⚠️  Nenhum comando foi carregado!");
  }

  // 🎯 Sincronizar convites de todos os servidores
  logger.info("🎯 Sincronizando convites...");
  try {
    for (const guild of client.guilds.cache.values()) {
      const config = await inviteSystem.getInviteConfig(guild.id);
      if (config?.enabled) {
        await inviteSystem.syncInvites(guild);
      }
    }
    logger.success("🎯 Convites sincronizados!");
  } catch (error) {
    logger.error("❌ Erro ao sincronizar convites:", error.message);
  }

  // 🧹 Agendar limpeza diária
  setInterval(async () => {
    try {
      await inviteSystem.cleanup();
    } catch (error) {
      logger.error("❌ Erro na limpeza automática:", error.message);
    }
  }, 24 * 60 * 60 * 1000); // 24 horas

  logger.success("🚀 MaryBot inicializado com sucesso!");
};