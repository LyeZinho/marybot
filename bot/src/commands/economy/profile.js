import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { dataService } from '../../services/dataService.js';
import { botConfig, getRankByLevel } from '../../config.js';

export const data = new SlashCommandBuilder()
  .setName('profile')
  .setDescription('Mostra o perfil de um usuário')
  .addUserOption(option =>
    option.setName('usuario')
      .setDescription('Usuário para ver o perfil')
      .setRequired(false)
  );

export async function execute(interaction) {
  const targetUser = interaction.options.getUser('usuario') || interaction.user;
  
  await interaction.deferReply();

  try {
    // Get user profile using data service
    const user = await dataService.getUserProfile(targetUser.id);
    
    if (!user) {
      const errorEmbed = new EmbedBuilder()
        .setTitle('❌ Usuário não encontrado')
        .setDescription(`${targetUser.username} ainda não está registrado no sistema.`)
        .setColor(botConfig.errorColor)
        .setTimestamp();

      return await interaction.editReply({ embeds: [errorEmbed] });
    }

    // Calculate level and progress
    const level = Math.floor(user.xp / botConfig.economy.xpPerLevel) + 1;
    const currentLevelXP = (level - 1) * botConfig.economy.xpPerLevel;
    const nextLevelXP = level * botConfig.economy.xpPerLevel;
    const progressXP = user.xp - currentLevelXP;
    const neededXP = nextLevelXP - user.xp;
    const progressPercentage = Math.round((progressXP / botConfig.economy.xpPerLevel) * 100);

    // Get rank information
    const rank = getRankByLevel(level);

    // Get user characters count
    let charactersInfo = 'Carregando...';
    try {
      const userCharacters = await dataService.getUserCharacters(targetUser.id);
      const totalCharacters = userCharacters.length;
      const legendaryCount = userCharacters.filter(uc => uc.character.rarity === 5).length;
      const epicCount = userCharacters.filter(uc => uc.character.rarity === 4).length;
      
      charactersInfo = `${totalCharacters} total\n🌟 ${legendaryCount} lendários\n💜 ${epicCount} épicos`;
    } catch (error) {
      charactersInfo = 'Dados indisponíveis';
    }

    // Create progress bar
    const progressBarLength = 10;
    const filledSquares = Math.round((progressPercentage / 100) * progressBarLength);
    const emptySquares = progressBarLength - filledSquares;
    const progressBar = '█'.repeat(filledSquares) + '░'.repeat(emptySquares);

    // Create profile embed
    const embed = new EmbedBuilder()
      .setTitle(`📊 Perfil de ${targetUser.username}`)
      .setThumbnail(targetUser.displayAvatarURL({ size: 256 }))
      .setColor(botConfig.embedColor)
      .addFields(
        { 
          name: '💰 Moedas', 
          value: `${user.coins.toLocaleString()} 🪙`, 
          inline: true 
        },
        { 
          name: '⭐ XP Total', 
          value: `${user.xp.toLocaleString()} XP`, 
          inline: true 
        },
        { 
          name: '📊 Nível', 
          value: `${level}`, 
          inline: true 
        },
        { 
          name: '🏆 Rank', 
          value: rank.name, 
          inline: true 
        },
        { 
          name: '🔥 Sequência Diária', 
          value: `${user.dailyStreak || 0} dias`, 
          inline: true 
        },
        { 
          name: '🎭 Personagens', 
          value: charactersInfo, 
          inline: true 
        },
        {
          name: '📈 Progresso para o Próximo Nível',
          value: `${progressBar} ${progressPercentage}%\n${progressXP}/${botConfig.economy.xpPerLevel} XP (faltam ${neededXP} XP)`,
          inline: false
        }
      )
      .setFooter({ 
        text: `ID: ${targetUser.id}` 
      })
      .setTimestamp();

    // Add last daily info if available
    if (user.lastDaily) {
      const lastDailyDate = new Date(user.lastDaily);
      const now = new Date();
      const timeDiff = now - lastDailyDate;
      const hoursDiff = Math.floor(timeDiff / (1000 * 60 * 60));
      
      let lastDailyText;
      if (hoursDiff < 24) {
        lastDailyText = `Há ${hoursDiff} horas`;
      } else {
        const daysDiff = Math.floor(hoursDiff / 24);
        lastDailyText = `Há ${daysDiff} dias`;
      }

      embed.addFields({
        name: '⏰ Último Daily',
        value: lastDailyText,
        inline: true
      });
    }

    // Add account creation info if available
    if (user.createdAt) {
      const createdAt = new Date(user.createdAt);
      embed.addFields({
        name: '📅 Membro desde',
        value: `<t:${Math.floor(createdAt.getTime() / 1000)}:D>`,
        inline: true
      });
    }

    await interaction.editReply({ embeds: [embed] });

    // Trigger Discord event for profile view
    await dataService.triggerDiscordEvent('user_interaction', {
      type: 'profile_viewed',
      userId: interaction.user.id,
      targetUserId: targetUser.id,
      targetUsername: targetUser.username
    });

  } catch (error) {
    console.error('❌ Error in profile command:', error);

    const errorEmbed = new EmbedBuilder()
      .setTitle('❌ Erro')
      .setDescription('Houve um erro ao carregar o perfil. Tente novamente mais tarde.')
      .setColor(botConfig.errorColor)
      .setTimestamp();

    await interaction.editReply({ embeds: [errorEmbed] });
  }
}