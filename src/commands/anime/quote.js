import config from "../../config.js";

export default {
  name: "quote",
  description: "Mostra uma citação inspiradora de anime.",
  category: "anime",
  cooldown: 5000,
  
  async execute(client, message, args) {
    // Lista de citações de anime
    let quotes;
    try {
      const res = await fetch('https://api.animechan.io/v1/quotes/random');
      const json = await res.json();
      const data = json.data ?? json;
      quotes = [
        {
          text: data.content ?? data.quote ?? 'Sem conteúdo',
          author: data.character?.name ?? data.author ?? 'Desconhecido',
          anime: data.anime?.name ?? data.anime ?? 'Desconhecido'
        }
      ];
    } catch (error) {
      console.error('Erro ao buscar citação:', error);
      quotes = [
        {
          text: "Não foi possível obter uma citação no momento.",
          author: "Sistema",
          anime: "API"
        }
      ];
    }
    
    // Selecionar citação aleatória
    const randomQuote = quotes[Math.floor(Math.random() * quotes.length)];
    
    const quoteEmbed = {
      color: config.colors.primary,
      title: "💭 Citação de Anime",
      description: `*"${randomQuote.text}"*`,
      fields: [
        {
          name: "👤 Personagem",
          value: randomQuote.author,
          inline: true,
        },
        {
          name: "🎌 Anime",
          value: randomQuote.anime,
          inline: true,
        },
      ],
      footer: {
        text: `Solicitado por ${message.author.tag}`,
        icon_url: message.author.displayAvatarURL({ dynamic: true }),
      },
      timestamp: new Date().toISOString(),
    };
    
    await message.reply({ embeds: [quoteEmbed] });
  },
};