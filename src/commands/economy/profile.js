import config from "../../config.js";
import { getOrCreateUser, getPrisma } from "../../database/client.js";

export default {
  name: "profile",
  description: "Mostra seu perfil ou o perfil de outro usuário.",
  category: "economy",
  usage: "profile [@usuário]",
  cooldown: 3000,
  
  async execute(client, message, args) {
    try {
      // Determinar usuário alvo
      let targetUser = message.author;
      
      if (args[0]) {
        // Tentar encontrar usuário mencionado
        const mention = message.mentions.users.first();
        if (mention) {
          targetUser = mention;
        } else {
          // Tentar encontrar por ID
          try {
            const userId = args[0].replace(/[<@!>]/g, '');
            const fetchedUser = await client.users.fetch(userId);
            if (fetchedUser) targetUser = fetchedUser;
          } catch (error) {
            return message.reply({
              embeds: [{
                color: config.colors.error,
                title: `${config.emojis.error} Usuário não encontrado`,
                description: "Não foi possível encontrar este usuário.",
              }],
            });
          }
        }
      }
      
      // Verificar se é bot
      if (targetUser.bot) {
        return message.reply({
          embeds: [{
            color: config.colors.warning,
            title: `${config.emojis.warning} Usuário Inválido`,
            description: "Bots não possuem perfis no sistema de economia.",
          }],
        });
      }
      
      // Buscar dados do usuário no banco
      const userData = await getOrCreateUser(targetUser.id, targetUser.tag);
      
      // Calcular informações adicionais
      const totalWealth = userData.coins + userData.bank;
      const nextLevelXp = userData.level * 1000; // XP necessário para próximo nível
      const xpProgress = (userData.xp / nextLevelXp) * 100;
      
      // Buscar ranking do usuário
      const prisma = getPrisma();
      const userRank = await prisma.user.count({
        where: {
          OR: [
            { coins: { gt: userData.coins } },
            {
              coins: userData.coins,
              bank: { gt: userData.bank }
            }
          ]
        }
      });
      
      // Determinar badge baseado no nível
      let levelBadge = "🥉";
      if (userData.level >= 50) levelBadge = "🏆";
      else if (userData.level >= 25) levelBadge = "🥇";
      else if (userData.level >= 10) levelBadge = "🥈";
      
      // Criar embed do perfil
      const profileEmbed = {
        color: config.colors.primary,
        title: `📊 Perfil de ${targetUser.username}`,
        thumbnail: {
          url: targetUser.displayAvatarURL({ dynamic: true, size: 256 }),
        },
        fields: [
          {
            name: "💰 Carteira",
            value: `${userData.coins.toLocaleString()} moedas`,
            inline: true,
          },
          {
            name: "🏦 Banco",
            value: `${userData.bank.toLocaleString()} moedas`,
            inline: true,
          },
          {
            name: "💎 Patrimônio Total",
            value: `${totalWealth.toLocaleString()} moedas`,
            inline: true,
          },
          {
            name: `${levelBadge} Nível`,
            value: `${userData.level}`,
            inline: true,
          },
          {
            name: "⭐ Experiência",
            value: `${userData.xp.toLocaleString()}/${nextLevelXp.toLocaleString()} XP`,
            inline: true,
          },
          {
            name: "📈 Ranking",
            value: `#${userRank + 1}`,
            inline: true,
          },
        ],
        footer: {
          text: `Membro desde ${userData.createdAt.toLocaleDateString('pt-BR')}`,
          icon_url: client.user.displayAvatarURL(),
        },
        timestamp: new Date().toISOString(),
      };
      
      // Adicionar barra de progresso de XP
      const progressBar = createProgressBar(xpProgress, 20);
      profileEmbed.fields.push({
        name: "📊 Progresso do Nível",
        value: `${progressBar} ${xpProgress.toFixed(1)}%`,
        inline: false,
      });
      
      // Adicionar informação sobre último daily
      if (userData.lastDaily) {
        const timeSinceDaily = Date.now() - new Date(userData.lastDaily).getTime();
        const hoursRemaining = Math.max(0, 24 - (timeSinceDaily / (1000 * 60 * 60)));
        
        if (hoursRemaining > 0) {
          profileEmbed.fields.push({
            name: "⏰ Próximo Daily",
            value: `Em ${hoursRemaining.toFixed(1)} horas`,
            inline: true,
          });
        } else {
          profileEmbed.fields.push({
            name: "🎁 Daily",
            value: "Disponível agora!",
            inline: true,
          });
        }
      }
      
      await message.reply({ embeds: [profileEmbed] });
      
    } catch (error) {
      console.error("Erro no comando profile:", error);
      
      const errorEmbed = {
        color: config.colors.error,
        title: `${config.emojis.error} Erro`,
        description: "Ocorreu um erro ao carregar o perfil. Tente novamente.",
      };
      
      await message.reply({ embeds: [errorEmbed] });
    }
  },
};

// Função auxiliar para criar barra de progresso
function createProgressBar(percentage, length = 20) {
  const filledLength = Math.round((percentage / 100) * length);
  const emptyLength = length - filledLength;
  
  const filledChar = '█';
  const emptyChar = '░';
  
  return `${filledChar.repeat(filledLength)}${emptyChar.repeat(emptyLength)}`;
}