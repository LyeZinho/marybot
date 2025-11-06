import config from "../../config.js";
import { getOrCreateUser, getPrisma, updateUserBalance, addTransaction } from "../../database/client.js";
import { economyAntiAbuse } from "../../utils/economyAntiAbuse.js";

export default {
  name: "daily",
  description: "Reivindique sua recompensa diária de moedas com sistema de streaks.",
  category: "economy",
  cooldown: 5000,
  
  async execute(client, message, args) {
    try {
      const discordId = message.author.id;
      const username = message.author.tag;
      const prisma = getPrisma();
      
      // Verificar se o usuário existe, se não, criar
      const user = await getOrCreateUser(discordId, username);
      
      // Verificar rate limiting e anti-abuso
      const abuseCheck = await economyAntiAbuse.isActionAllowed(discordId, message.guild?.id, 'daily');
      if (!abuseCheck.allowed) {
        const errorEmbed = {
          color: config.colors.error,
          title: `${config.emojis.error} Ação Bloqueada`,
          description: abuseCheck.message,
        };
        return message.reply({ embeds: [errorEmbed] });
      }
      
      // Verificar se pode usar o daily
      const canUse = await canUseDailyReward(discordId);
      
      if (!canUse) {
        // Calcular tempo restante
        const lastDaily = new Date(user.lastDaily);
        const now = new Date();
        const nextDaily = new Date(lastDaily.getTime() + 24 * 60 * 60 * 1000);
        const timeRemaining = nextDaily - now;
        const hoursRemaining = Math.floor(timeRemaining / (1000 * 60 * 60));
        const minutesRemaining = Math.floor((timeRemaining % (1000 * 60 * 60)) / (1000 * 60));
        
        const errorEmbed = {
          color: config.colors.warning,
          title: `${config.emojis.warning} Já coletado!`,
          description: `Você já coletou sua recompensa diária hoje!\n\n⏰ **Próximo daily em:** ${hoursRemaining}h ${minutesRemaining}m\n🔥 **Streak atual:** ${user.dailyStreak} dias`,
          footer: {
            text: "O daily é resetado a cada 24 horas",
          },
        };
        
        return message.reply({ embeds: [errorEmbed] });
      }
      
      // Calcular streak
      const now = new Date();
      const lastDaily = user.lastDaily ? new Date(user.lastDaily) : null;
      let newStreak = 1;
      let streakBroken = false;
      
      if (lastDaily) {
        const timeDiff = now - lastDaily;
        const hoursDiff = timeDiff / (1000 * 60 * 60);
        
        if (hoursDiff >= 24 && hoursDiff <= 48) {
          // Streak continua
          newStreak = user.dailyStreak + 1;
        } else if (hoursDiff > 48) {
          // Streak quebrada
          newStreak = 1;
          streakBroken = true;
        }
      }
      
      // Calcular recompensa base
      const baseReward = 150;
      const randomBonus = Math.floor(Math.random() * 100) + 50; // 50-149
      let totalReward = baseReward + randomBonus;
      
      // Bônus de streak
      const streakBonus = Math.min(newStreak * 25, 500); // Máximo 500 de bônus
      const streakMultiplier = 1 + (Math.min(newStreak, 7) * 0.1); // Até 70% extra nos primeiros 7 dias
      
      totalReward = Math.floor(totalReward * streakMultiplier) + streakBonus;
      
      // Bônus especial para streaks longos
      let specialBonus = 0;
      let specialMessage = "";
      
      if (newStreak === 7) {
        specialBonus = 1000;
        specialMessage = "🎊 **Bônus de 1 semana:** +1000 moedas!";
      } else if (newStreak === 30) {
        specialBonus = 5000;
        specialMessage = "🏆 **Bônus de 1 mês:** +5000 moedas!";
      } else if (newStreak === 100) {
        specialBonus = 15000;
        specialMessage = "⭐ **Bônus de 100 dias:** +15000 moedas!";
      } else if (newStreak % 50 === 0 && newStreak >= 50) {
        specialBonus = newStreak * 100;
        specialMessage = `🌟 **Bônus de ${newStreak} dias:** +${specialBonus} moedas!`;
      }
      
      const finalReward = totalReward + specialBonus;
      
      // Atualizar dados do usuário
      const updatedUser = await prisma.user.update({
        where: { discordId },
        data: {
          coins: { increment: finalReward },
          lastDaily: now,
          dailyStreak: newStreak,
          longestStreak: Math.max(newStreak, user.longestStreak || 0),
        },
      });
      
      // Registrar transação
      await addTransaction(
        updatedUser.id,
        'DAILY',
        finalReward,
        `Recompensa diária coletada (Streak: ${newStreak})`
      );
      
      // Registrar ação no sistema anti-abuso
      await economyAntiAbuse.recordAction(discordId, message.guild?.id, 'daily', finalReward, {
        streak: newStreak,
        specialBonus,
      });
      
      // Criar embed de sucesso
      const successEmbed = {
        color: newStreak >= 7 ? config.colors.success : config.colors.primary,
        title: `${config.emojis.success} Recompensa Diária Coletada!`,
        description: `Você recebeu **${finalReward.toLocaleString()}** moedas!`,
        fields: [
          {
            name: "💰 Recompensa Base",
            value: `${(baseReward + randomBonus).toLocaleString()} moedas`,
            inline: true,
          },
          {
            name: "🔥 Streak Atual",
            value: `${newStreak} dia${newStreak !== 1 ? 's' : ''}`,
            inline: true,
          },
          {
            name: "🏆 Melhor Streak",
            value: `${updatedUser.longestStreak} dia${updatedUser.longestStreak !== 1 ? 's' : ''}`,
            inline: true,
          },
        ],
        footer: {
          text: `${message.author.tag} • Volte amanhã para continuar o streak!`,
          icon_url: message.author.displayAvatarURL({ dynamic: true }),
        },
        timestamp: new Date().toISOString(),
      };
      
      // Adicionar bônus de streak
      if (streakBonus > 0 || streakMultiplier > 1) {
        const totalStreakBonus = (totalReward - baseReward - randomBonus) + streakBonus;
        successEmbed.fields.push({
          name: "⚡ Bônus de Streak",
          value: `+${totalStreakBonus.toLocaleString()} moedas (${Math.floor((streakMultiplier - 1) * 100)}% + ${streakBonus})`,
          inline: false,
        });
      }
      
      // Adicionar mensagem especial se houver
      if (specialMessage) {
        successEmbed.fields.push({
          name: "🎁 Bônus Especial",
          value: specialMessage,
          inline: false,
        });
      }
      
      // Adicionar aviso se streak foi quebrada
      if (streakBroken && user.dailyStreak > 1) {
        successEmbed.fields.push({
          name: "💔 Streak Perdida",
          value: `Você perdeu seu streak de ${user.dailyStreak} dias por não coletar ontem.\nNão desista! Comece um novo streak hoje!`,
          inline: false,
        });
      }
      
      // Dicas para próximos marcos
      const nextMilestone = getNextMilestone(newStreak);
      if (nextMilestone) {
        successEmbed.fields.push({
          name: "🎯 Próximo Marco",
          value: nextMilestone,
          inline: false,
        });
      }
      
      await message.reply({ embeds: [successEmbed] });
      
    } catch (error) {
      console.error("Erro no comando daily:", error);
      
      const errorEmbed = {
        color: config.colors.error,
        title: `${config.emojis.error} Erro`,
        description: "Ocorreu um erro ao processar sua recompensa diária. Tente novamente.",
      };
      
      await message.reply({ embeds: [errorEmbed] });
    }
  },
};

