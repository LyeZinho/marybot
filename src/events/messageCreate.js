import config from "../config.js";
import { logger } from "../utils/logger.js";

export default async (client, message) => {
  // Ignorar mensagens de bots e mensagens que não começam com o prefix
  if (message.author.bot || !message.content.startsWith(config.prefix)) return;

  // Extrair argumentos e nome do comando
  const args = message.content.slice(config.prefix.length).trim().split(/ +/);
  const commandName = args.shift().toLowerCase();

  // Buscar o comando
  const command = client.commands.get(commandName);

  if (!command) return;

  try {
    // Log do comando executado
    logger.command(
      `${message.author.tag} (${message.author.id})`,
      `${config.prefix}${commandName}`,
      message.guild?.name
    );

    // Verificar se o comando requer permissões de owner
    if (command.ownerOnly && message.author.id !== config.ownerId) {
      return message.reply({
        embeds: [{
          color: config.colors.error,
          title: `${config.emojis.error} Acesso Negado`,
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
            color: config.colors.error,
            title: `${config.emojis.error} Permissões Insuficientes`,
            description: `Você precisa das seguintes permissões: \`${command.permissions.join(', ')}\``,
          }],
        });
      }
    }

    // Verificar cooldown (se implementado)
    if (command.cooldown) {
      const now = Date.now();
      const cooldownKey = `${message.author.id}-${commandName}`;
      
      if (!client.cooldowns) client.cooldowns = new Map();
      
      if (client.cooldowns.has(cooldownKey)) {
        const expirationTime = client.cooldowns.get(cooldownKey) + command.cooldown;
        
        if (now < expirationTime) {
          const timeLeft = (expirationTime - now) / 1000;
          return message.reply({
            embeds: [{
              color: config.colors.warning,
              title: `${config.emojis.warning} Calma aí!`,
              description: `Aguarde **${timeLeft.toFixed(1)}s** antes de usar este comando novamente.`,
            }],
          });
        }
      }
      
      client.cooldowns.set(cooldownKey, now);
      setTimeout(() => client.cooldowns.delete(cooldownKey), command.cooldown);
    }

    // Executar o comando
    await command.execute(client, message, args);

  } catch (error) {
    logger.error(`Erro ao executar comando ${commandName}:`, error);
    
    const errorEmbed = {
      color: config.colors.error,
      title: `${config.emojis.error} Erro Interno`,
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