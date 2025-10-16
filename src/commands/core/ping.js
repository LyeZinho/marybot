import config from "../../config.js";

export default {
  name: "ping",
  description: "Mostra a latência do bot e da API do Discord.",
  category: "core",
  cooldown: 3000, // 3 segundos
  
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
      color = config.colors.success;
    } else if (apiLatency < 200) {
      connectionQuality = "🟡 Boa";
      color = config.colors.warning;
    } else {
      connectionQuality = "🔴 Ruim";
      color = config.colors.error;
    }

    // Atualizar mensagem com os resultados
    await pingMessage.edit({
      embeds: [{
        color: color,
        title: `${config.emojis.ping} Pong!`,
        fields: [
          {
            name: "📨 Latência da Mensagem",
            value: `\`${messageLatency}ms\``,
            inline: true,
          },
          {
            name: "🌐 Latência da API",
            value: `\`${apiLatency}ms\``,
            inline: true,
          },
          {
            name: "📶 Qualidade da Conexão",
            value: connectionQuality,
            inline: true,
          },
        ],
        footer: {
          text: `Solicitado por ${message.author.tag}`,
          icon_url: message.author.displayAvatarURL({ dynamic: true }),
        },
        timestamp: new Date().toISOString(),
      }],
    });
  },
};