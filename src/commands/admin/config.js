// Comando para gerenciar configurações do servidor
import { configManager } from "../../utils/configManager.js";

export default {
  name: "config",
  aliases: ["configuracao", "settings"],
  description: "Gerencia as configurações do servidor.",
  category: "admin",
  usage: "config [get|set|reset|list] [chave] [valor]",
  cooldown: 3000,
  permissions: ["ManageGuild"],
  
  async execute(client, message, args) {
    try {
      const guildId = message.guild.id;
      const subcommand = args[0]?.toLowerCase();
      
      if (!subcommand) {
        return await this.showHelp(message);
      }
      
      switch (subcommand) {
        case "get":
          return await this.handleGet(message, args.slice(1), guildId);
        case "set":
          return await this.handleSet(message, args.slice(1), guildId);
        case "reset":
          return await this.handleReset(message, guildId);
        case "list":
          return await this.handleList(message, guildId);
        default:
          return await this.showHelp(message);
      }
      
    } catch (error) {
      console.error("Erro no comando config:", error);
      
      const errorEmbed = {
        color: 0xff0000,
        title: "❌ Erro",
        description: "Ocorreu um erro ao gerenciar as configurações.",
      };
      
      await message.reply({ embeds: [errorEmbed] });
    }
  },
  
  async handleGet(message, args, guildId) {
    if (args.length === 0) {
      const embed = {
        color: 0xffff00,
        title: "⚠️ Configuração Requerida",
        description: "Você deve especificar uma configuração para visualizar.\n\nUse `config list` para ver todas as configurações disponíveis.",
      };
      return await message.reply({ embeds: [embed] });
    }
    
    const key = args[0];
    const value = await configManager.get(guildId, key);
    
    if (value === null) {
      const embed = {
        color: 0xff0000,
        title: "❌ Configuração Não Encontrada",
        description: `A configuração \`${key}\` não existe.\n\nUse \`config list\` para ver as configurações disponíveis.`,
      };
      return await message.reply({ embeds: [embed] });
    }
    
    const embed = {
      color: 0x5865f2,
      title: "⚙️ Configuração",
      fields: [
        {
          name: "Chave",
          value: `\`${key}\``,
          inline: true
        },
        {
          name: "Valor",
          value: `\`${this.formatValue(value)}\``,
          inline: true
        }
      ],
      footer: {
        text: `Servidor: ${message.guild.name}`
      }
    };
    
    await message.reply({ embeds: [embed] });
  },
  
  async handleSet(message, args, guildId) {
    if (args.length < 2) {
      const embed = {
        color: 0xffff00,
        title: "⚠️ Argumentos Insuficientes",
        description: "Uso: `config set <chave> <valor>`\n\nExemplo: `config set prefix !`",
      };
      return await message.reply({ embeds: [embed] });
    }
    
    const key = args[0];
    const rawValue = args.slice(1).join(" ");
    
    // Converter valor para tipo apropriado
    const value = this.parseValue(key, rawValue);
    
    const success = await configManager.set(guildId, key, value);
    
    if (success) {
      const embed = {
        color: 0x00ff00,
        title: "✅ Configuração Atualizada",
        fields: [
          {
            name: "Chave",
            value: `\`${key}\``,
            inline: true
          },
          {
            name: "Novo Valor",
            value: `\`${this.formatValue(value)}\``,
            inline: true
          }
        ],
        footer: {
          text: `Alterado por ${message.author.tag}`
        }
      };
      await message.reply({ embeds: [embed] });
    } else {
      const embed = {
        color: 0xff0000,
        title: "❌ Erro",
        description: `Não foi possível atualizar a configuração \`${key}\`.\n\nVerifique se a chave é válida e o valor está no formato correto.`,
      };
      await message.reply({ embeds: [embed] });
    }
  },
  
  async handleReset(message, guildId) {
    const success = await configManager.resetConfig(guildId);
    
    if (success) {
      const embed = {
        color: 0x00ff00,
        title: "✅ Configurações Resetadas",
        description: "Todas as configurações foram restauradas para os valores padrão.",
        footer: {
          text: `Resetado por ${message.author.tag}`
        }
      };
      await message.reply({ embeds: [embed] });
    } else {
      const embed = {
        color: 0xff0000,
        title: "❌ Erro",
        description: "Não foi possível resetar as configurações.",
      };
      await message.reply({ embeds: [embed] });
    }
  },
  
  async handleList(message, guildId) {
    const config = await configManager.getConfig(guildId);
    
    const embed = {
      color: 0x5865f2,
      title: "⚙️ Configurações do Servidor",
      description: `Configurações atuais para **${message.guild.name}**`,
      fields: [
        {
          name: "🎯 Básicas",
          value: [
            `\`prefix\`: ${config.prefix}`,
            `\`language\`: ${config.language}`,
            `\`timezone\`: ${config.timezone}`
          ].join('\n'),
          inline: false
        },
        {
          name: "🎨 Cores (hex)",
          value: [
            `\`colors.primary\`: #${config.colors.primary.toString(16).padStart(6, '0')}`,
            `\`colors.success\`: #${config.colors.success.toString(16).padStart(6, '0')}`,
            `\`colors.error\`: #${config.colors.error.toString(16).padStart(6, '0')}`,
            `\`colors.warning\`: #${config.colors.warning.toString(16).padStart(6, '0')}`
          ].join('\n'),
          inline: true
        },
        {
          name: "😀 Emojis",
          value: [
            `\`emojis.success\`: ${config.emojis.success}`,
            `\`emojis.error\`: ${config.emojis.error}`,
            `\`emojis.warning\`: ${config.emojis.warning}`,
            `\`emojis.loading\`: ${config.emojis.loading}`
          ].join('\n'),
          inline: true
        },
        {
          name: "⏱️ Cooldowns (ms)",
          value: [
            `\`cooldowns.default\`: ${config.cooldowns.default}`,
            `\`cooldowns.dungeon\`: ${config.cooldowns.dungeon}`,
            `\`cooldowns.economy\`: ${config.cooldowns.economy}`
          ].join('\n'),
          inline: false
        },
        {
          name: "💰 Economia",
          value: [
            `\`economy.dailyAmount\`: ${config.economy.dailyAmount}`,
            `\`economy.dailyCooldown\`: ${config.economy.dailyCooldown}`
          ].join('\n'),
          inline: true
        },
        {
          name: "🏰 Dungeon",
          value: [
            `\`dungeon.maxFloor\`: ${config.dungeon.maxFloor}`,
            `\`dungeon.startingHp\`: ${config.dungeon.startingHp}`,
            `\`dungeon.xpMultiplier\`: ${config.dungeon.xpMultiplier}`,
            `\`dungeon.coinMultiplier\`: ${config.dungeon.coinMultiplier}`
          ].join('\n'),
          inline: true
        },
        {
          name: "🔧 Módulos",
          value: [
            `\`commandsEnabled\`: ${config.commandsEnabled ? '✅' : '❌'}`,
            `\`dungeonEnabled\`: ${config.dungeonEnabled ? '✅' : '❌'}`,
            `\`economyEnabled\`: ${config.economyEnabled ? '✅' : '❌'}`,
            `\`animeEnabled\`: ${config.animeEnabled ? '✅' : '❌'}`
          ].join('\n'),
          inline: false
        }
      ],
      footer: {
        text: "Use 'config get <chave>' para ver valores específicos | 'config set <chave> <valor>' para alterar"
      }
    };
    
    await message.reply({ embeds: [embed] });
  },
  
  async showHelp(message) {
    const embed = {
      color: 0x5865f2,
      title: "⚙️ Comando de Configuração",
      description: "Gerencia as configurações personalizadas deste servidor.",
      fields: [
        {
          name: "📖 Subcomandos",
          value: [
            "`config list` - Lista todas as configurações",
            "`config get <chave>` - Mostra uma configuração específica",
            "`config set <chave> <valor>` - Altera uma configuração",
            "`config reset` - Reseta todas as configurações"
          ].join('\n'),
          inline: false
        },
        {
          name: "💡 Exemplos",
          value: [
            "`config set prefix !`",
            "`config set colors.primary ff0000`",
            "`config set emojis.success 🎉`",
            "`config get cooldowns.dungeon`"
          ].join('\n'),
          inline: false
        },
        {
          name: "🔒 Permissões",
          value: "Requer permissão **Gerenciar Servidor**",
          inline: false
        }
      ]
    };
    
    await message.reply({ embeds: [embed] });
  },
  
  formatValue(value) {
    if (typeof value === 'boolean') {
      return value ? 'true' : 'false';
    }
    if (Array.isArray(value)) {
      return value.length > 0 ? value.join(', ') : 'vazio';
    }
    if (typeof value === 'object' && value !== null) {
      return JSON.stringify(value);
    }
    return String(value);
  },
  
  parseValue(key, rawValue) {
    // Converter booleanos
    if (rawValue.toLowerCase() === 'true') return true;
    if (rawValue.toLowerCase() === 'false') return false;
    
    // Converter números
    if (/^\d+$/.test(rawValue)) {
      return parseInt(rawValue);
    }
    if (/^\d+\.\d+$/.test(rawValue)) {
      return parseFloat(rawValue);
    }
    
    // Converter cores hex
    if (key.includes('color') && /^[0-9a-fA-F]{6}$/.test(rawValue)) {
      return parseInt(rawValue, 16);
    }
    
    // Converter arrays (separados por vírgula)
    if (key.includes('roles') && rawValue.includes(',')) {
      return rawValue.split(',').map(s => s.trim());
    }
    
    // Valor string padrão
    return rawValue;
  }
};