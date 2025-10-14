import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { prisma } from '../../database/client.js';
import { getRandomInt } from '../../utils/random.js';

export const data = new SlashCommandBuilder()
  .setName('daily')
  .setDescription('Recebe sua recompensa diária');

export async function execute(interaction) {
  await interaction.deferReply();

  try {
    // Buscar ou criar usuário no banco de dados
    let user = await prisma.user.findUnique({
      where: { discordId: interaction.user.id }
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          discordId: interaction.user.id,
          username: interaction.user.username
        }
      });
    }

    // Verificar se já recebeu o daily hoje
    const now = new Date();
    const lastDaily = user.lastDaily;
    
    if (lastDaily) {
      const timeSinceDaily = now.getTime() - lastDaily.getTime();
      const hoursUntilDaily = 24 - Math.floor(timeSinceDaily / (1000 * 60 * 60));
      
      if (hoursUntilDaily > 0) {
        const embed = new EmbedBuilder()
          .setTitle('⏰ Daily já coletado!')
          .setDescription(`Você já coletou seu daily hoje!\nVolte em **${hoursUntilDaily} horas** para coletar novamente.`)
          .setColor('#FFB347')
          .setThumbnail(interaction.user.displayAvatarURL())
          .setTimestamp();
        
        return await interaction.editReply({ embeds: [embed] });
      }
    }

    // Calcular recompensas baseadas no nível
    const level = Math.floor(user.xp / 100) + 1;
    const baseCoins = 50;
    const bonusCoins = Math.floor(level * 2.5);
    const totalCoins = baseCoins + bonusCoins + getRandomInt(10, 30);
    
    const baseXP = 25;
    const bonusXP = Math.floor(level * 1.2);
    const totalXP = baseXP + bonusXP + getRandomInt(5, 15);

    // Streak bonus
    let streakBonus = 0;
    let streak = 1;
    
    if (lastDaily) {
      const daysDiff = Math.floor((now - lastDaily) / (1000 * 60 * 60 * 24));
      if (daysDiff === 1) {
        // Mantém a streak
        streak = user.streak || 1;
        streak++;
        if (streak <= 7) {
          streakBonus = Math.floor(totalCoins * (streak * 0.1));
        }
      } else {
        // Reset da streak se perdeu um dia
        streak = 1;
      }
    }

    const finalCoins = totalCoins + streakBonus;
    const finalXP = totalXP;

    // Atualizar usuário no banco
    await prisma.user.update({
      where: { discordId: interaction.user.id },
      data: {
        coins: { increment: finalCoins },
        xp: { increment: finalXP },
        lastDaily: now,
        streak: streak
      }
    });

    // Verificar se subiu de nível
    const newLevel = Math.floor((user.xp + finalXP) / 100) + 1;
    const leveledUp = newLevel > level;

    const embed = new EmbedBuilder()
      .setTitle('💎 Daily Coletado!')
      .setDescription(`Parabéns ${interaction.user.username}! Você coletou sua recompensa diária!`)
      .setColor('#00FF7F')
      .setThumbnail(interaction.user.displayAvatarURL())
      .addFields(
        { name: '💰 Moedas', value: `+${finalCoins} 🪙`, inline: true },
        { name: '✨ XP', value: `+${finalXP} XP`, inline: true },
        { name: '🔥 Streak', value: `${streak} dias`, inline: true }
      )
      .setTimestamp()
      .setFooter({ 
        text: 'Volte amanhã para mais recompensas!' 
      });

    if (streakBonus > 0) {
      embed.addFields(
        { name: '🎁 Bônus Streak', value: `+${streakBonus} 🪙 (${streak}x)`, inline: true }
      );
    }

    if (leveledUp) {
      embed.addFields(
        { name: '🎉 Level Up!', value: `Você subiu para o nível ${newLevel}!`, inline: false }
      );
      embed.setColor('#FFD700');
    }

    // Chance de item especial (5%)
    if (Math.random() < 0.05) {
      embed.addFields(
        { name: '🎁 Bônus Especial!', value: 'Você encontrou um item especial! (Em breve)', inline: false }
      );
    }

    await interaction.editReply({ embeds: [embed] });

  } catch (error) {
    console.error('Erro ao processar daily:', error);
    
    const embed = new EmbedBuilder()
      .setTitle('❌ Erro')
      .setDescription('Ocorreu um erro ao processar seu daily. Tente novamente mais tarde.')
      .setColor('#FF4444');
    
    await interaction.editReply({ embeds: [embed] });
  }
}