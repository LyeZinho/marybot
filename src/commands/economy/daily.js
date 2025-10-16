import config from "../../config.js";
import { getOrCreateUser, canUseDailyReward, updateLastDaily, updateUserBalance, addTransaction } from "../../database/client.js";

export default {
  name: "daily",
  description: "Reivindique sua recompensa diária de moedas.",
  category: "economy",
  cooldown: 5000,
  
  async execute(client, message, args) {
    try {
      const discordId = message.author.id;
      const username = message.author.tag;
      
      // Verificar se o usuário existe, se não, criar
      await getOrCreateUser(discordId, username);
      
      // Verificar se pode usar o daily
      const canUse = await canUseDailyReward(discordId);
      
      if (!canUse) {
        const errorEmbed = {
          color: config.colors.warning,
          title: `${config.emojis.warning} Já coletado!`,
          description: "Você já coletou sua recompensa diária hoje!\nVolte amanhã para coletar novamente.",
          footer: {
            text: "O daily é resetado a cada 24 horas",
          },
        };
        
        return message.reply({ embeds: [errorEmbed] });
      }
      
      // Calcular recompensa (entre 100 e 500 moedas)
      const baseReward = 150;
      const bonusReward = Math.floor(Math.random() * 350); // 0-349
      const totalReward = baseReward + bonusReward;
      
      // Verificar se é streak (implementação simples)
      const isStreak = Math.random() < 0.3; // 30% de chance de streak
      const streakMultiplier = isStreak ? 1.5 : 1;
      const finalReward = Math.floor(totalReward * streakMultiplier);
      
      // Atualizar saldo do usuário
      await updateUserBalance(discordId, finalReward, 0);
      await updateLastDaily(discordId);
      
      // Registrar transação
      await addTransaction(
        (await getOrCreateUser(discordId, username)).id,
        'DAILY',
        finalReward,
        'Recompensa diária coletada'
      );
      
      // Criar embed de sucesso
      const successEmbed = {
        color: config.colors.success,
        title: `${config.emojis.success} Recompensa Diária Coletada!`,
        description: `Você recebeu **${finalReward}** moedas!`,
        fields: [
          {
            name: "💰 Recompensa Base",
            value: `${totalReward} moedas`,
            inline: true,
          },
        ],
        footer: {
          text: `${message.author.tag} • Volte amanhã para mais!`,
          icon_url: message.author.displayAvatarURL({ dynamic: true }),
        },
        timestamp: new Date().toISOString(),
      };
      
      // Adicionar campo de streak se aplicável
      if (isStreak) {
        successEmbed.fields.push({
          name: "🔥 Bônus de Streak!",
          value: `+${Math.floor(totalReward * 0.5)} moedas (${Math.floor((streakMultiplier - 1) * 100)}% bônus)`,
          inline: true,
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