import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { prisma } from '../../database/client.js';

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
        { name: 'Nível', value: 'level' },
        { name: 'Personagens', value: 'characters' }
      )
  );

export async function execute(interaction) {
  const tipo = interaction.options.getString('tipo') || 'xp';
  
  await interaction.deferReply();

  try {
    let users;
    let title;
    let emoji;

    switch (tipo) {
      case 'coins':
        users = await prisma.user.findMany({
          orderBy: { coins: 'desc' },
          take: 10
        });
        title = '💰 Ranking por Moedas';
        emoji = '🪙';
        break;
      
      case 'level':
        users = await prisma.user.findMany({
          orderBy: { xp: 'desc' },
          take: 10
        });
        // Calcular nível para cada usuário
        users = users.map(user => ({
          ...user,
          level: Math.floor(user.xp / 100) + 1
        }));
        title = '📈 Ranking por Nível';
        emoji = '🏅';
        break;
      
      case 'characters':
        users = await prisma.user.findMany({
          include: {
            characters: true
          },
          take: 50 // Buscar mais para ordenar depois
        });
        
        // Ordenar por quantidade de personagens
        users = users
          .map(user => ({
            ...user,
            characterCount: user.characters.length
          }))
          .sort((a, b) => b.characterCount - a.characterCount)
          .slice(0, 10);
        
        title = '🎴 Ranking por Personagens';
        emoji = '⭐';
        break;
      
      default: // xp
        users = await prisma.user.findMany({
          orderBy: { xp: 'desc' },
          take: 10
        });
        title = '✨ Ranking por XP';
        emoji = '💫';
        break;
    }

    if (users.length === 0) {
      const embed = new EmbedBuilder()
        .setTitle('📊 Ranking Vazio')
        .setDescription('Ainda não há usuários registrados no sistema.')
        .setColor('#FFB347');
      
      return await interaction.editReply({ embeds: [embed] });
    }

    // Encontrar posição do usuário atual
    let userPosition = -1;
    let currentUserData = null;
    
    for (let i = 0; i < users.length; i++) {
      if (users[i].discordId === interaction.user.id) {
        userPosition = i + 1;
        currentUserData = users[i];
        break;
      }
    }

    const embed = new EmbedBuilder()
      .setTitle(title)
      .setColor('#4ECDC4')
      .setTimestamp()
      .setFooter({ 
        text: `Solicitado por ${interaction.user.username}`, 
        iconURL: interaction.user.displayAvatarURL() 
      });

    let description = '';
    const medals = ['🥇', '🥈', '🥉'];
    
    users.forEach((user, index) => {
      const position = index + 1;
      const medal = medals[index] || `**${position}.**`;
      
      let value;
      switch (tipo) {
        case 'coins':
          value = `${user.coins} ${emoji}`;
          break;
        case 'level':
          value = `Nível ${user.level} ${emoji}`;
          break;
        case 'characters':
          value = `${user.characterCount} ${emoji}`;
          break;
        default:
          value = `${user.xp} ${emoji}`;
          break;
      }
      
      const highlight = user.discordId === interaction.user.id ? '**' : '';
      description += `${medal} ${highlight}${user.username}${highlight} - ${value}\n`;
    });

    embed.setDescription(description);

    // Adicionar posição do usuário se não estiver no top 10
    if (userPosition === -1) {
      // Buscar posição real do usuário
      let allUsers;
      
      switch (tipo) {
        case 'coins':
          allUsers = await prisma.user.findMany({
            orderBy: { coins: 'desc' },
            select: { discordId: true }
          });
          break;
        case 'characters':
          allUsers = await prisma.user.findMany({
            include: {
              characters: true
            }
          });
          allUsers = allUsers
            .map(user => ({
              ...user,
              characterCount: user.characters.length
            }))
            .sort((a, b) => b.characterCount - a.characterCount);
          break;
        default:
          allUsers = await prisma.user.findMany({
            orderBy: { xp: 'desc' },
            select: { discordId: true }
          });
          break;
      }
      
      const realPosition = allUsers.findIndex(user => user.discordId === interaction.user.id) + 1;
      
      if (realPosition > 0) {
        embed.addFields(
          { name: '📍 Sua Posição', value: `${realPosition}º lugar`, inline: true }
        );
      }
    } else {
      embed.addFields(
        { name: '🎉 Sua Posição', value: `${userPosition}º lugar`, inline: true }
      );
    }

    await interaction.editReply({ embeds: [embed] });

  } catch (error) {
    console.error('Erro ao buscar leaderboard:', error);
    
    const embed = new EmbedBuilder()
      .setTitle('❌ Erro')
      .setDescription('Ocorreu um erro ao buscar o ranking. Tente novamente mais tarde.')
      .setColor('#FF4444');
    
    await interaction.editReply({ embeds: [embed] });
  }
}