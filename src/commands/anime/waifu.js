import config from "../../config.js";
import axios from "axios";

export default {
  name: "waifu",
  description: "Mostra uma imagem aleatória de waifu.",
  category: "anime",
  cooldown: 3000,
  
  async execute(client, message, args) {
    try {
      // Indicar que o bot está carregando
      const loadingEmbed = {
        color: config.colors.primary,
        title: "🎌 Buscando waifu...",
        description: `${config.emojis.loading} Aguarde um momento...`,
      };
      
      const msg = await message.reply({ embeds: [loadingEmbed] });
      
      // Fazer requisição para API de waifus
      const response = await axios.get("https://api.waifu.pics/sfw/waifu");
      
      if (!response.data || !response.data.url) {
        throw new Error("Não foi possível obter imagem da API");
      }
      
      const waifuEmbed = {
        color: config.colors.primary,
        title: "🎌 Sua Waifu",
        image: {
          url: response.data.url,
        },
        footer: {
          text: `Solicitado por ${message.author.tag}`,
          icon_url: message.author.displayAvatarURL({ dynamic: true }),
        },
        timestamp: new Date().toISOString(),
      };
      
      await msg.edit({ embeds: [waifuEmbed] });
      
    } catch (error) {
      console.error("Erro no comando waifu:", error);
      
      const errorEmbed = {
        color: config.colors.error,
        title: `${config.emojis.error} Erro`,
        description: "Não foi possível buscar uma waifu no momento. Tente novamente mais tarde.",
      };
      
      await message.reply({ embeds: [errorEmbed] });
    }
  },
};