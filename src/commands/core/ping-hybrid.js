/**
 * 🎯 Comando Híbrido: Ping
 * Funciona tanto como comando prefix (m.ping) quanto slash (/ping)
 */

import { SlashCommandBuilder } from 'discord.js';
import config from "../../config.js";
import { createSuccessEmbed, createErrorEmbed } from "../../utils/embeds.js";

// 📊 Dados do Slash Command
export const data = new SlashCommandBuilder()
  .setName('ping')
  .setDescription('🏓 Mostra a latência do bot e da API do Discord');

// ⚡ Executar Slash Command
export async function execute(interaction) {
  const start = Date.now();
  
  // Defer para calcular latência corretamente
  await interaction.deferReply();
  
  const messageLatency = Date.now() - start;
  const apiLatency = Math.round(interaction.client.ws.ping);
  
  // Determinar qualidade da conexão
  let connectionQuality = "";
  let color = config.colors.success;
  
  if (apiLatency < 100) {
    connectionQuality = "🟢 Excelente";
  } else if (apiLatency < 200) {
    connectionQuality = "🟡 Boa";
    color = config.colors.warning;
  } else {
    connectionQuality = "🔴 Ruim";
    color = config.colors.error;
  }
  
  const embed = {
    color: color,
    title: `${config.emojis.ping} Pong!`,
    fields: [
      {
        name: "📡 Latência da API",
        value: `${apiLatency}ms`,
        inline: true
      },
      {
        name: "💬 Latência da Mensagem", 
        value: `${messageLatency}ms`,
        inline: true
      },
      {
        name: "🌐 Qualidade da Conexão",
        value: connectionQuality,
        inline: true
      }
    ],
    footer: {
      text: `Comando executado via Slash (/) • Também disponível: m.ping`
    },
    timestamp: new Date().toISOString()
  };

  await interaction.editReply({ embeds: [embed] });
}

// 📝 Comando Prefix Tradicional
export default {
  name: "ping",
  description: "🏓 Mostra a latência do bot e da API do Discord",
  category: "core",
  cooldown: 3000, // 3 segundos
  aliases: ["latencia", "pong"],
  
  async execute(client, message, args) {
    const start = Date.now();
    
    // Criar mensagem inicial
    const pingMessage = await message.reply({
      embeds: [{
        color: config.colors.primary,
        title: `${config.emojis.ping} Pingando...`,
        description: `${config.emojis.loading} Calculando latência...`,
      }],
    });

    // Calcular latências
    const messageLatency = Date.now() - start;
    const apiLatency = Math.round(client.ws.ping);
    
    // Determinar qualidade da conexão
    let connectionQuality = "";
    let color = config.colors.success;
    
    if (apiLatency < 100) {
      connectionQuality = "🟢 Excelente";
    } else if (apiLatency < 200) {
      connectionQuality = "🟡 Boa";
      color = config.colors.warning;
    } else {
      connectionQuality = "🔴 Ruim";
      color = config.colors.error;
    }

    // Atualizar com resultados
    const resultEmbed = {
      color: color,
      title: `${config.emojis.ping} Pong!`,
      fields: [
        {
          name: "📡 Latência da API",
          value: `${apiLatency}ms`,
          inline: true,
        },
        {
          name: "💬 Latência da Mensagem",
          value: `${messageLatency}ms`, 
          inline: true,
        },
        {
          name: "🌐 Qualidade da Conexão",
          value: connectionQuality,
          inline: true,
        },
      ],
      footer: {
        text: `Comando executado via Prefix (m.) • Também disponível: /ping`
      },
      timestamp: new Date().toISOString(),
    };

    await pingMessage.edit({ embeds: [resultEmbed] });
  }
};