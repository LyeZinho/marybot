import config from "../../config.js";

export default {
  name: "quote",
  description: "Mostra uma citação inspiradora de anime.",
  category: "anime",
  cooldown: 5000,
  
  async execute(client, message, args) {
    // Lista de citações de anime
    const quotes = [
      {
        text: "Se você não gosta do seu destino, não o aceite. Em vez disso, tenha a coragem de mudá-lo da maneira que você quer que seja.",
        author: "Uzumaki Naruto",
        anime: "Naruto"
      },
      {
        text: "O medo não é o mal. Ele te diz quais são suas fraquezas. E uma vez que você sabe suas fraquezas, você pode se tornar mais forte, bem como mais gentil.",
        author: "Gildarts Clive",
        anime: "Fairy Tail"
      },
      {
        text: "A única coisa que sabemos é que não sabemos nada. E esse é o grau mais alto do conhecimento humano.",
        author: "Senku Ishigami",
        anime: "Dr. Stone"
      },
      {
        text: "Pessoas que não podem jogar fora algo importante nunca podem esperar mudanças.",
        author: "Armin Arlert",
        anime: "Attack on Titan"
      },
      {
        text: "O poder vem em resposta a uma necessidade, não a um desejo.",
        author: "Goku",
        anime: "Dragon Ball Z"
      },
      {
        text: "Não é o rosto que torna alguém um monstro, são suas ações.",
        author: "Nobara Kugisaki",
        anime: "Jujutsu Kaisen"
      },
      {
        text: "A vida é como um jogo em que você está tentando resolver o quebra-cabeça com um pedaço em falta.",
        author: "Chitoge Kirisaki",
        anime: "Nisekoi"
      },
      {
        text: "Mesmo que eu morra, você continua vivendo. Mesmo que eu não esteja aqui, você continua vivendo.",
        author: "Kyojuro Rengoku",
        anime: "Demon Slayer"
      },
      {
        text: "Um lugar onde alguém ainda pensa em você é um lugar que você pode chamar de lar.",
        author: "Jiraiya",
        anime: "Naruto"
      },
      {
        text: "O que não nos mata nos faz mais fortes.",
        author: "Levi Ackerman",
        anime: "Attack on Titan"
      }
    ];
    
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