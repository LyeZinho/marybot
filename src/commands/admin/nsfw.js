import { configManager } from "../../utils/configManager.js";
import { logger } from "../../utils/logger.js";

export default {
  name: "nsfw",
  aliases: ["nsfwconfig", "content-filter"],
  description: "🔞 Configurar sistema de detecção automática NSFW",
  category: "admin",
  usage: "nsfw [status|toggle|sensitivity|whitelist] [argumentos]",
  cooldown: 3000,
  permissions: ["ManageGuild"],
  
  async execute(client, message, args) {
    try {
      const guildId = message.guild.id;
      const subcommand = args[0]?.toLowerCase();
      const guildConfig = await configManager.getConfig(guildId);

      if (!subcommand) {
        return await this.showHelp(message);
      }

      switch (subcommand) {
        case "status":
          await this.handleStatusCommand(message, guildConfig);
          break;
        case "toggle":
          await this.handleToggleCommand(message, args.slice(1), guildId);
          break;
        case "sensitivity":
          await this.handleSensitivityCommand(message, args.slice(1), guildId);
          break;
        case "whitelist":
          await this.handleWhitelistCommand(message, args.slice(1), guildId, guildConfig);
          break;
        default:
          return await this.showHelp(message);
      }

    } catch (error) {
      logger.error("Erro no comando nsfw:", error);
      
      const errorEmbed = {
        color: 0xFF0000,
        title: "❌ Erro",
        description: "Ocorreu um erro ao executar o comando. Tente novamente.",
        timestamp: new Date().toISOString()
      };

      await message.reply({ embeds: [errorEmbed] });
    }
  },

  async showHelp(message) {
    const embed = {
      color: 0x5865F2,
      title: "🔞 Sistema de Detecção NSFW",
      description: "Comandos para configurar o sistema de detecção automática NSFW:",
      fields: [
        {
          name: "📊 Status",
          value: "`nsfw status` - Ver configurações atuais",
          inline: false
        },
        {
          name: "🔄 Toggle",
          value: "`nsfw toggle <true|false>` - Ativar/desativar sistema",
          inline: false
        },
        {
          name: "🎯 Sensibilidade",
          value: "`nsfw sensitivity <0.1-1.0>` - Ajustar sensibilidade",
          inline: false
        },
        {
          name: "🏳️ Whitelist",
          value: "`nsfw whitelist <add|remove|list> [#canal/@role]` - Gerenciar whitelist",
          inline: false
        },
        {
          name: "💡 Exemplos",
          value: "• `nsfw toggle true`\n• `nsfw sensitivity 0.7`\n• `nsfw whitelist add #nsfw-permitido`",
          inline: false
        }
      ],
      footer: {
        text: "Requer permissão de Gerenciar Servidor",
        icon_url: message.client.user.displayAvatarURL()
      },
      timestamp: new Date().toISOString()
    };

    await message.reply({ embeds: [embed] });
  },

  async handleStatusCommand(message, guildConfig) {
    const nsfw = guildConfig.nsfw;
    
    const statusEmbed = {
      color: nsfw.enabled ? 0x00FF00 : 0xFF6B6B,
      title: "🔞 Status do Sistema NSFW",
      description: nsfw.enabled 
        ? "✅ Sistema de detecção NSFW está **ATIVO**" 
        : "❌ Sistema de detecção NSFW está **DESATIVADO**",
      fields: [
        {
          name: "⚙️ Configurações Gerais",
          value: `**Status:** ${nsfw.enabled ? "🟢 Ativado" : "🔴 Desativado"}\n` +
                 `**Modo Rigoroso:** ${nsfw.strictMode ? "🔴 Ativado" : "🟡 Desativado"}\n` +
                 `**Sensibilidade:** ${Math.round(nsfw.sensitivity * 100)}%`,
          inline: true
        },
        {
          name: "🎯 Ações Automáticas",
          value: `**Deletar Mensagem:** ${nsfw.deleteMessage ? "✅" : "❌"}\n` +
                 `**Enviar Aviso:** ${nsfw.sendWarning ? "✅" : "❌"}\n` +
                 `**Punição:** ${this.getPunishmentLabel(nsfw.punishment)}`,
          inline: true
        },
        {
          name: "🏳️ Whitelist",
          value: `**Canais Liberados:** ${nsfw.whitelistedChannels.length}\n` +
                 `**Roles Isentas:** ${nsfw.whitelistedRoles.length}`,
          inline: true
        }
      ],
      footer: {
        text: "Use os subcomandos para configurar o sistema",
        icon_url: message.client.user.displayAvatarURL()
      },
      timestamp: new Date().toISOString()
    };

    await message.reply({ embeds: [statusEmbed] });
  },

  async handleToggleCommand(message, args, guildId) {
    if (args.length === 0) {
      const embed = {
        color: 0xFFFF00,
        title: "⚠️ Argumento Requerido",
        description: "Uso: `nsfw toggle <true|false>`\n\nExemplo: `nsfw toggle true`"
      };
      return await message.reply({ embeds: [embed] });
    }

    const enabled = args[0].toLowerCase() === 'true' || args[0].toLowerCase() === 'on' || args[0] === '1';
    const disabled = args[0].toLowerCase() === 'false' || args[0].toLowerCase() === 'off' || args[0] === '0';

    if (!enabled && !disabled) {
      const embed = {
        color: 0xFF0000,
        title: "❌ Valor Inválido",
        description: "Use `true` ou `false` para ativar/desativar o sistema."
      };
      return await message.reply({ embeds: [embed] });
    }

    const success = await configManager.updateConfig(guildId, "nsfwEnabled", enabled);

    if (success) {
      const embed = {
        color: enabled ? 0x00FF00 : 0xFF6B6B,
        title: "🔞 Sistema NSFW Atualizado",
        description: enabled 
          ? "✅ Sistema de detecção NSFW foi **ATIVADO**\n\n" +
            "O bot agora irá analisar automaticamente todas as imagens enviadas no servidor e tomar ações baseadas na configuração atual."
          : "❌ Sistema de detecção NSFW foi **DESATIVADO**\n\n" +
            "O bot não irá mais analisar imagens automaticamente.",
        timestamp: new Date().toISOString()
      };

      await message.reply({ embeds: [embed] });
      
      logger.info(`Sistema NSFW ${enabled ? 'ativado' : 'desativado'} no servidor ${guildId}`);
    } else {
      throw new Error("Falha ao atualizar configuração");
    }
  },

  async handleSensitivityCommand(message, args, guildId) {
    if (args.length === 0) {
      const embed = {
        color: 0xFFFF00,
        title: "⚠️ Argumento Requerido",
        description: "Uso: `nsfw sensitivity <0.1-1.0>`\n\nExemplo: `nsfw sensitivity 0.7`"
      };
      return await message.reply({ embeds: [embed] });
    }

    const sensitivity = parseFloat(args[0]);
    
    if (isNaN(sensitivity) || sensitivity < 0.1 || sensitivity > 1.0) {
      const embed = {
        color: 0xFF0000,
        title: "❌ Valor Inválido",
        description: "A sensibilidade deve ser um número entre 0.1 e 1.0\n\n" +
                     "• 0.1-0.3: Baixa (apenas conteúdo explícito)\n" +
                     "• 0.4-0.6: Média (conteúdo sugestivo)\n" +
                     "• 0.7-1.0: Alta (muito rigoroso)"
      };
      return await message.reply({ embeds: [embed] });
    }

    const success = await configManager.updateConfig(guildId, "nsfwSensitivity", sensitivity);

    if (success) {
      const embed = {
        color: 0x5865F2,
        title: "🎯 Sensibilidade Atualizada",
        description: `Sensibilidade da detecção NSFW definida para **${Math.round(sensitivity * 100)}%**\n\n` +
                     this.getSensitivityDescription(sensitivity),
        timestamp: new Date().toISOString()
      };

      await message.reply({ embeds: [embed] });
    } else {
      throw new Error("Falha ao atualizar sensibilidade");
    }
  },

  async handleWhitelistCommand(message, args, guildId, guildConfig) {
    if (args.length === 0) {
      const embed = {
        color: 0xFFFF00,
        title: "⚠️ Comando Incompleto",
        description: "Uso:\n" +
                     "• `nsfw whitelist add #canal` - Adicionar canal\n" +
                     "• `nsfw whitelist add @role` - Adicionar role\n" +
                     "• `nsfw whitelist remove #canal` - Remover canal\n" +
                     "• `nsfw whitelist remove @role` - Remover role\n" +
                     "• `nsfw whitelist list` - Ver whitelist atual"
      };
      return await message.reply({ embeds: [embed] });
    }

    const action = args[0].toLowerCase();
    
    switch (action) {
      case "list":
        await this.listWhitelist(message, guildConfig);
        break;
      case "add":
        await this.addToWhitelist(message, args.slice(1), guildId);
        break;
      case "remove":
        await this.removeFromWhitelist(message, args.slice(1), guildId);
        break;
      default:
        const embed = {
          color: 0xFF0000,
          title: "❌ Ação Inválida",
          description: "Use `add`, `remove` ou `list`"
        };
        await message.reply({ embeds: [embed] });
    }
  },

  async listWhitelist(message, guildConfig) {
    const channels = guildConfig.nsfw.whitelistedChannels;
    const roles = guildConfig.nsfw.whitelistedRoles;
    
    const embed = {
      color: 0x5865F2,
      title: "🏳️ Whitelist NSFW",
      description: "Canais e roles isentos da detecção automática NSFW:",
      fields: [
        {
          name: "📍 Canais Liberados",
          value: channels.length > 0 
            ? channels.map(id => `<#${id}>`).join("\n")
            : "Nenhum canal na whitelist",
          inline: true
        },
        {
          name: "👥 Roles Isentas",
          value: roles.length > 0
            ? roles.map(id => `<@&${id}>`).join("\n")
            : "Nenhuma role na whitelist",
          inline: true
        }
      ],
      timestamp: new Date().toISOString()
    };
      
    await message.reply({ embeds: [embed] });
  },

  async addToWhitelist(message, args, guildId) {
    if (args.length === 0) {
      const embed = {
        color: 0xFFFF00,
        title: "⚠️ Mencione um Canal ou Role",
        description: "Exemplo: `nsfw whitelist add #canal` ou `nsfw whitelist add @role`"
      };
      return await message.reply({ embeds: [embed] });
    }

    const mention = args[0];
    let id, type, name;

    // Verificar se é canal
    if (mention.startsWith('<#') && mention.endsWith('>')) {
      id = mention.slice(2, -1);
      type = 'channel';
      name = `<#${id}>`;
      
      const channel = message.guild.channels.cache.get(id);
      if (!channel) {
        const embed = {
          color: 0xFF0000,
          title: "❌ Canal Não Encontrado",
          description: "O canal mencionado não foi encontrado neste servidor."
        };
        return await message.reply({ embeds: [embed] });
      }
    }
    // Verificar se é role
    else if (mention.startsWith('<@&') && mention.endsWith('>')) {
      id = mention.slice(3, -1);
      type = 'role';
      name = `<@&${id}>`;
      
      const role = message.guild.roles.cache.get(id);
      if (!role) {
        const embed = {
          color: 0xFF0000,
          title: "❌ Role Não Encontrada",
          description: "A role mencionada não foi encontrada neste servidor."
        };
        return await message.reply({ embeds: [embed] });
      }
    }
    else {
      const embed = {
        color: 0xFF0000,
        title: "❌ Menção Inválida",
        description: "Mencione um canal (#canal) ou role (@role) válido."
      };
      return await message.reply({ embeds: [embed] });
    }

    const configKey = type === 'channel' ? 'nsfwWhitelistedChannels' : 'nsfwWhitelistedRoles';
    const guildConfig = await configManager.getConfig(guildId);
    const currentList = guildConfig.nsfw[type === 'channel' ? 'whitelistedChannels' : 'whitelistedRoles'];
    
    if (currentList.includes(id)) {
      const embed = {
        color: 0xFF6B6B,
        title: "ℹ️ Já Na Whitelist",
        description: `${name} já está na whitelist.`
      };
      return await message.reply({ embeds: [embed] });
    }
    
    const newList = [...currentList, id];
    const success = await configManager.updateConfig(guildId, configKey, newList);
    
    if (success) {
      const embed = {
        color: 0x00FF00,
        title: "✅ Whitelist Atualizada",
        description: `${name} foi adicionado à whitelist NSFW.\n\n` +
                     `${type === 'channel' ? 'Este canal' : 'Usuários com esta role'} estão agora isentos da detecção automática NSFW.`,
        timestamp: new Date().toISOString()
      };
        
      await message.reply({ embeds: [embed] });
    } else {
      throw new Error("Falha ao atualizar whitelist");
    }
  },

  async removeFromWhitelist(message, args, guildId) {
    if (args.length === 0) {
      const embed = {
        color: 0xFFFF00,
        title: "⚠️ Mencione um Canal ou Role",
        description: "Exemplo: `nsfw whitelist remove #canal` ou `nsfw whitelist remove @role`"
      };
      return await message.reply({ embeds: [embed] });
    }

    const mention = args[0];
    let id, type, name;

    // Verificar se é canal
    if (mention.startsWith('<#') && mention.endsWith('>')) {
      id = mention.slice(2, -1);
      type = 'channel';
      name = `<#${id}>`;
    }
    // Verificar se é role
    else if (mention.startsWith('<@&') && mention.endsWith('>')) {
      id = mention.slice(3, -1);
      type = 'role';
      name = `<@&${id}>`;
    }
    else {
      const embed = {
        color: 0xFF0000,
        title: "❌ Menção Inválida",
        description: "Mencione um canal (#canal) ou role (@role) válido."
      };
      return await message.reply({ embeds: [embed] });
    }

    const configKey = type === 'channel' ? 'nsfwWhitelistedChannels' : 'nsfwWhitelistedRoles';
    const guildConfig = await configManager.getConfig(guildId);
    const currentList = guildConfig.nsfw[type === 'channel' ? 'whitelistedChannels' : 'whitelistedRoles'];
    
    if (!currentList.includes(id)) {
      const embed = {
        color: 0xFF6B6B,
        title: "ℹ️ Não Na Whitelist",
        description: `${name} não está na whitelist.`
      };
      return await message.reply({ embeds: [embed] });
    }
    
    const newList = currentList.filter(item => item !== id);
    const success = await configManager.updateConfig(guildId, configKey, newList);
    
    if (success) {
      const embed = {
        color: 0xFF6B6B,
        title: "🗑️ Whitelist Atualizada",
        description: `${name} foi removido da whitelist NSFW.\n\n` +
                     `${type === 'channel' ? 'Este canal' : 'Usuários com esta role'} agora estão sujeitos à detecção automática NSFW.`,
        timestamp: new Date().toISOString()
      };
        
      await message.reply({ embeds: [embed] });
    } else {
      throw new Error("Falha ao atualizar whitelist");
    }
  },

  // Funções auxiliares
  getPunishmentLabel(punishment) {
    const labels = {
      none: "Nenhuma",
      timeout: "Timeout (10min)",
      kick: "Expulsar",
      ban: "Banir"
    };
    return labels[punishment] || "Desconhecida";
  },

  getSensitivityDescription(sensitivity) {
    if (sensitivity <= 0.3) {
      return "🟢 **Baixa** - Detecta apenas conteúdo explicitamente NSFW";
    } else if (sensitivity <= 0.6) {
      return "🟡 **Média** - Detecta conteúdo sugestivo e explícito";
    } else if (sensitivity <= 0.8) {
      return "🟠 **Alta** - Detecta conteúdo levemente sugestivo";
    } else {
      return "🔴 **Máxima** - Muito rigoroso, pode gerar falsos positivos";
    }
  }
};