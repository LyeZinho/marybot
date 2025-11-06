// Comando para configurar sistema de mensagens de boas-vindas
import { AttachmentBuilder, EmbedBuilder } from "discord.js";
import { configManager } from "../../utils/configManager.js";
import { welcomeRenderer } from "../../utils/welcomeRenderer.js";

// Configurações padrão para boas-vindas
const DEFAULT_WELCOME_SETTINGS = {
  enabled: false,
  channelId: null,
  message: "Bem-vindo(a)!",
  backgroundColor: "#1a1a2e",
  backgroundUrl: null,
  mentionUser: true,
  deleteAfter: 0
};

export default {
  name: "welcome",
  aliases: ["boasvindas", "bemvindo", "welcomemsg"],
  description: "Configura o sistema de mensagens de boas-vindas do servidor.",
  category: "admin",
  usage: "welcome [enable|disable|channel|message|background|test|status]",
  cooldown: 3000,
  permissions: ["ManageGuild"],
  
  // Função auxiliar para obter settings com fallback
  getWelcomeSettings(config) {
    return config.welcomeSettings || DEFAULT_WELCOME_SETTINGS;
  },
  
  async execute(client, message, args) {
    try {
      const guildId = message.guild.id;
      const subcommand = args[0]?.toLowerCase();

      if (!subcommand || subcommand === "status") {
        return await this.showStatus(message, guildId);
      }

      switch (subcommand) {
        case "enable":
        case "ativar":
          return await this.enableWelcome(message, guildId);
        
        case "disable":
        case "desativar":
          return await this.disableWelcome(message, guildId);
        
        case "channel":
        case "canal":
          return await this.setChannel(message, guildId, args);
        
        case "message":
        case "mensagem":
          return await this.setMessage(message, guildId, args);
        
        case "background":
        case "bg":
        case "fundo":
          return await this.setBackground(message, guildId, args);
        
        case "color":
        case "cor":
          return await this.setColor(message, guildId, args);
        
        case "mention":
        case "mencionar":
          return await this.toggleMention(message, guildId);
        
        case "test":
        case "testar":
          return await this.testWelcome(message, guildId);
        
        case "help":
        case "ajuda":
          return await this.showHelp(message);
        
        default:
          return await message.reply("❌ Subcomando inválido! Use `m.welcome help` para ver todos os comandos.");
      }
    } catch (error) {
      console.error("Erro no comando welcome:", error);
      return await message.reply("❌ Ocorreu um erro ao processar o comando.");
    }
  },

  async showStatus(message, guildId) {
    const config = await configManager.getConfig(guildId);
    const settings = this.getWelcomeSettings(config);

    const statusEmbed = new EmbedBuilder()
      .setTitle("🎉 Status do Sistema de Boas-Vindas")
      .setColor(settings.enabled ? 0x00ff00 : 0xff0000)
      .addFields(
        {
          name: "📊 Status",
          value: settings.enabled ? "✅ Ativado" : "❌ Desativado",
          inline: true
        },
        {
          name: "📢 Canal",
          value: settings.channelId ? `<#${settings.channelId}>` : "❌ Não configurado",
          inline: true
        },
        {
          name: "💬 Mencionar Usuário",
          value: settings.mentionUser ? "✅ Sim" : "❌ Não",
          inline: true
        },
        {
          name: "✉️ Mensagem",
          value: `\`${settings.message}\``,
          inline: false
        },
        {
          name: "🎨 Cor de Fundo",
          value: settings.backgroundColor,
          inline: true
        },
        {
          name: "🖼️ Imagem de Fundo",
          value: settings.backgroundUrl || "❌ Não configurada",
          inline: true
        },
        {
          name: "⏱️ Auto-Deletar",
          value: settings.deleteAfter > 0 ? `Após ${settings.deleteAfter}s` : "❌ Desativado",
          inline: true
        }
      )
      .setFooter({ text: "Use m.welcome help para ver todos os comandos" })
      .setTimestamp();

    return await message.reply({ embeds: [statusEmbed] });
  },

  async enableWelcome(message, guildId) {
    const config = await configManager.getConfig(guildId);
    const settings = this.getWelcomeSettings(config);
    
    if (!settings.channelId) {
      return await message.reply("❌ Configure um canal primeiro com `m.welcome channel #canal`");
    }

    await configManager.updateConfig(guildId, "welcomeSettings.enabled", true);

    return await message.reply("✅ Sistema de boas-vindas **ativado**!");
  },

  async disableWelcome(message, guildId) {
    await configManager.updateConfig(guildId, "welcomeSettings.enabled", false);

    return await message.reply("❌ Sistema de boas-vindas **desativado**!");
  },

  async setChannel(message, guildId, args) {
    const channelMention = args[1];
    
    if (!channelMention) {
      return await message.reply("❌ Mencione um canal! Exemplo: `m.welcome channel #boas-vindas`");
    }

    const channelId = channelMention.replace(/[<#>]/g, '');
    const channel = message.guild.channels.cache.get(channelId);

    if (!channel || channel.type !== 0) { // 0 = GUILD_TEXT
      return await message.reply("❌ Canal inválido! Certifique-se de mencionar um canal de texto.");
    }

    await configManager.updateConfig(guildId, "welcomeSettings.channelId", channelId);

    return await message.reply(`✅ Canal de boas-vindas configurado para ${channelMention}!`);
  },

  async setMessage(message, guildId, args) {
    const customMessage = args.slice(1).join(" ");
    
    if (!customMessage) {
      return await message.reply("❌ Forneça uma mensagem! Exemplo: `m.welcome message Bem-vindo ao servidor!`");
    }

    if (customMessage.length > 50) {
      return await message.reply("❌ Mensagem muito longa! Máximo de 50 caracteres.");
    }

    await configManager.updateConfig(guildId, "welcomeSettings.message", customMessage);

    return await message.reply(`✅ Mensagem de boas-vindas configurada para: \`${customMessage}\``);
  },

  async setBackground(message, guildId, args) {
    const backgroundUrl = args[1];
    
    if (!backgroundUrl) {
      // Remover background
      await configManager.updateConfig(guildId, "welcomeSettings.backgroundUrl", null);
      return await message.reply("✅ Imagem de fundo removida! Usando cor sólida.");
    }

    // Validar URL
    if (!backgroundUrl.startsWith("http")) {
      return await message.reply("❌ URL inválida! Forneça uma URL completa começando com http/https.");
    }

    await configManager.updateConfig(guildId, "welcomeSettings.backgroundUrl", backgroundUrl);

    return await message.reply(`✅ Imagem de fundo configurada!\n${backgroundUrl}`);
  },

  async setColor(message, guildId, args) {
    const color = args[1];
    
    if (!color) {
      return await message.reply("❌ Forneça uma cor hexadecimal! Exemplo: `m.welcome color #1a1a2e`");
    }

    // Validar cor hex
    const hexRegex = /^#?[0-9A-Fa-f]{6}$/;
    if (!hexRegex.test(color)) {
      return await message.reply("❌ Cor inválida! Use formato hexadecimal: `#RRGGBB`");
    }

    const formattedColor = color.startsWith("#") ? color : `#${color}`;

    await configManager.updateConfig(guildId, "welcomeSettings.backgroundColor", formattedColor);

    return await message.reply(`✅ Cor de fundo configurada para: \`${formattedColor}\``);
  },

  async toggleMention(message, guildId) {
    const config = await configManager.getConfig(guildId);
    const settings = this.getWelcomeSettings(config);
    const currentValue = settings.mentionUser;

    await configManager.updateConfig(guildId, "welcomeSettings.mentionUser", !currentValue);

    return await message.reply(
      `✅ Menção de usuário ${!currentValue ? "**ativada**" : "**desativada**"}!`
    );
  },

  async testWelcome(message, guildId) {
    try {
      const config = await configManager.getConfig(guildId);
      const settings = this.getWelcomeSettings(config);

      if (!settings.channelId) {
        return await message.reply("❌ Configure um canal primeiro!");
      }

      const channel = message.guild.channels.cache.get(settings.channelId);
      if (!channel) {
        return await message.reply("❌ Canal configurado não encontrado!");
      }

      await message.reply("⏳ Gerando prévia da mensagem de boas-vindas...");

      // Gerar imagem de boas-vindas
      const imageBuffer = await welcomeRenderer.renderWelcome(message.member, {
        welcomeMessage: settings.message,
        welcomeBackgroundColor: settings.backgroundColor,
        welcomeBackgroundUrl: settings.backgroundUrl
      });

      const attachment = new AttachmentBuilder(imageBuffer, { 
        name: "welcome.png" 
      });

      // Criar mensagem
      const welcomeMessage = settings.mentionUser 
        ? `${message.member}` 
        : "";

      await message.reply({ 
        content: welcomeMessage || undefined,
        files: [attachment] 
      });

    } catch (error) {
      console.error("Erro ao testar boas-vindas:", error);
      return await message.reply("❌ Erro ao gerar prévia da mensagem!");
    }
  },

  async showHelp(message) {
    const helpEmbed = new EmbedBuilder()
      .setTitle("📚 Ajuda - Sistema de Boas-Vindas")
      .setDescription("Configure mensagens personalizadas para novos membros do servidor.")
      .setColor(0x5865f2)
      .addFields(
        {
          name: "📊 Status e Informações",
          value: "`m.welcome status` - Mostra configurações atuais\n`m.welcome help` - Mostra esta ajuda",
          inline: false
        },
        {
          name: "⚙️ Configuração Básica",
          value: "`m.welcome enable` - Ativa o sistema\n`m.welcome disable` - Desativa o sistema\n`m.welcome channel #canal` - Define o canal de boas-vindas",
          inline: false
        },
        {
          name: "🎨 Personalização",
          value: "`m.welcome message <texto>` - Define mensagem (máx 50 chars)\n`m.welcome color #hex` - Define cor de fundo\n`m.welcome background <url>` - Define imagem de fundo\n`m.welcome background` - Remove imagem de fundo",
          inline: false
        },
        {
          name: "🔧 Opções Adicionais",
          value: "`m.welcome mention` - Alterna menção do usuário\n`m.welcome test` - Testa a mensagem de boas-vindas",
          inline: false
        }
      )
      .setFooter({ text: "MaryBot • Sistema de Boas-Vindas" })
      .setTimestamp();

    return await message.reply({ embeds: [helpEmbed] });
  }
};
