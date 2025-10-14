import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { prisma } from '../../database/client.js';
import { getRandomElement } from '../../utils/random.js';

export const data = new SlashCommandBuilder()
  .setName('quote')
  .setDescription('Mostra uma citação aleatória de anime');

export async function execute(interaction) {
  try {
    await interaction.deferReply();

    // Buscar uma citação aleatória do banco de dados
    const quotes = await prisma.animeQuote.findMany();
    
    if (quotes.length === 0) {
      // Fallback com algumas citações predefinidas
      const fallbackQuotes = [
        {
          quote: "Eu irei me tornar o Hokage!",
          character: "Naruto Uzumaki",
          anime: "Naruto"
        },
        {
          quote: "A vingança nunca cura a dor, só faz ela se espalhar.",
          character: "Kakashi Hatake",
          anime: "Naruto"
        },
        {
          quote: "Pessoas morrem quando são mortas.",
          character: "Shirou Emiya",
          anime: "Fate/stay night"
        },
        {
          quote: "O que não mata você, te deixa mais forte.",
          character: "Senku Ishigami",
          anime: "Dr. Stone"
        },
        {
          quote: "Eu não sou estúpido! Eu sou apenas... especial!",
          character: "Natsu Dragneel",
          anime: "Fairy Tail"
        }
      ];
      
      const randomQuote = getRandomElement(fallbackQuotes);
      
      const embed = new EmbedBuilder()
        .setTitle('💬 Citação de Anime')
        .setDescription(`*"${randomQuote.quote}"*`)
        .addFields(
          { name: '👤 Personagem', value: randomQuote.character, inline: true },
          { name: '🎌 Anime', value: randomQuote.anime, inline: true }
        )
        .setColor('#FFD93D')
        .setTimestamp()
        .setFooter({ 
          text: `Solicitado por ${interaction.user.username}`, 
          iconURL: interaction.user.displayAvatarURL() 
        });

      return await interaction.editReply({ embeds: [embed] });
    }

    const randomQuote = getRandomElement(quotes);

    const embed = new EmbedBuilder()
      .setTitle('💬 Citação de Anime')
      .setDescription(`*"${randomQuote.quote}"*`)
      .addFields(
        { name: '👤 Personagem', value: randomQuote.character, inline: true },
        { name: '🎌 Anime', value: randomQuote.anime, inline: true }
      )
      .setColor('#FFD93D')
      .setTimestamp()
      .setFooter({ 
        text: `Solicitado por ${interaction.user.username}`, 
        iconURL: interaction.user.displayAvatarURL() 
      });

    await interaction.editReply({ embeds: [embed] });

  } catch (error) {
    console.error('Erro ao buscar citação:', error);
    
    const embed = new EmbedBuilder()
      .setTitle('❌ Erro')
      .setDescription('Ocorreu um erro ao buscar uma citação. Tente novamente mais tarde.')
      .setColor('#FF4444');
    
    await interaction.editReply({ embeds: [embed] });
  }
}