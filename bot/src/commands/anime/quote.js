import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { dataService } from '../../services/dataService.js';
import { botConfig } from '../../config.js';

export const data = new SlashCommandBuilder()
  .setName('quote')
  .setDescription('Mostra uma citação aleatória de anime');

export async function execute(interaction) {
  try {
    await interaction.deferReply();

    // Get random quote using data service
    const quote = await dataService.getRandomQuote();
    
    if (!quote) {
      const errorEmbed = new EmbedBuilder()
        .setTitle('❌ Nenhuma Citação Encontrada')
        .setDescription('Não foi possível encontrar citações no banco de dados.')
        .setColor(botConfig.warningColor)
        .setTimestamp();

      return await interaction.editReply({ embeds: [errorEmbed] });
    }

    const embed = new EmbedBuilder()
      .setTitle('💬 Citação de Anime')
      .setDescription(`*"${quote.text}"*`)
      .addFields(
        { 
          name: '👤 Personagem', 
          value: quote.character, 
          inline: true 
        },
        { 
          name: '🎌 Anime', 
          value: quote.anime, 
          inline: true 
        }
      )
      .setColor(botConfig.embedColor)
      .setFooter({ 
        text: 'Use /quote novamente para ver outra citação!' 
      })
      .setTimestamp();

    // Add image if available
    if (quote.imageUrl) {
      embed.setImage(quote.imageUrl);
    }

    await interaction.editReply({ embeds: [embed] });

    // Trigger Discord event for quote view
    await dataService.triggerDiscordEvent('user_interaction', {
      type: 'quote_viewed',
      userId: interaction.user.id,
      quoteId: quote.id,
      character: quote.character,
      anime: quote.anime
    });

  } catch (error) {
    console.error('❌ Error in quote command:', error);

    const errorEmbed = new EmbedBuilder()
      .setTitle('❌ Erro')
      .setDescription('Houve um erro ao buscar uma citação. Tente novamente mais tarde.')
      .setColor(botConfig.errorColor)
      .setTimestamp();

    await interaction.editReply({ embeds: [errorEmbed] });
  }
}