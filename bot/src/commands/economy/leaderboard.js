import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { dataService } from '../../services/dataService.js';
import { botConfig } from '../../config.js';

export const data = new SlashCommandBuilder()
  .setName('leaderboard')
  .setDescription('Mostra o ranking da comunidade')
  .addStringOption(option =>
    option.setName('tipo')
      .setDescription('Tipo de ranking')
      .setRequired(false)
      .addChoices(
        { name: 'XP', value: 'xp' },
        { name: 'Moedas', value: 'coins' },
        { name: 'Nível', value: 'level' }
      )
  );

export async function execute(interaction) {
  const tipo = interaction.options.getString('tipo') || 'xp';
  
  await interaction.deferReply();

  try {
    // Get leaderboard data using data service
    const users = await dataService.getLeaderboard(tipo, 10);
    
    if (!users || users.length === 0) {
      const errorEmbed = new EmbedBuilder()
        .setTitle('📊 Leaderboard')
        .setDescription('Nenhum usuário encontrado no ranking.')
        .setColor(botConfig.warningColor)
        .setTimestamp();

      return await interaction.editReply({ embeds: [errorEmbed] });
    }

    // Define titles and emojis based on type
    let title, emoji, formatValue;
    
    switch (tipo) {
      case 'coins':
        title = '💰 Ranking de Moedas';
        emoji = '🪙';
        formatValue = (user) => `${user.coins.toLocaleString()} moedas`;
        break;
      case 'level':
        title = '📊 Ranking de Níveis';
        emoji = '⭐';
        formatValue = (user) => {
          const level = Math.floor(user.xp / botConfig.economy.xpPerLevel) + 1;
          return `Nível ${level}`;
        };
        break;
      default: // xp
        title = '⚡ Ranking de XP';
        emoji = '⭐';
        formatValue = (user) => `${user.xp.toLocaleString()} XP`;
        break;
    }

    // Create leaderboard text
    let leaderboardText = '';
    const medals = ['🥇', '🥈', '🥉'];
    
    users.forEach((user, index) => {
      const medal = index < 3 ? medals[index] : `${index + 1}.`;
      const value = formatValue(user);
      
      // Truncate long usernames
      const displayName = user.username.length > 20 
        ? user.username.substring(0, 17) + '...' 
        : user.username;
      
      leaderboardText += `${medal} **${displayName}** - ${value}\n`;
    });

    // Find current user's position if not in top 10
    let userPosition = '';
    const currentUserId = interaction.user.id;
    const userInTop10 = users.find(user => user.discordId === currentUserId);
    
    if (!userInTop10) {
      try {
        // Get current user's data to show their position
        const currentUser = await dataService.getUserProfile(currentUserId);
        if (currentUser) {
          const currentValue = formatValue(currentUser);
          userPosition = `\n📍 **Sua posição:** ${currentUser.username} - ${currentValue}`;
        }
      } catch (error) {
        // Ignore error for user position
      }
    }

    const embed = new EmbedBuilder()
      .setTitle(title)
      .setDescription(leaderboardText + userPosition)
      .setColor(botConfig.embedColor)
      .setFooter({ 
        text: `Mostrando top ${users.length} usuários • Use /daily para ganhar XP e moedas!`
      })
      .setTimestamp();

    // Add total users info if available
    try {
      // This would require a separate endpoint for total users count
      // For now, we'll skip this feature
    } catch (error) {
      // Ignore
    }

    await interaction.editReply({ embeds: [embed] });

    // Trigger Discord event for leaderboard view
    await dataService.triggerDiscordEvent('user_interaction', {
      type: 'leaderboard_viewed',
      userId: interaction.user.id,
      leaderboardType: tipo
    });

  } catch (error) {
    console.error('❌ Error in leaderboard command:', error);

    const errorEmbed = new EmbedBuilder()
      .setTitle('❌ Erro')
      .setDescription('Houve um erro ao carregar o ranking. Tente novamente mais tarde.')
      .setColor(botConfig.errorColor)
      .setTimestamp();

    await interaction.editReply({ embeds: [errorEmbed] });
  }
}