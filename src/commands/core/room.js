// Comando para criar salas temporárias (threads) que se auto-destroem
import { threadManager } from '../../game/threadManager.js';
import { configManager } from '../../utils/configManager.js';
import config from '../../config.js';

export default {
  name: "room",
  aliases: ["sala", "thread", "private"],
  description: "Gerencia salas temporárias (threads) que se apagam automaticamente por inatividade.",
  category: "core",
  usage: "room [create|invite|extend|close|list] [opções]",
  cooldown: 5000,
  
  async execute(client, message, args) {
    try {
      // Verificar se o comando foi usado em um servidor
      if (!message.guild) {
        return message.reply('❌ Este comando só pode ser usado em servidores!');
      }

      const action = args[0]?.toLowerCase();
      
      // Roteamento de subcomandos
      switch (action) {
        case 'create':
        case 'criar':
        case undefined: // Comando sem argumentos = criar
          return await this.createRoom(message, args.slice(1));
        
        case 'invite':
        case 'convidar':
          return await this.inviteToRoom(message, args.slice(1));
        
        case 'extend':
        case 'estender':
          return await this.extendRoom(message, args.slice(1));
        
        case 'close':
        case 'fechar':
          return await this.closeRoom(message, args.slice(1));
        
        case 'list':
        case 'lista':
          return await this.listRooms(message);
        
        case 'help':
        case 'ajuda':
          return await this.showHelp(message);
        
        default:
          // Se não for um subcomando conhecido, tratar como nome da sala
          return await this.createRoom(message, args);
      }
      
    } catch (error) {
      console.error('Erro no comando room:', error);
      
      const errorEmbed = {
        color: config.colors.error,
        title: '❌ Erro no Comando Room',
        description: `Ocorreu um erro inesperado.\n**Erro:** ${error.message}`,
      };
      
      await message.reply({ embeds: [errorEmbed] });
    }
  },

  async createRoom(message, args) {
    try {
      // Verificar se o canal suporta threads
      if (!message.channel.isTextBased() || message.channel.isThread()) {
        return message.reply('❌ Não é possível criar threads neste tipo de canal!');
      }

      // Obter configurações do servidor
      const guildConfig = await configManager.getConfig(message.guild.id);
      const roomConfig = guildConfig.roomSettings || {};      // Verificar permissões
      if (roomConfig.requiredRole && !message.member.roles.cache.has(roomConfig.requiredRole)) {
        return message.reply('❌ Você não tem permissão para criar salas temporárias!');
      }

      // Verificar limite de salas por usuário
      const userRooms = threadManager.getUserActiveRooms(message.author.id, message.guild.id);
      const maxRoomsPerUser = roomConfig.maxRoomsPerUser || 3;
      
      if (userRooms >= maxRoomsPerUser) {
        return message.reply(`❌ Você já atingiu o limite de ${maxRoomsPerUser} sala(s) ativa(s)!`);
      }

      // Obter nome da sala
      let roomName = args.join(' ');
      if (!roomName) {
        roomName = `🏠 Sala de ${message.member.displayName}`;
      }

      // Limitar tamanho do nome
      if (roomName.length > 100) {
        roomName = roomName.substring(0, 97) + '...';
      }

      // Obter duração (em minutos)
      const durationMatch = roomName.match(/(\d+)\s*min/i);
      let duration = roomConfig.defaultTimeout || 30; // 30 minutos padrão
      
      if (durationMatch) {
        const requestedDuration = parseInt(durationMatch[1]);
        const maxDuration = roomConfig.maxTimeout || 480; // 8 horas máximo
        const minDuration = roomConfig.minTimeout || 5; // 5 minutos mínimo
        
        if (requestedDuration >= minDuration && requestedDuration <= maxDuration) {
          duration = requestedDuration;
          // Remover a especificação de tempo do nome
          roomName = roomName.replace(/\s*\d+\s*min/i, '').trim();
        }
      }

      // Mostrar que está criando a sala
      const creatingEmbed = {
        color: config.colors.primary,
        title: '🏗️ Criando Sala Temporária...',
        description: `${config.emojis.loading} Aguarde um momento...`,
      };
      
      const tempMessage = await message.reply({ embeds: [creatingEmbed] });

      // Criar thread
      const thread = await message.channel.threads.create({
        name: roomName,
        autoArchiveDuration: 60, // Auto-arquivar em 1 hora se não houver atividade
        type: 11, // GUILD_PRIVATE_THREAD para salas privadas
        reason: `Sala temporária criada por ${message.author.tag}`
      });

      // Adicionar o criador à thread
      await thread.members.add(message.author.id);

      // Registrar no gerenciador de threads
      await threadManager.registerRoom(thread, {
        creatorId: message.author.id,
        guildId: message.guild.id,
        duration: duration,
        createdAt: Date.now()
      });

      // Mensagem inicial na thread
      const welcomeEmbed = {
        color: config.colors.success,
        title: '🎉 Sala Temporária Criada!',
        description: `Bem-vindo à sua sala privada, ${message.member.displayName}!`,
        fields: [
          {
            name: '⏰ Duração',
            value: `${duration} minuto(s)`,
            inline: true
          },
          {
            name: '🔧 Comandos',
            value: '• `m.room invite @usuário` - Convidar alguém\n• `m.room extend` - Estender tempo (se permitido)\n• `m.room close` - Fechar sala',
            inline: false
          },
          {
            name: '⚠️ Aviso',
            value: `Esta sala será automaticamente apagada após ${duration} minutos de inatividade.`,
            inline: false
          }
        ],
        footer: {
          text: 'Envie uma mensagem para resetar o timer de inatividade!'
        }
      };

      await thread.send({ embeds: [welcomeEmbed] });

      // Atualizar mensagem original
      const successEmbed = {
        color: config.colors.success,
        title: '✅ Sala Criada com Sucesso!',
        description: `Sua sala temporária foi criada: ${thread}`,
        fields: [
          {
            name: '📋 Detalhes',
            value: `**Nome:** ${roomName}\n**Duração:** ${duration} minuto(s)\n**Tipo:** Privada`,
            inline: true
          },
          {
            name: '💡 Dica',
            value: 'Use `m.room invite @usuário` dentro da thread para convidar outras pessoas!',
            inline: false
          }
        ]
      };

      await tempMessage.edit({ embeds: [successEmbed] });

    } catch (error) {
      console.error('Erro ao criar sala temporária:', error);
      
      const errorEmbed = {
        color: config.colors.error,
        title: '❌ Erro ao Criar Sala',
        description: `Não foi possível criar a sala temporária.\n**Erro:** ${error.message}`,
      };
      
      await message.reply({ embeds: [errorEmbed] });
    }
  },

  async inviteToRoom(message, args) {
    // Verificar se está em uma thread
    if (!message.channel.isThread()) {
      return message.reply('❌ Este comando só pode ser usado dentro de uma sala temporária!');
    }

    // Verificar se a thread está registrada no sistema
    const roomData = threadManager.activeRooms.get(message.channel.id);
    if (!roomData) {
      return message.reply('❌ Esta não é uma sala temporária gerenciada pelo bot!');
    }

    // Verificar se é o criador da sala
    if (roomData.creatorId !== message.author.id) {
      return message.reply('❌ Apenas o criador da sala pode convidar pessoas!');
    }

    // Verificar se foi mencionado um usuário
    const targetUser = message.mentions.users.first();
    if (!targetUser) {
      return message.reply('❌ Mencione um usuário para convidar! Ex: `m.room invite @usuário`');
    }

    // Verificar se o usuário não é um bot
    if (targetUser.bot) {
      return message.reply('❌ Não é possível convidar bots para salas temporárias!');
    }

    try {
      // Adicionar usuário à thread
      const success = await threadManager.addMemberToRoom(message.channel.id, targetUser.id);
      
      if (success) {
        const inviteEmbed = {
          color: config.colors.success,
          title: '✅ Usuário Convidado',
          description: `${targetUser} foi convidado para a sala temporária!`,
          fields: [
            {
              name: '👋 Bem-vindo!',
              value: `${targetUser}, você foi convidado por ${message.author} para esta sala privada.`,
              inline: false
            }
          ]
        };

        await message.reply({ embeds: [inviteEmbed] });
      } else {
        await message.reply('❌ Erro ao convidar usuário. Tente novamente.');
      }

    } catch (error) {
      console.error('Erro ao convidar usuário:', error);
      await message.reply(`❌ Erro ao convidar usuário: ${error.message}`);
    }
  },

  async extendRoom(message, args) {
    // Verificar se está em uma thread
    if (!message.channel.isThread()) {
      return message.reply('❌ Este comando só pode ser usado dentro de uma sala temporária!');
    }

    // Verificar se a thread está registrada no sistema
    const roomData = threadManager.activeRooms.get(message.channel.id);
    if (!roomData) {
      return message.reply('❌ Esta não é uma sala temporária gerenciada pelo bot!');
    }

    // Verificar se é o criador da sala
    if (roomData.creatorId !== message.author.id) {
      return message.reply('❌ Apenas o criador da sala pode estender o tempo!');
    }

    // Obter configurações do servidor
    const guildConfig = await configManager.getConfig(message.guild.id);
    const roomConfig = guildConfig.roomSettings || {};

    if (!roomConfig.allowExtension) {
      return message.reply('❌ Extensão de tempo não está permitida neste servidor!');
    }

    // Obter tempo de extensão
    const extensionTime = parseInt(args[0]) || 30;
    const maxExtension = roomConfig.maxExtension || 60;

    if (extensionTime > maxExtension) {
      return message.reply(`❌ Tempo de extensão máximo permitido: ${maxExtension} minutos.`);
    }

    try {
      const result = await threadManager.extendRoom(message.channel.id, extensionTime);

      if (result.success) {
        const extendEmbed = {
          color: config.colors.success,
          title: '⏰ Sala Estendida',
          description: `Tempo da sala estendido em ${extensionTime} minutos!`,
          fields: [
            {
              name: '📊 Nova Duração',
              value: `${result.newDuration} minutos total`,
              inline: true
            }
          ]
        };

        await message.reply({ embeds: [extendEmbed] });
      } else {
        await message.reply(`❌ ${result.reason}`);
      }

    } catch (error) {
      console.error('Erro ao estender sala:', error);
      await message.reply(`❌ Erro ao estender sala: ${error.message}`);
    }
  },

  async closeRoom(message, args) {
    // Verificar se está em uma thread
    if (!message.channel.isThread()) {
      return message.reply('❌ Este comando só pode ser usado dentro de uma sala temporária!');
    }

    // Verificar se a thread está registrada no sistema
    const roomData = threadManager.activeRooms.get(message.channel.id);
    if (!roomData) {
      return message.reply('❌ Esta não é uma sala temporária gerenciada pelo bot!');
    }

    // Verificar se é o criador da sala ou tem permissões
    const hasPermission = roomData.creatorId === message.author.id || 
                         message.member.permissions.has('ManageThreads') ||
                         message.member.permissions.has('ManageChannels');

    if (!hasPermission) {
      return message.reply('❌ Apenas o criador da sala ou moderadores podem fechá-la!');
    }

    try {
      const confirmEmbed = {
        color: config.colors.warning,
        title: '⚠️ Confirmar Fechamento',
        description: 'Tem certeza que deseja fechar esta sala temporária?',
        footer: {
          text: 'A sala será fechada automaticamente em 10 segundos se não houver resposta.'
        }
      };

      const confirmMessage = await message.reply({ embeds: [confirmEmbed] });

      // Aguardar confirmação ou fechar automaticamente
      setTimeout(async () => {
        await threadManager.closeRoom(message.channel.id, 'Fechada manualmente');
      }, 10000);

    } catch (error) {
      console.error('Erro ao fechar sala:', error);
      await message.reply(`❌ Erro ao fechar sala: ${error.message}`);
    }
  },

  async listRooms(message) {
    const activeRooms = threadManager.getGuildActiveRooms(message.guild.id);

    if (activeRooms.length === 0) {
      return message.reply('📭 Não há salas temporárias ativas neste servidor.');
    }

    const embed = {
      color: config.colors.primary,
      title: '🏠 Salas Temporárias Ativas',
      description: `${activeRooms.length} sala(s) ativa(s) no servidor`,
      fields: []
    };

    for (const room of activeRooms.slice(0, 10)) { // Limitar a 10 salas
      const creator = await message.guild.members.fetch(room.creatorId).catch(() => null);
      const timeActive = Date.now() - room.createdAt;
      const timeRemaining = (room.duration * 60 * 1000) - (Date.now() - room.lastActivity);

      embed.fields.push({
        name: `🏠 <#${room.threadId}>`,
        value: `**Criador:** ${creator?.displayName || 'Desconhecido'}
**Membros:** ${room.members.size}
**Tempo Restante:** ${Math.max(0, Math.ceil(timeRemaining / 60000))} min`,
        inline: true
      });
    }

    if (activeRooms.length > 10) {
      embed.footer = {
        text: `Mostrando 10 de ${activeRooms.length} salas ativas`
      };
    }

    await message.reply({ embeds: [embed] });
  },

  async showHelp(message) {
    const embed = {
      color: config.colors.primary,
      title: '🏠 Sistema de Salas Temporárias',
      description: 'Crie salas privadas que se auto-destroem por inatividade!',
      fields: [
        {
          name: '📋 Comandos Disponíveis',
          value: `\`m.room\` ou \`m.room create [nome]\` - Criar nova sala
\`m.room invite @usuário\` - Convidar alguém (dentro da sala)
\`m.room extend [minutos]\` - Estender tempo (dentro da sala)
\`m.room close\` - Fechar sala (dentro da sala)
\`m.room list\` - Listar salas ativas do servidor`,
          inline: false
        },
        {
          name: '⚙️ Configurações',
          value: 'Administradores podem configurar limites usando `m.config`',
          inline: true
        },
        {
          name: '💡 Dicas',
          value: '• Salas se fecham automaticamente por inatividade\n• Envie mensagens para resetar o timer\n• Threads privadas são visíveis apenas aos convidados',
          inline: false
        }
      ],
      footer: {
        text: 'Use m.room para começar!'
      }
    };

    await message.reply({ embeds: [embed] });
  }
};