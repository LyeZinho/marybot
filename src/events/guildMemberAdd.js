// Evento disparado quando um novo membro entra no servidor
import { AttachmentBuilder, EmbedBuilder } from "discord.js";
import { configManager } from "../utils/configManager.js";
import { welcomeRenderer } from "../utils/welcomeRenderer.js";
import { logger } from "../utils/logger.js";

// Configurações padrão
const DEFAULT_WELCOME_SETTINGS = {
  enabled: false,
  channelId: null,
  message: "Bem-vindo(a)!",
  backgroundColor: "#1a1a2e",
  backgroundUrl: null,
  mentionUser: true,
  deleteAfter: 0
};

export default async (client, member) => {
  try {
    const guildId = member.guild.id;
    
    // Obter configurações do servidor
    const config = await configManager.getConfig(guildId);
    const settings = config.welcomeSettings || DEFAULT_WELCOME_SETTINGS;

    // Verificar se o sistema de boas-vindas está ativado
    if (!settings.enabled) {
      return;
    }

    // Verificar se o canal está configurado
    if (!settings.channelId) {
      logger.warning(`[Welcome] Canal de boas-vindas não configurado no servidor ${member.guild.name}`);
      return;
    }

    // Obter o canal
    const channel = member.guild.channels.cache.get(settings.channelId);
    if (!channel) {
      logger.error(`[Welcome] Canal ${settings.channelId} não encontrado no servidor ${member.guild.name}`);
      return;
    }

    // Verificar permissões do bot no canal
    const botPermissions = channel.permissionsFor(client.user);
    if (!botPermissions.has("SendMessages") || !botPermissions.has("AttachFiles")) {
      logger.error(`[Welcome] Bot não tem permissões no canal ${channel.name} (${member.guild.name})`);
      return;
    }

    // Gerar imagem de boas-vindas
    logger.info(`[Welcome] Gerando mensagem de boas-vindas para ${member.user.tag} em ${member.guild.name}`);
    
    const imageBuffer = await welcomeRenderer.renderWelcome(member, {
      welcomeMessage: settings.message,
      welcomeBackgroundColor: settings.backgroundColor,
      welcomeBackgroundUrl: settings.backgroundUrl
    });

    const attachment = new AttachmentBuilder(imageBuffer, { 
      name: "welcome.png" 
    });

    // Criar mensagem de texto (apenas menção se configurado)
    let textMessage = "";
    if (settings.mentionUser) {
      textMessage = `${member}`;
    }

    // Enviar mensagem (apenas imagem, sem embed)
    const sentMessage = await channel.send({
      content: textMessage || undefined,
      files: [attachment]
    });

    logger.success(`[Welcome] Mensagem enviada para ${member.user.tag} em ${member.guild.name}`);

    // Auto-deletar se configurado
    if (settings.deleteAfter > 0) {
      setTimeout(async () => {
        try {
          await sentMessage.delete();
          logger.info(`[Welcome] Mensagem auto-deletada após ${settings.deleteAfter}s`);
        } catch (error) {
          logger.error(`[Welcome] Erro ao deletar mensagem: ${error.message}`);
        }
      }, settings.deleteAfter * 1000);
    }

  } catch (error) {
    logger.error(`[Welcome] Erro ao processar boas-vindas: ${error.message}`);
    console.error(error);
  }
};
