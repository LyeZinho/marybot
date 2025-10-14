import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { dataService } from '../../services/dataService.js';
import { botConfig } from '../../config.js';

export const data = new SlashCommandBuilder()
  .setName('daily')
  .setDescription('Recebe sua recompensa diária');

export async function execute(interaction) {
  await interaction.deferReply();

  try {
    // Process daily reward using the data service
    const result = await dataService.processDailyReward(interaction.user.id);
    
    // Create success embed
    const embed = new EmbedBuilder()
      .setTitle('💰 Recompensa Diária Recebida!')
      .setColor(botConfig.successColor)
      .setThumbnail(interaction.user.displayAvatarURL())
      .addFields(
        { 
          name: '🪙 Moedas Recebidas', 
          value: `+${result.coins} moedas`, 
          inline: true 
        },
        { 
          name: '⭐ XP Recebido', 
          value: `+${result.xp} XP`, 
          inline: true 
        },
        { 
          name: '🔥 Sequência', 
          value: `${result.streak} dias`, 
          inline: true 
        },
        { 
          name: '💎 Total de Moedas', 
          value: `${result.user.coins} moedas`, 
          inline: true 
        },
        { 
          name: '⚡ Total de XP', 
          value: `${result.user.xp} XP`, 
          inline: true 
        },
        { 
          name: '📊 Nível', 
          value: `${Math.floor(result.user.xp / botConfig.economy.xpPerLevel) + 1}`, 
          inline: true 
        }
      )
      .setFooter({ 
        text: 'Volte amanhã para continuar sua sequência!' 
      })
      .setTimestamp();

    // Add streak bonus info if applicable
    if (result.streak > 1) {
      embed.addFields({
        name: '🎯 Bônus de Sequência',
        value: `Bônus de ${Math.round((result.streak - 1) * 10)}% aplicado!`,
        inline: false
      });
    }

    // Check if user leveled up and show notification
    const currentLevel = Math.floor(result.user.xp / botConfig.economy.xpPerLevel) + 1;
    const previousXp = result.user.xp - result.xp;
    const previousLevel = Math.floor(previousXp / botConfig.economy.xpPerLevel) + 1;

    if (currentLevel > previousLevel) {
      embed.addFields({
        name: '🎉 Level Up!',
        value: `Parabéns! Você alcançou o nível **${currentLevel}**!`,
        inline: false
      });
    }

    await interaction.editReply({ embeds: [embed] });

    // Trigger Discord event for daily claim
    await dataService.triggerDiscordEvent('user_interaction', {
      type: 'daily_claimed',
      userId: interaction.user.id,
      username: interaction.user.username,
      rewards: result
    });

  } catch (error) {
    console.error('❌ Error in daily command:', error);

    let errorMessage = 'Erro interno do servidor.';
    let errorColor = botConfig.errorColor;

    if (error.message.includes('already claimed')) {
      errorMessage = 'Você já recebeu sua recompensa diária hoje! Volte amanhã para receber novamente.';
      errorColor = botConfig.warningColor;
    }

    const errorEmbed = new EmbedBuilder()
      .setTitle('❌ Erro')
      .setDescription(errorMessage)
      .setColor(errorColor)
      .setTimestamp();

    await interaction.editReply({ embeds: [errorEmbed] });
  }
}