// Função para verificar se pode usar daily
async function canUseDailyReward(discordId) {
  const prisma = getPrisma();
  
  const user = await prisma.user.findUnique({
    where: { discordId },
    select: { lastDaily: true },
  });
  
  if (!user?.lastDaily) return true;
  
  const now = new Date();
  const lastDaily = new Date(user.lastDaily);
  const diffHours = Math.abs(now - lastDaily) / 36e5;
  
  return diffHours >= 24;
}

// Função para obter próximo marco de streak
function getNextMilestone(currentStreak) {
  const milestones = [7, 30, 50, 100, 200, 365];
  const nextMilestone = milestones.find(milestone => milestone > currentStreak);
  
  if (!nextMilestone) return null;
  
  const daysUntil = nextMilestone - currentStreak;
  let reward = "";
  
  switch (nextMilestone) {
    case 7:
      reward = "1.000 moedas";
      break;
    case 30:
      reward = "5.000 moedas";
      break;
    case 50:
      reward = "5.000 moedas";
      break;
    case 100:
      reward = "15.000 moedas";
      break;
    case 200:
      reward = "20.000 moedas";
      break;
    case 365:
      reward = "36.500 moedas";
      break;
  }
  
  return `${nextMilestone} dias (em ${daysUntil} dia${daysUntil !== 1 ? 's' : ''}) - **${reward}**`;
}