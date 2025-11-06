import { configManager } from "../utils/configManager.js";
import { logger } from "../utils/logger.js";
import { threadManager } from "../game/threadManager.js";
import config from "../config.js"; // Fallback para config estático
import { handleMessageLearning } from '../utils/learningHandler.js';
import { handleConversation } from '../utils/conversationManager.js';

export default async (client, message) => {
  // Ignorar mensagens de bots
  if (message.author.bot) return;

  // 🗣️ Sistema de Conversação - Responder quando mencionado
  if (message.mentions.has(client.user)) {
    const content = message.content.replace(/<@!?\d+>/g, '').trim();
    
    if (content) {
      // Processar conversa
      await handleConversation(message, content);
      
      // Ainda coletar para aprendizado (sem await para não bloquear)
      handleMessageLearning(message).catch(err => {
        logger.error('Erro no sistema de aprendizado:', err);
      });
      
      return; // Não processar como comando
    }
  }

  // Sistema de aprendizado - coletar mensagem (assíncrono, não bloqueia)
  handleMessageLearning(message).catch(err => {
    logger.error('Erro no sistema de aprendizado:', err);
  });

  // Monitorar atividade em threads temporárias
  if (message.channel.isThread() && threadManager.isInitialized) {
    await threadManager.recordActivity(message.channel.id, message.author.id);
  }

  // Obter configuração do servidor (ou usar padrão para DMs)
  const guildConfig = message.guild ? 
    await configManager.getConfig(message.guild.id) : 
    config;

  // Verificar se mensagem começa com o prefix
  if (!message.content.startsWith(guildConfig.prefix)) return;

  // Extrair argumentos e nome do comando
  const args = message.content.slice(guildConfig.prefix.length).trim().split(/ +/);
  const commandName = args.shift().toLowerCase();

  // Buscar o comando
  const command = client.commands.get(commandName);

  if (!command) return;

  // Verificar se o comando está habilitado no servidor
  if (message.guild && !guildConfig.commandsEnabled) {
    return message.reply({
      embeds: [{
        color: guildConfig.colors.warning,
        title: `${guildConfig.emojis.warning} Comandos Desabilitados`,
        description: "Os comandos estão desabilitados neste servidor.",
      }],
    });
  }

  // Verificar se a categoria do comando está habilitada
  if (message.guild && command.category) {
    const categoryEnabled = {
      'dungeon': guildConfig.dungeonEnabled,
      'economy': guildConfig.economyEnabled,
      'anime': guildConfig.animeEnabled
    };

    if (categoryEnabled.hasOwnProperty(command.category) && !categoryEnabled[command.category]) {
      return message.reply({
        embeds: [{
          color: guildConfig.colors.warning,
          title: `${guildConfig.emojis.warning} Categoria Desabilitada`,
          description: `A categoria **${command.category}** está desabilitada neste servidor.`,
        }],
      });
    }
  }

  try {
    // Log do comando executado
    logger.command(
      `${message.author.tag} (${message.author.id})`,
      `${guildConfig.prefix}${commandName}`,
      message.guild?.name
    );

    // Verificar se o comando requer permissões de owner
    if (command.ownerOnly && message.author.id !== config.ownerId) {
      return message.reply({
        embeds: [{
          color: guildConfig.colors.error,
          title: `${guildConfig.emojis.error} Acesso Negado`,
          description: "Este comando é restrito ao desenvolvedor do bot.",
        }],
      });
    }

    // Verificar se o comando requer permissões específicas
    if (command.permissions && message.guild) {
      const authorPerms = message.channel.permissionsFor(message.author);
      if (!authorPerms || !authorPerms.has(command.permissions)) {
        return message.reply({
          embeds: [{
            color: guildConfig.colors.error,
            title: `${guildConfig.emojis.error} Permissões Insuficientes`,
            description: `Você precisa das seguintes permissões: \`${command.permissions.join(', ')}\``,
          }],
        });
      }
    }

    // Verificar cooldown usando configuração do servidor
    const cooldownTime = command.cooldown || guildConfig.cooldowns.default;
    if (cooldownTime) {
      const now = Date.now();
      const cooldownKey = `${message.author.id}-${commandName}`;
      
      if (!client.cooldowns) client.cooldowns = new Map();
      
      if (client.cooldowns.has(cooldownKey)) {
        const expirationTime = client.cooldowns.get(cooldownKey) + cooldownTime;
        
        if (now < expirationTime) {
          const timeLeft = (expirationTime - now) / 1000;
          return message.reply({
            embeds: [{
              color: guildConfig.colors.warning,
              title: `${guildConfig.emojis.warning} Calma aí!`,
              description: `Aguarde **${timeLeft.toFixed(1)}s** antes de usar este comando novamente.`,
            }],
          });
        }
      }
      
      client.cooldowns.set(cooldownKey, now);
      setTimeout(() => client.cooldowns.delete(cooldownKey), cooldownTime);
    }

    // Executar o comando passando a configuração do servidor
    await command.execute(client, message, args, guildConfig);

  } catch (error) {
    logger.error(`Erro ao executar comando ${commandName}:`, error);
    
    const errorEmbed = {
      color: guildConfig.colors.error,
      title: `${guildConfig.emojis.error} Erro Interno`,
      description: "Ocorreu um erro ao executar este comando. Tente novamente mais tarde.",
      footer: {
        text: "Se o problema persistir, contate o desenvolvedor.",
      },
    };

    try {
      await message.reply({ embeds: [errorEmbed] });
    } catch (replyError) {
      logger.error("Erro ao enviar mensagem de erro:", replyError);
    }
  }
};