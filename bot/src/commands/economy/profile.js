import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { prisma } from '../../database/client.js';

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
    // Buscar ou criar usuário no banco de dados
    let user = await prisma.user.findUnique({
      where: { discordId: targetUser.id },
      include: {
        characters: {
          include: {
            character: true
          }
        },
        inventory: {
          include: {
            item: true
          }
        }
      }
    });

    if (!user) {
      if (targetUser.id === interaction.user.id) {
        // Criar usuário se for o próprio usuário solicitando
        user = await prisma.user.create({
          data: {
            discordId: targetUser.id,
            username: targetUser.username
          },
          include: {
            characters: {
              include: {
                character: true
              }
            },
            inventory: {
              include: {
                item: true
              }
            }
          }
        });
      } else {
        const embed = new EmbedBuilder()
          .setTitle('❌ Usuário não encontrado')
          .setDescription(`${targetUser.username} ainda não está registrado no sistema.`)
          .setColor('#FF4444');
        
        return await interaction.editReply({ embeds: [embed] });
      }
    }

    // Calcular nível baseado no XP
    const level = Math.floor(user.xp / 100) + 1;
    const xpForNextLevel = (level * 100) - user.xp;
    const totalCharacters = user.characters.length;
    const rareCharacters = user.characters.filter(uc => uc.character.rarity >= 4).length;

    // Determinar rank baseado no nível
    let rank = '🥉 Bronze Otaku';
    if (level >= 50) rank = '💎 Diamante Otaku';
    else if (level >= 30) rank = '🥇 Ouro Otaku';
    else if (level >= 20) rank = '🥈 Prata Otaku';
    else if (level >= 10) rank = '🥉 Bronze Otaku';

    const embed = new EmbedBuilder()
      .setTitle(`📊 Perfil de ${targetUser.username}`)
      .setThumbnail(targetUser.displayAvatarURL({ dynamic: true }))
      .setColor('#4ECDC4')
      .addFields(
        { name: '🏅 Rank', value: rank, inline: true },
        { name: '📈 Nível', value: level.toString(), inline: true },
        { name: '✨ XP', value: `${user.xp} XP`, inline: true },
        { name: '💰 Moedas', value: `${user.coins} 🪙`, inline: true },
        { name: '🎴 Personagens', value: `${totalCharacters} total`, inline: true },
        { name: '⭐ Raros', value: `${rareCharacters} (4⭐+)`, inline: true }
      )
      .addFields(
        { name: '📊 Progresso', value: `${100 - xpForNextLevel} / 100 XP para o próximo nível`, inline: false }
      )
      .setTimestamp()
      .setFooter({ 
        text: `Perfil criado em ${user.createdAt.toLocaleDateString('pt-BR')}` 
      });

    if (user.bio) {
      embed.addFields(
        { name: '📝 Bio', value: user.bio, inline: false }
      );
    }

    // Mostrar último daily se disponível
    if (user.lastDaily) {
      const timeSinceDaily = Date.now() - user.lastDaily.getTime();
      const hoursUntilDaily = Math.max(0, 24 - Math.floor(timeSinceDaily / (1000 * 60 * 60)));
      
      if (hoursUntilDaily > 0) {
        embed.addFields(
          { name: '⏰ Próximo Daily', value: `Em ${hoursUntilDaily}h`, inline: true }
        );
      } else {
        embed.addFields(
          { name: '💎 Daily', value: 'Disponível!', inline: true }
        );
      }
    } else {
      embed.addFields(
        { name: '💎 Daily', value: 'Disponível!', inline: true }
      );
    }

    await interaction.editReply({ embeds: [embed] });

  } catch (error) {
    console.error('Erro ao buscar perfil:', error);
    
    const embed = new EmbedBuilder()
      .setTitle('❌ Erro')
      .setDescription('Ocorreu um erro ao buscar o perfil. Tente novamente mais tarde.')
      .setColor('#FF4444');
    
    await interaction.editReply({ embeds: [embed] });
  }
}