// Comando para configurar e gerenciar canais de voz extensíveis
import { voiceManager } from '../../game/voiceManager.js';
import { configManager } from '../../utils/configManager.js';
import { ChannelType, PermissionFlagsBits } from 'discord.js';
import config from '../../config.js';

export default {
  name: "voice",
  aliases: ["voz", "vc", "voicechannel"],
  description: "Configura e gerencia canais de voz extensíveis que se expandem automaticamente.",
  category: "admin",
  usage: "voice [setup|status|cleanup|help] [opções]",
  cooldown: 5000,
  permissions: ["ManageChannels"],
  
  async execute(client, message, args) {
    try {
      // Verificar se o comando foi usado em um servidor
      if (!message.guild) {
        return message.reply('❌ Este comando só pode ser usado em servidores!');
      }

      const action = args[0]?.toLowerCase();
      
      // Roteamento de subcomandos
      switch (action) {
        case 'setup':
        case 'configurar':
          return await this.setupVoiceSystem(message, args.slice(1));
        
        case 'status':
        case 'info':
          return await this.showStatus(message);
        
        case 'cleanup':
        case 'limpar':
          return await this.cleanupChannels(message, args.slice(1));
        
        case 'test':
        case 'teste':
          return await this.testSystem(message);
        
        case 'help':
        case 'ajuda':
        default:
          return await this.showHelp(message);
      }
      
    } catch (error) {
      console.error('Erro no comando voice:', error);
      
      const errorEmbed = {
        color: config.colors.error,
        title: '❌ Erro no Comando Voice',
        description: `Ocorreu um erro inesperado.\n**Erro:** ${error.message}`,
      };
      
      await message.reply({ embeds: [errorEmbed] });
    }
  },

  async setupVoiceSystem(message, args) {
    const guildConfig = await configManager.getConfig(message.guild.id);
    
    // Se não há argumentos, mostrar configuração atual
    if (args.length === 0) {
      return await this.showCurrentConfig(message, guildConfig);
    }

    const channelInput = args[0];
    
    // Verificar se foi mencionado um canal ou é um ID direto
    const channelId = channelInput.replace(/[<#>]/g, '');
    
    // Validar se o ID é um número válido
    if (!/^\d+$/.test(channelId)) {
      return message.reply('❌ ID de canal inválido! Use uma menção de canal (#canal) ou um ID numérico válido.');
    }
    
    const channel = message.guild.channels.cache.get(channelId);
    
    if (!channel) {
      return message.reply('❌ Canal não encontrado! Use uma menção de canal ou o ID do canal.\nEx: `m.voice setup #🎤-Auto-Create` ou `m.voice setup 963393024086392916`');
    }

    if (channel.type !== ChannelType.GuildVoice) {
      return message.reply('❌ O canal mencionado deve ser um canal de voz!');
    }

    // Verificar permissões do bot no canal
    const botPermissions = channel.permissionsFor(message.guild.members.me);
    const requiredPerms = [
      PermissionFlagsBits.ViewChannel,
      PermissionFlagsBits.Connect,
      PermissionFlagsBits.ManageChannels,
      PermissionFlagsBits.MoveMembers
    ];

    const missingPerms = requiredPerms.filter(perm => !botPermissions.has(perm));
    if (missingPerms.length > 0) {
      return message.reply('❌ O bot precisa das seguintes permissões no canal:\n' + 
        '• Ver Canal\n• Conectar\n• Gerenciar Canais\n• Mover Membros');
    }

    try {
      // Configurar no sistema de config
      await configManager.set(message.guild.id, 'voiceSettings.enabled', true);
      await configManager.set(message.guild.id, 'voiceSettings.parentChannelId', channel.id);

      // Configurar no VoiceManager
      const result = await voiceManager.setupParentChannel(message.guild.id, channel.id);
      
      if (result.success) {
        const successEmbed = {
          color: config.colors.success,
          title: '✅ Sistema de Voz Configurado!',
          description: `O canal ${channel} foi configurado como canal extensível.`,
          fields: [
            {
              name: '🎤 Como Funciona',
              value: '• Quando alguém entrar no canal, será criado automaticamente um novo canal\n• O usuário será movido para o canal criado\n• Canais vazios são limpos automaticamente',
              inline: false
            },
            {
              name: '⚙️ Configurações Avançadas',
              value: `Use \`m.config\` para personalizar:
• \`voiceSettings.channelNameTemplate\` - Nome dos canais
• \`voiceSettings.userLimit\` - Limite de usuários
• \`voiceSettings.deleteWhenEmpty\` - Auto-deletar
• \`voiceSettings.emptyTimeout\` - Tempo para deletar`,
              inline: false
            },
            {
              name: '🔧 Comandos Úteis',
              value: '• `m.voice status` - Ver status do sistema\n• `m.voice cleanup` - Limpar canais órfãos\n• `m.voice test` - Testar funcionalidade',
              inline: false
            }
          ]
        };

        await message.reply({ embeds: [successEmbed] });
      } else {
        await message.reply(`❌ Erro ao configurar: ${result.error}`);
      }

    } catch (error) {
      console.error('Erro ao configurar sistema de voz:', error);
      await message.reply(`❌ Erro ao configurar sistema: ${error.message}`);
    }
  },

  async showCurrentConfig(message, guildConfig) {
    const voiceConfig = guildConfig.voiceSettings || {};
    
    const embed = {
      color: voiceConfig.enabled ? config.colors.success : config.colors.warning,
      title: '⚙️ Configuração Atual - Sistema de Voz',
      fields: [
        {
          name: '📊 Status',
          value: voiceConfig.enabled ? '✅ Ativado' : '❌ Desativado',
          inline: true
        },
        {
          name: '🎤 Canal Pai',
          value: voiceConfig.parentChannelId ? 
            `<#${voiceConfig.parentChannelId}>` : 
            '❌ Não configurado',
          inline: true
        },
        {
          name: '📝 Template de Nome',
          value: `\`${voiceConfig.channelNameTemplate || '🎤 Canal #{number}'}\``,
          inline: true
        },
        {
          name: '👥 Limite de Usuários',
          value: voiceConfig.userLimit || 'Sem limite',
          inline: true
        },
        {
          name: '🎵 Bitrate',
          value: `${voiceConfig.bitrate || 64000} bps`,
          inline: true
        },
        {
          name: '🗑️ Auto-deletar',
          value: voiceConfig.deleteWhenEmpty ? '✅ Sim' : '❌ Não',
          inline: true
        }
      ]
    };

    if (!voiceConfig.enabled) {
      embed.description = 'Use `m.voice setup #canal` para configurar um canal extensível.';
    }

    await message.reply({ embeds: [embed] });
  },

  async showStatus(message) {
    const stats = voiceManager.getStats();
    const activeChannels = voiceManager.getGuildActiveChannels(message.guild.id);
    
    const embed = {
      color: config.colors.primary,
      title: '📊 Status do Sistema de Voz',
      fields: [
        {
          name: '🌐 Estatísticas Globais',
          value: `**Servidores Ativos:** ${stats.activeGuilds}
**Total de Canais:** ${stats.totalChannels}
**Canais na Fila:** ${stats.queuedChannels}
**Usuários Ativos:** ${stats.activeUsers}`,
          inline: true
        },
        {
          name: '🏠 Este Servidor',
          value: `**Canais Criados:** ${activeChannels.length}
**Sistema:** ${stats.isInitialized ? '✅ Online' : '❌ Offline'}`,
          inline: true
        }
      ]
    };

    if (activeChannels.length > 0) {
      const channelList = activeChannels.slice(0, 5).map(ch => {
        const channel = message.guild.channels.cache.get(ch.channelId);
        const memberCount = channel ? channel.members.size : 0;
        return `<#${ch.channelId}> (${memberCount} usuário${memberCount !== 1 ? 's' : ''})`;
      }).join('\n');

      embed.fields.push({
        name: '🎤 Canais Ativos',
        value: channelList + (activeChannels.length > 5 ? `\n... e mais ${activeChannels.length - 5}` : ''),
        inline: false
      });
    }

    await message.reply({ embeds: [embed] });
  },

  async cleanupChannels(message, args) {
    const isForced = args.includes('--force') || args.includes('-f');
    
    if (!isForced) {
      const confirmEmbed = {
        color: config.colors.warning,
        title: '⚠️ Confirmar Limpeza',
        description: 'Isso irá deletar todos os canais de voz temporários criados pelo sistema.',
        fields: [
          {
            name: '🔥 Ação Destrutiva',
            value: 'Esta ação não pode ser desfeita!',
            inline: false
          },
          {
            name: '✅ Para Confirmar',
            value: 'Use `m.voice cleanup --force`',
            inline: false
          }
        ]
      };

      return await message.reply({ embeds: [confirmEmbed] });
    }

    try {
      await voiceManager.emergencyCleanup(message.guild.id);
      
      const successEmbed = {
        color: config.colors.success,
        title: '🧹 Limpeza Concluída',
        description: 'Todos os canais de voz temporários foram removidos.',
      };

      await message.reply({ embeds: [successEmbed] });

    } catch (error) {
      console.error('Erro na limpeza:', error);
      await message.reply(`❌ Erro durante a limpeza: ${error.message}`);
    }
  },

  async testSystem(message) {
    const guildConfig = await configManager.getConfig(message.guild.id);
    const voiceConfig = guildConfig.voiceSettings || {};
    
    if (!voiceConfig.enabled || !voiceConfig.parentChannelId) {
      return message.reply('❌ Sistema de voz não está configurado! Use `m.voice setup` primeiro.');
    }

    const parentChannel = message.guild.channels.cache.get(voiceConfig.parentChannelId);
    if (!parentChannel) {
      return message.reply('❌ Canal pai não encontrado! Reconfigure o sistema.');
    }

    // Verificar permissões
    const botMember = message.guild.members.me;
    const permissions = parentChannel.permissionsFor(botMember);
    
    const testResults = [];
    
    // Teste 1: Canal existe
    testResults.push({
      name: '🎤 Canal Pai',
      value: `✅ ${parentChannel.name}`,
      inline: true
    });

    // Teste 2: Permissões
    const requiredPerms = ['ViewChannel', 'Connect', 'ManageChannels', 'MoveMembers'];
    const hasAllPerms = requiredPerms.every(perm => permissions.has(PermissionFlagsBits[perm]));
    
    testResults.push({
      name: '🔐 Permissões',
      value: hasAllPerms ? '✅ Todas OK' : '❌ Permissões em falta',
      inline: true
    });

    // Teste 3: Sistema inicializado
    testResults.push({
      name: '⚙️ Sistema',
      value: voiceManager.isInitialized ? '✅ Inicializado' : '❌ Não inicializado',
      inline: true
    });

    const embed = {
      color: hasAllPerms && voiceManager.isInitialized ? config.colors.success : config.colors.warning,
      title: '🔍 Teste do Sistema de Voz',
      description: 'Resultados dos testes de funcionalidade:',
      fields: testResults
    };

    if (hasAllPerms && voiceManager.isInitialized) {
      embed.fields.push({
        name: '✅ Sistema Pronto',
        value: 'Entre no canal pai para testar a criação automática!',
        inline: false
      });
    }

    await message.reply({ embeds: [embed] });
  },

  async showHelp(message) {
    const embed = {
      color: config.colors.primary,
      title: '🎤 Sistema de Canais de Voz Extensíveis',
      description: 'Cria automaticamente novos canais quando usuários entram no canal configurado!',
      fields: [
        {
          name: '📋 Comandos Disponíveis',
          value: `\`m.voice setup #canal\` - Configura canal extensível
\`m.voice status\` - Mostra status do sistema
\`m.voice cleanup\` - Remove canais temporários
\`m.voice test\` - Testa funcionalidade do sistema`,
          inline: false
        },
        {
          name: '⚙️ Configuração Avançada',
          value: `Use \`m.config set\` para personalizar:
• \`voiceSettings.channelNameTemplate\` - Nome dos canais
• \`voiceSettings.userLimit\` - Limite de usuários por canal
• \`voiceSettings.deleteWhenEmpty\` - Auto-deletar canais vazios
• \`voiceSettings.emptyTimeout\` - Tempo para deletar (ms)
• \`voiceSettings.giveCreatorPermissions\` - Permissões do criador`,
          inline: false
        },
        {
          name: '🎯 Como Funciona',
          value: '1. Configure um canal de voz como "pai"\n2. Quando alguém entrar nele, um novo canal é criado\n3. O usuário é automaticamente movido para o novo canal\n4. Canais vazios são limpos automaticamente',
          inline: false
        },
        {
          name: '💡 Dicas',
          value: '• Use templates como "🎤 Sala de {user}" ou "📞 Canal #{number}"\n• Configure permissões específicas por role\n• Monitore o status regularmente',
          inline: false
        }
      ],
      footer: {
        text: 'Requer permissão: Gerenciar Canais'
      }
    };

    await message.reply({ embeds: [embed] });
  }
};