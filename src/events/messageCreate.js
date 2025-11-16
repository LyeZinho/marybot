import { configManager } from "../utils/configManager.js";
import { logger } from "../utils/logger.js";
import { threadManager } from "../game/threadManager.js";
import config from "../config.js"; // Fallback para config estático
import { handleMessageLearning } from '../utils/learningHandler.js';
import { handleConversation } from '../utils/conversationManager.js';
import fetch from 'node-fetch';

export default async (client, message) => {
  // Ignorar mensagens de bots
  if (message.author.bot) return;

  // 🔞 Detecção Automática de NSFW - Verificar imagens
  await handleNSFWDetection(message, client);

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

/**
 * 🔞 Função para detectar conteúdo NSFW automaticamente
 */
async function handleNSFWDetection(message, client) {
  try {
    // Ignorar mensagens em DM ou sem servidor
    if (!message.guild) return;

    // Obter configuração do servidor
    const guildConfig = await configManager.getConfig(message.guild.id);

    // Verificar se a detecção NSFW está habilitada no servidor
    if (!guildConfig.nsfw?.enabled) return;

    // Verificar se o canal está na whitelist (NSFW permitido)
    if (guildConfig.nsfw.whitelistedChannels.includes(message.channel.id)) return;

    // Verificar se o usuário tem uma role da whitelist
    const member = message.guild.members.cache.get(message.author.id);
    if (member && guildConfig.nsfw.whitelistedRoles.some(roleId => member.roles.cache.has(roleId))) {
      return;
    }

    // Coletar todas as imagens da mensagem
    const imageUrls = [];
    
    // 1. Verificar anexos de imagens
    if (message.attachments.size > 0) {
      message.attachments.forEach(attachment => {
        if (attachment.contentType && attachment.contentType.startsWith('image/')) {
          imageUrls.push({
            url: attachment.url,
            type: 'attachment',
            filename: attachment.name,
            size: attachment.size
          });
        }
      });
    }

    // 2. Verificar URLs de imagens no conteúdo da mensagem
    const urlRegex = /(https?:\/\/[^\s]+\.(jpg|jpeg|png|gif|webp)(\?[^\s]*)?)/gi;
    const urlMatches = message.content.match(urlRegex);
    
    if (urlMatches) {
      urlMatches.forEach(url => {
        imageUrls.push({
          url: url,
          type: 'link',
          filename: url.split('/').pop().split('?')[0]
        });
      });
    }

    // Se não há imagens, não fazer nada
    if (imageUrls.length === 0) return;

    // Analisar imagens usando o servidor AI
    const urls = imageUrls.map(img => img.url);
    
    const response = await fetch('http://localhost:3001/api/nsfw/analyze-multiple', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        urls: urls,
        options: {
          strictMode: guildConfig.nsfw.strictMode,
          sensitivity: guildConfig.nsfw.sensitivity
        }
      })
    });

    if (!response.ok) {
      logger.warn('Servidor AI NSFW indisponível:', response.status);
      return;
    }

    const data = await response.json();
    
    if (!data.success) {
      logger.error('Erro na análise NSFW:', data.message);
      return;
    }

    // Processar resultados
    const results = data.data.results;
    const blockedImages = results.filter(result => result.isBlocked);
    
    if (blockedImages.length > 0) {
      // Log do evento para auditoria
      logger.warn('Conteúdo NSFW detectado:', {
        userId: message.author.id,
        username: message.author.username,
        guildId: message.guild?.id,
        channelId: message.channel.id,
        imagesBlocked: blockedImages.length,
        totalImages: results.length,
        details: blockedImages.map(img => ({
          url: img.url.substring(0, 50) + '...',
          confidence: img.confidence,
          classification: img.classification
        }))
      });

      // Ações baseadas na configuração do servidor
      const nsfwConfig = guildConfig.nsfw;
      
      // 1. Deletar mensagem se configurado
      if (nsfwConfig.deleteMessage) {
        try {
          await message.delete();
          logger.info('Mensagem com conteúdo NSFW deletada', {
            messageId: message.id,
            userId: message.author.id
          });
        } catch (error) {
          logger.error('Erro ao deletar mensagem NSFW:', error);
        }
      }

      // 2. Enviar aviso se configurado
      if (nsfwConfig.sendWarning) {
        const warningEmbed = {
          color: 0xFF6B6B,
          title: '🔞 Conteúdo Impróprio Detectado',
          description: `${message.author}, foi detectado conteúdo impróprio em sua mensagem.`,
          fields: [
            {
              name: '📊 Análise',
              value: `**Imagens analisadas:** ${results.length}\n**Imagens bloqueadas:** ${blockedImages.length}`,
              inline: true
            },
            {
              name: '⚠️ Aviso',
              value: nsfwConfig.deleteMessage ? 
                'Sua mensagem foi removida automaticamente.' :
                'Por favor, evite enviar esse tipo de conteúdo.',
              inline: true
            }
          ],
          footer: {
            text: 'Sistema de detecção automática NSFW',
            icon_url: client.user.displayAvatarURL()
          },
          timestamp: new Date().toISOString()
        };

        try {
          const warningMessage = await message.channel.send({
            embeds: [warningEmbed]
          });

          // Auto-deletar aviso após 30 segundos se configurado
          if (nsfwConfig.autoDeleteWarning) {
            setTimeout(async () => {
              try {
                await warningMessage.delete();
              } catch (error) {
                // Ignore deletion errors (message might already be deleted)
              }
            }, 30000);
          }
        } catch (error) {
          logger.error('Erro ao enviar aviso NSFW:', error);
        }
      }

      // 3. Aplicar punição se configurado
      if (nsfwConfig.punishment && nsfwConfig.punishment !== 'none') {
        try {
          const member = message.guild?.members.cache.get(message.author.id);
          
          if (member) {
            switch (nsfwConfig.punishment) {
              case 'timeout':
                await member.timeout(10 * 60 * 1000, 'Envio de conteúdo NSFW detectado automaticamente');
                logger.info('Usuário recebeu timeout por conteúdo NSFW:', {
                  userId: message.author.id,
                  duration: '10 minutos'
                });
                break;
              
              case 'kick':
                await member.kick('Envio de conteúdo NSFW detectado automaticamente');
                logger.info('Usuário expulso por conteúdo NSFW:', {
                  userId: message.author.id
                });
                break;
              
              case 'ban':
                await member.ban({ 
                  reason: 'Envio de conteúdo NSFW detectado automaticamente',
                  deleteMessageDays: 1 
                });
                logger.info('Usuário banido por conteúdo NSFW:', {
                  userId: message.author.id
                });
                break;
            }
          }
        } catch (error) {
          logger.error('Erro ao aplicar punição NSFW:', error);
        }
      }

      // 4. Notificar moderação se configurado
      if (nsfwConfig.notifyMods && nsfwConfig.modChannelId) {
        try {
          const modChannel = message.guild?.channels.cache.get(nsfwConfig.modChannelId);
          
          if (modChannel) {
            const modEmbed = {
              color: 0xFF4757,
              title: '🚨 Detecção NSFW - Relatório de Moderação',
              fields: [
                {
                  name: '👤 Usuário',
                  value: `${message.author} (${message.author.id})`,
                  inline: true
                },
                {
                  name: '📍 Canal',
                  value: `${message.channel} (${message.channel.id})`,
                  inline: true
                },
                {
                  name: '📊 Análise',
                  value: `**${blockedImages.length}** de **${results.length}** imagens bloqueadas`,
                  inline: true
                },
                {
                  name: '🔗 Detalhes',
                  value: blockedImages.map(img => 
                    `• **${img.classification}** (${Math.round(img.confidence * 100)}% confiança)`
                  ).join('\n') || 'Nenhum detalhe disponível',
                  inline: false
                },
                {
                  name: '⚙️ Ações Tomadas',
                  value: [
                    nsfwConfig.deleteMessage ? '• Mensagem deletada' : null,
                    nsfwConfig.sendWarning ? '• Aviso enviado' : null,
                    nsfwConfig.punishment !== 'none' ? `• ${nsfwConfig.punishment} aplicado` : null
                  ].filter(Boolean).join('\n') || 'Nenhuma ação automática',
                  inline: false
                }
              ],
              footer: {
                text: `ID da Mensagem: ${message.id}`,
                icon_url: message.author.displayAvatarURL()
              },
              timestamp: new Date().toISOString()
            };

            await modChannel.send({ embeds: [modEmbed] });
          }
        } catch (error) {
          logger.error('Erro ao notificar moderação sobre NSFW:', error);
        }
      }
    }

  } catch (error) {
    logger.error('Erro na detecção automática de NSFW:', error);
  }
}