import config from "../../config.js";
import { getPrisma } from "../../database/client.js";
import { economyAntiAbuse } from "../../utils/economyAntiAbuse.js";

export default {
  name: "econanalysis",
  aliases: ["econ", "economia", "analise-economia", "economy-stats"],
  description: "Análise detalhada da economia do servidor (apenas administradores).",
  category: "admin",
  usage: "econanalysis [user|security|overview|transactions]",
  cooldown: 10000,
  permissions: ["ManageGuild"],
  
  async execute(client, message, args) {
    try {
      const guildId = message.guild.id;
      const analysisType = args[0]?.toLowerCase() || 'overview';
      
      switch (analysisType) {
        case 'overview':
        case 'resumo':
          await this.showOverview(message, guildId);
          break;
          
        case 'user':
        case 'usuario':
          await this.showUserAnalysis(message, args, guildId);
          break;
          
        case 'security':
        case 'seguranca':
          await this.showSecurityAnalysis(message, guildId);
          break;
          
        case 'transactions':
        case 'transacoes':
          await this.showTransactionAnalysis(message, guildId);
          break;
          
        case 'help':
        case 'ajuda':
          await this.showHelp(message);
          break;
          
        default:
          await this.showOverview(message, guildId);
      }
      
    } catch (error) {
      console.error("Erro no comando econanalysis:", error);
      
      const errorEmbed = {
        color: config.colors.error,
        title: `${config.emojis.error} Erro na Análise`,
        description: "Ocorreu um erro ao gerar a análise econômica. Tente novamente.",
      };
      
      await message.reply({ embeds: [errorEmbed] });
    }
  },
  
  async showOverview(message, guildId) {
    const prisma = getPrisma();
    const now = new Date();
    const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const last7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    // Buscar estatísticas gerais
    const [
      totalUsers,
      totalWealth,
      richestUsers,
      transactionsToday,
      transactionsWeek,
      avgWealth,
      secStats
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.aggregate({
        _sum: {
          coins: true,
          bank: true,
        },
      }),
      prisma.user.findMany({
        select: {
          username: true,
          coins: true,
          bank: true,
        },
        orderBy: [
          { coins: 'desc' },
          { bank: 'desc' },
        ],
        take: 5,
      }),
      prisma.transaction.count({
        where: { createdAt: { gte: last24h } },
      }),
      prisma.transaction.count({
        where: { createdAt: { gte: last7d } },
      }),
      prisma.user.aggregate({
        _avg: {
          coins: true,
          bank: true,
        },
      }),
      economyAntiAbuse.getSecurityStats(guildId),
    ]);
    
    const totalCoins = (totalWealth._sum.coins || 0) + (totalWealth._sum.bank || 0);
    const avgTotalWealth = (avgWealth._avg.coins || 0) + (avgWealth._avg.bank || 0);
    
    const overviewEmbed = {
      color: config.colors.primary,
      title: "📊 Análise Econômica do Servidor",
      fields: [
        {
          name: "👥 Participantes Ativos",
          value: `${totalUsers.toLocaleString()} usuários`,
          inline: true,
        },
        {
          name: "💰 Riqueza Total",
          value: `${totalCoins.toLocaleString()} moedas`,
          inline: true,
        },
        {
          name: "📈 Riqueza Média",
          value: `${Math.round(avgTotalWealth).toLocaleString()} moedas`,
          inline: true,
        },
        {
          name: "📋 Transações (24h)",
          value: `${transactionsToday.toLocaleString()}`,
          inline: true,
        },
        {
          name: "📊 Transações (7d)",
          value: `${transactionsWeek.toLocaleString()}`,
          inline: true,
        },
        {
          name: "🛡️ Status Segurança",
          value: secStats ? 
            `${secStats.last24h.suspensions} suspensões\n${secStats.last24h.flags} alertas` :
            "Dados indisponíveis",
          inline: true,
        },
      ],
      footer: {
        text: "Use 'econanalysis help' para ver mais opções de análise",
      },
      timestamp: new Date().toISOString(),
    };
    
    // Adicionar ranking dos mais ricos
    if (richestUsers.length > 0) {
      const rankingText = richestUsers.map((user, index) => {
        const totalWealth = user.coins + user.bank;
        const medal = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣'][index];
        return `${medal} ${user.username}: ${totalWealth.toLocaleString()} moedas`;
      }).join('\n');
      
      overviewEmbed.fields.push({
        name: "🏆 Top 5 Mais Ricos",
        value: rankingText,
        inline: false,
      });
    }
    
    await message.reply({ embeds: [overviewEmbed] });
  },
  
  async showUserAnalysis(message, args, guildId) {
    if (!args[1]) {
      return message.reply({
        embeds: [{
          color: config.colors.warning,
          title: "❓ Usuário não especificado",
          description: "Use: `econanalysis user @usuário` ou `econanalysis user ID`",
        }],
      });
    }
    
    const prisma = getPrisma();
    let targetUser = null;
    
    // Tentar encontrar usuário
    const mention = message.mentions.users.first();
    if (mention) {
      targetUser = mention;
    } else {
      try {
        const userId = args[1].replace(/[<@!>]/g, '');
        targetUser = await message.client.users.fetch(userId);
      } catch (error) {
        return message.reply({
          embeds: [{
            color: config.colors.error,
            title: "❌ Usuário não encontrado",
            description: "Não foi possível encontrar este usuário.",
          }],
        });
      }
    }
    
    // Buscar dados do usuário
    const userData = await prisma.user.findUnique({
      where: { discordId: targetUser.id },
      include: {
        transactions: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });
    
    if (!userData) {
      return message.reply({
        embeds: [{
          color: config.colors.warning,
          title: "📭 Usuário sem dados",
          description: "Este usuário ainda não possui dados no sistema de economia.",
        }],
      });
    }
    
    // Estatísticas do usuário
    const last7d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const recentTransactions = userData.transactions.filter(t => t.createdAt >= last7d);
    
    const totalWealth = userData.coins + userData.bank;
    const totalEarned = userData.transactions
      .filter(t => t.amount > 0)
      .reduce((sum, t) => sum + t.amount, 0);
    const totalSpent = userData.transactions
      .filter(t => t.amount < 0)
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);
    
    const userEmbed = {
      color: config.colors.primary,
      title: `📈 Análise Econômica: ${targetUser.username}`,
      thumbnail: {
        url: targetUser.displayAvatarURL({ dynamic: true }),
      },
      fields: [
        {
          name: "💰 Patrimônio Atual",
          value: `${totalWealth.toLocaleString()} moedas`,
          inline: true,
        },
        {
          name: "📊 Carteira/Banco",
          value: `${userData.coins.toLocaleString()} / ${userData.bank.toLocaleString()}`,
          inline: true,
        },
        {
          name: "🔥 Streak Daily",
          value: `${userData.dailyStreak || 0} dias`,
          inline: true,
        },
        {
          name: "📈 Total Ganho",
          value: `${totalEarned.toLocaleString()} moedas`,
          inline: true,
        },
        {
          name: "📉 Total Gasto",
          value: `${totalSpent.toLocaleString()} moedas`,
          inline: true,
        },
        {
          name: "⚡ Atividade (7d)",
          value: `${recentTransactions.length} transações`,
          inline: true,
        },
      ],
      footer: {
        text: `Membro desde ${userData.createdAt.toLocaleDateString('pt-BR')}`,
      },
      timestamp: new Date().toISOString(),
    };
    
    // Adicionar últimas transações
    if (userData.transactions.length > 0) {
      const recentTxs = userData.transactions.slice(0, 5).map(tx => {
        const emoji = tx.amount > 0 ? '📈' : '📉';
        const sign = tx.amount > 0 ? '+' : '';
        return `${emoji} ${sign}${tx.amount.toLocaleString()} - ${tx.reason}`;
      });
      
      userEmbed.fields.push({
        name: "📋 Últimas Transações",
        value: recentTxs.join('\n') || 'Nenhuma transação',
        inline: false,
      });
    }
    
    await message.reply({ embeds: [userEmbed] });
  },
  
  async showSecurityAnalysis(message, guildId) {
    const secStats = await economyAntiAbuse.getSecurityStats(guildId);
    
    if (!secStats) {
      return message.reply({
        embeds: [{
          color: config.colors.error,
          title: "❌ Erro nos Dados",
          description: "Não foi possível obter as estatísticas de segurança.",
        }],
      });
    }
    
    // Determinar nível de alerta
    let alertLevel = "🟢 Baixo";
    let alertColor = 0x00FF00;
    
    const totalIssues24h = secStats.last24h.suspensions + secStats.last24h.flags;
    if (totalIssues24h > 10) {
      alertLevel = "🔴 Alto";
      alertColor = 0xFF0000;
    } else if (totalIssues24h > 5) {
      alertLevel = "🟡 Médio";
      alertColor = 0xFFFF00;
    }
    
    const securityEmbed = {
      color: alertColor,
      title: "🛡️ Análise de Segurança Econômica",
      fields: [
        {
          name: "📊 Últimas 24 horas",
          value: `**Suspensões:** ${secStats.last24h.suspensions}\n**Alertas:** ${secStats.last24h.flags}\n**Transações:** ${secStats.last24h.totalTransactions}\n**Grandes Transações:** ${secStats.last24h.largeTransactions}`,
          inline: true,
        },
        {
          name: "📈 Últimos 7 dias",
          value: `**Suspensões:** ${secStats.last7d.suspensions}\n**Alertas:** ${secStats.last7d.flags}`,
          inline: true,
        },
        {
          name: "⚠️ Status Atual",
          value: `**Nível de Alerta:** ${alertLevel}\n**Suspensões Ativas:** ${secStats.activeSuspensions}`,
          inline: true,
        },
      ],
      footer: {
        text: "Sistema de monitoramento automático ativo",
      },
      timestamp: new Date().toISOString(),
    };
    
    // Adicionar recomendações
    let recommendations = [];
    
    if (secStats.last24h.suspensions > 3) {
      recommendations.push("⚠️ Múltiplas suspensões detectadas - revisar políticas");
    }
    
    if (secStats.last24h.largeTransactions > secStats.last24h.totalTransactions * 0.1) {
      recommendations.push("💰 Alto volume de grandes transações - monitorar lavagem");
    }
    
    if (secStats.activeSuspensions > 5) {
      recommendations.push("🚫 Muitas suspensões ativas - considerar revisão manual");
    }
    
    if (recommendations.length > 0) {
      securityEmbed.fields.push({
        name: "💡 Recomendações",
        value: recommendations.join('\n'),
        inline: false,
      });
    }
    
    await message.reply({ embeds: [securityEmbed] });
  },
  
  async showTransactionAnalysis(message, guildId) {
    const prisma = getPrisma();
    const now = new Date();
    const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    
    // Análise de transações
    const [
      transactionsByType,
      largeTransactions,
      topSpenders,
      topEarners,
    ] = await Promise.all([
      prisma.transaction.groupBy({
        by: ['type'],
        where: { createdAt: { gte: last24h } },
        _count: { type: true },
        _sum: { amount: true },
      }),
      prisma.transaction.findMany({
        where: {
          createdAt: { gte: last24h },
          OR: [
            { amount: { gt: 10000 } },
            { amount: { lt: -10000 } },
          ],
        },
        include: {
          user: { select: { username: true } },
        },
        orderBy: { amount: 'desc' },
        take: 10,
      }),
      prisma.transaction.groupBy({
        by: ['userId'],
        where: {
          createdAt: { gte: last24h },
          amount: { lt: 0 },
        },
        _sum: { amount: true },
        orderBy: { _sum: { amount: 'asc' } },
        take: 5,
      }),
      prisma.transaction.groupBy({
        by: ['userId'],
        where: {
          createdAt: { gte: last24h },
          amount: { gt: 0 },
        },
        _sum: { amount: true },
        orderBy: { _sum: { amount: 'desc' } },
        take: 5,
      }),
    ]);
    
    const transactionEmbed = {
      color: config.colors.primary,
      title: "💳 Análise de Transações (24h)",
      fields: [],
      timestamp: new Date().toISOString(),
    };
    
    // Transações por tipo
    if (transactionsByType.length > 0) {
      const typeText = transactionsByType.map(type => {
        const emoji = type.type === 'DAILY' ? '📅' : 
                     type.type === 'WORK' ? '💼' :
                     type.type === 'BEG' ? '🙏' :
                     type.type === 'TRANSFER_OUT' ? '📤' :
                     type.type === 'TRANSFER_IN' ? '📥' : '📊';
        return `${emoji} ${type.type}: ${type._count.type} (${(type._sum.amount || 0).toLocaleString()})`;
      }).join('\n');
      
      transactionEmbed.fields.push({
        name: "📊 Por Tipo",
        value: typeText,
        inline: false,
      });
    }
    
    // Grandes transações
    if (largeTransactions.length > 0) {
      const largeText = largeTransactions.slice(0, 5).map(tx => {
        const emoji = tx.amount > 0 ? '📈' : '📉';
        return `${emoji} ${tx.amount.toLocaleString()} - ${tx.user?.username || 'Usuário desconhecido'}`;
      }).join('\n');
      
      transactionEmbed.fields.push({
        name: "💰 Grandes Transações",
        value: largeText,
        inline: false,
      });
    }
    
    await message.reply({ embeds: [transactionEmbed] });
  },
  
  async showHelp(message) {
    const helpEmbed = {
      color: config.colors.primary,
      title: "📋 Ajuda - Análise Econômica",
      description: "Sistema de análise e monitoramento da economia do servidor.",
      fields: [
        {
          name: "📊 `econanalysis overview`",
          value: "Visão geral da economia do servidor",
          inline: false,
        },
        {
          name: "👤 `econanalysis user @usuário`",
          value: "Análise detalhada de um usuário específico",
          inline: false,
        },
        {
          name: "🛡️ `econanalysis security`",
          value: "Estatísticas de segurança e anti-abuso",
          inline: false,
        },
        {
          name: "💳 `econanalysis transactions`",
          value: "Análise de transações das últimas 24h",
          inline: false,
        },
      ],
      footer: {
        text: "Comando restrito a administradores do servidor",
      },
    };
    
    await message.reply({ embeds: [helpEmbed] });
  },
};