import config from "../../config.js";
import { getOrCreateUser, getPrisma } from "../../database/client.js";

export default {
  name: "balance",
  aliases: ["bal", "wallet", "money", "coins"],
  description: "Mostra seu saldo atual ou o de outro usuário.",
  category: "economy",
  usage: "balance [@usuário]",
  cooldown: 2000,
  
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
            description: "Bots não possuem conta no sistema de economia.",
          }],
        });
      }
      
      // Buscar dados do usuário
      const userData = await getOrCreateUser(targetUser.id, targetUser.tag);
      
      // Calcular informações financeiras
      const totalWealth = userData.coins + userData.bank;
      const bankCapacity = Math.floor(userData.level * 1000 + 5000); // Capacidade do banco baseada no nível
      const bankUsage = userData.bank > 0 ? (userData.bank / bankCapacity) * 100 : 0;
      
      // Buscar posição no ranking financeiro
      const prisma = getPrisma();
      const wealthRank = await prisma.user.count({
        where: {
          OR: [
            { 
              coins: { gt: userData.coins },
              bank: { gte: userData.bank }
            },
            {
              coins: { gte: userData.coins },
              bank: { gt: userData.bank }
            }
          ]
        }
      });
      
      // Determinar ícone baseado no patrimônio
      let wealthIcon = "💰";
      if (totalWealth >= 1000000) wealthIcon = "💎";
      else if (totalWealth >= 100000) wealthIcon = "🏆";
      else if (totalWealth >= 50000) wealthIcon = "🥇";
      else if (totalWealth >= 10000) wealthIcon = "🥈";
      else if (totalWealth >= 1000) wealthIcon = "🥉";
      
      // Status da conta
      let accountStatus = "✅ Ativa";
      if (totalWealth === 0) accountStatus = "🔰 Nova";
      else if (totalWealth >= 500000) accountStatus = "⭐ VIP";
      
      // Criar barra de progresso para o banco
      const bankProgressBar = createProgressBar(bankUsage, 15);
      
      const balanceEmbed = {
        color: config.colors.primary,
        title: `${wealthIcon} Carteira de ${targetUser.username}`,
        thumbnail: {
          url: targetUser.displayAvatarURL({ dynamic: true, size: 256 }),
        },
        fields: [
          {
            name: "💰 Dinheiro em Mãos",
            value: `**${userData.coins.toLocaleString()}** moedas`,
            inline: true,
          },
          {
            name: "🏦 Banco",
            value: `**${userData.bank.toLocaleString()}** moedas`,
            inline: true,
          },
          {
            name: "💎 Patrimônio Total",
            value: `**${totalWealth.toLocaleString()}** moedas`,
            inline: true,
          },
          {
            name: "📊 Capacidade do Banco",
            value: `${bankProgressBar}\n${userData.bank.toLocaleString()}/${bankCapacity.toLocaleString()} (${bankUsage.toFixed(1)}%)`,
            inline: false,
          },
          {
            name: "📈 Ranking Financeiro",
            value: `Posição **#${wealthRank + 1}**`,
            inline: true,
          },
          {
            name: "🎯 Status da Conta",
            value: accountStatus,
            inline: true,
          },
        ],
        footer: {
          text: `${targetUser.tag} • Nível ${userData.level}`,
          icon_url: targetUser.displayAvatarURL({ dynamic: true }),
        },
        timestamp: new Date().toISOString(),
      };
      
      // Adicionar dicas se for o próprio usuário
      if (targetUser.id === message.author.id) {
        let tips = [];
        
        if (userData.coins > 1000 && userData.bank < bankCapacity * 0.8) {
          tips.push("💡 Considere depositar moedas no banco para segurança!");
        }
        
        if (totalWealth < 1000) {
          tips.push("💡 Use `m.daily`, `m.work` ou `m.beg` para ganhar moedas!");
        }
        
        if (userData.bank >= bankCapacity * 0.9) {
          tips.push("💡 Seu banco está quase cheio! Suba de nível para aumentar a capacidade.");
        }
        
        if (tips.length > 0) {
          balanceEmbed.fields.push({
            name: "💭 Dicas",
            value: tips.join("\n"),
            inline: false,
          });
        }
      }
      
      await message.reply({ embeds: [balanceEmbed] });
      
    } catch (error) {
      console.error("Erro no comando balance:", error);
      
      const errorEmbed = {
        color: config.colors.error,
        title: `${config.emojis.error} Erro`,
        description: "Ocorreu um erro ao carregar o saldo. Tente novamente.",
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