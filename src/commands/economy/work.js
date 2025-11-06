import config from "../../config.js";
import { getOrCreateUser, getPrisma, updateUserBalance, addTransaction } from "../../database/client.js";
import { economyAntiAbuse } from "../../utils/economyAntiAbuse.js";

export default {
  name: "work",
  aliases: ["job", "trabalho", "trabalhar"],
  description: "Trabalhe para ganhar moedas. Cooldown de 1 hora.",
  category: "economy",
  usage: "work",
  cooldown: 3000,
  
  async execute(client, message, args) {
    try {
      const discordId = message.author.id;
      const username = message.author.tag;
      const prisma = getPrisma();
      
      // Verificar se o usuário existe, se não, criar
      const user = await getOrCreateUser(discordId, username);
      
      // Verificar rate limiting e anti-abuso
      const abuseCheck = await economyAntiAbuse.isActionAllowed(discordId, message.guild?.id, 'work');
      if (!abuseCheck.allowed) {
        const errorEmbed = {
          color: config.colors.error,
          title: `${config.emojis.error} Ação Bloqueada`,
          description: abuseCheck.message,
        };
        return message.reply({ embeds: [errorEmbed] });
      }
      
      // Verificar cooldown de trabalho (1 hora)
      const canWork = await canUseWork(discordId);
      
      if (!canWork.allowed) {
        const errorEmbed = {
          color: config.colors.warning,
          title: `${config.emojis.warning} Ainda trabalhando!`,
          description: `Você ainda está cansado do último trabalho.\n\n⏰ **Pode trabalhar novamente em:** ${canWork.timeRemaining}`,
          footer: {
            text: "O cooldown de trabalho é de 1 hora",
          },
        };
        
        return message.reply({ embeds: [errorEmbed] });
      }
      
      // Trabalhos disponíveis com diferentes dificuldades e recompensas
      const jobs = [
        // Trabalhos fáceis (mais comuns)
        { name: "Entregador de pizza", emoji: "🍕", min: 80, max: 150, rarity: 40 },
        { name: "Vendedor de limonada", emoji: "🥤", min: 60, max: 120, rarity: 35 },
        { name: "Lavar carros", emoji: "🚗", min: 90, max: 160, rarity: 35 },
        { name: "Passeador de cães", emoji: "🐕", min: 70, max: 140, rarity: 40 },
        { name: "Garçom", emoji: "🍽️", min: 100, max: 180, rarity: 30 },
        
        // Trabalhos médios
        { name: "Programador freelancer", emoji: "💻", min: 200, max: 400, rarity: 20 },
        { name: "Designer gráfico", emoji: "🎨", min: 180, max: 350, rarity: 18 },
        { name: "Instrutor de fitness", emoji: "💪", min: 150, max: 300, rarity: 15 },
        { name: "Motorista de Uber", emoji: "🚕", min: 120, max: 250, rarity: 25 },
        { name: "Vendedor online", emoji: "📦", min: 160, max: 320, rarity: 20 },
        
        // Trabalhos raros (bem pagos)
        { name: "Consultor empresarial", emoji: "💼", min: 500, max: 800, rarity: 8 },
        { name: "Investidor de cripto", emoji: "₿", min: 300, max: 1200, rarity: 5 },
        { name: "Influencer digital", emoji: "📱", min: 400, max: 900, rarity: 6 },
        { name: "Desenvolvedor de jogos", emoji: "🎮", min: 600, max: 1000, rarity: 4 },
        
        // Trabalhos lendários (muito raros)
        { name: "CEO por um dia", emoji: "👑", min: 2000, max: 5000, rarity: 1 },
        { name: "Encontrou tesouro pirata", emoji: "🏴‍☠️", min: 1500, max: 3000, rarity: 0.5 },
        { name: "Ganhou na loteria", emoji: "🎰", min: 3000, max: 8000, rarity: 0.3 },
      ];
      
      // Selecionar trabalho baseado na raridade
      const selectedJob = selectRandomJob(jobs);
      
      // Calcular recompensa base
      let baseReward = Math.floor(Math.random() * (selectedJob.max - selectedJob.min + 1)) + selectedJob.min;
      
      // Bônus baseado no nível do usuário (1% por nível)
      const levelBonus = Math.floor(baseReward * (user.level * 0.01));
      
      // Chance de evento especial (5% de chance)
      let eventBonus = 0;
      let eventMessage = "";
      const eventChance = Math.random();
      
      if (eventChance < 0.02) { // 2% - Evento muito raro
        eventBonus = Math.floor(baseReward * 2);
        eventMessage = "🌟 **Evento Especial:** Seu chefe ficou impressionado e dobrou seu pagamento!";
      } else if (eventChance < 0.05) { // 3% - Evento raro
        eventBonus = Math.floor(baseReward * 0.5);
        eventMessage = "⭐ **Bônus de Performance:** Você fez um trabalho excepcional!";
      } else if (eventChance < 0.15) { // 10% - Gorjeta
        eventBonus = Math.floor(Math.random() * 50) + 20;
        eventMessage = "💝 **Gorjeta:** Um cliente generoso te deu uma gorjeta!";
      }
      
      const finalReward = baseReward + levelBonus + eventBonus;
      
      // Atualizar dados do usuário
      const updatedUser = await prisma.user.update({
        where: { discordId },
        data: {
          coins: { increment: finalReward },
          lastWork: new Date(),
          xp: { increment: 5 }, // 5 XP por trabalho
        },
      });
      
      // Registrar transação
      await addTransaction(
        updatedUser.id,
        'WORK',
        finalReward,
        `Trabalhou como: ${selectedJob.name}`
      );
      
      // Registrar ação no sistema anti-abuso
      await economyAntiAbuse.recordAction(discordId, message.guild?.id, 'work', finalReward, {
        job: selectedJob.name,
        rarity: selectedJob.rarity,
        levelBonus,
        eventBonus,
      });
      
      // Determinar cor do embed baseado na raridade do trabalho
      let embedColor = config.colors.primary;
      if (selectedJob.rarity <= 1) embedColor = 0xFFD700; // Dourado para lendário
      else if (selectedJob.rarity <= 8) embedColor = 0x9932CC; // Roxo para raro
      else if (selectedJob.rarity <= 20) embedColor = 0x00CED1; // Azul para médio
      
      // Criar embed de sucesso
      const workEmbed = {
        color: embedColor,
        title: `${selectedJob.emoji} Trabalho Concluído!`,
        description: `Você trabalhou como **${selectedJob.name}** e ganhou **${finalReward.toLocaleString()}** moedas!`,
        fields: [
          {
            name: "💰 Pagamento Base",
            value: `${baseReward.toLocaleString()} moedas`,
            inline: true,
          },
          {
            name: "📈 Bônus de Nível",
            value: `+${levelBonus.toLocaleString()} moedas (${user.level}%)`,
            inline: true,
          },
          {
            name: "⏰ Próximo Trabalho",
            value: "Disponível em 1 hora",
            inline: true,
          },
        ],
        footer: {
          text: `${message.author.tag} • +5 XP ganhos`,
          icon_url: message.author.displayAvatarURL({ dynamic: true }),
        },
        timestamp: new Date().toISOString(),
      };
      
      // Adicionar evento especial se houver
      if (eventMessage) {
        workEmbed.fields.push({
          name: "🎁 Evento Especial",
          value: `${eventMessage}\n+${eventBonus.toLocaleString()} moedas extras!`,
          inline: false,
        });
      }
      
      // Adicionar raridade do trabalho
      let rarityText = "⚪ Comum";
      if (selectedJob.rarity <= 1) rarityText = "🟡 Lendário";
      else if (selectedJob.rarity <= 8) rarityText = "🟣 Raro";
      else if (selectedJob.rarity <= 20) rarityText = "🔵 Incomum";
      
      workEmbed.fields.push({
        name: "🎯 Raridade do Trabalho",
        value: rarityText,
        inline: true,
      });
      
      await message.reply({ embeds: [workEmbed] });
      
    } catch (error) {
      console.error("Erro no comando work:", error);
      
      const errorEmbed = {
        color: config.colors.error,
        title: `${config.emojis.error} Erro`,
        description: "Ocorreu um erro durante o trabalho. Tente novamente.",
      };
      
      await message.reply({ embeds: [errorEmbed] });
    }
  },
};

// Função para verificar se pode trabalhar
async function canUseWork(discordId) {
  const prisma = getPrisma();
  
  const user = await prisma.user.findUnique({
    where: { discordId },
    select: { lastWork: true },
  });
  
  if (!user?.lastWork) {
    return { allowed: true };
  }
  
  const now = new Date();
  const lastWork = new Date(user.lastWork);
  const diffMs = now - lastWork;
  const diffHours = diffMs / (1000 * 60 * 60);
  
  if (diffHours >= 1) {
    return { allowed: true };
  }
  
  const timeRemaining = 1 - diffHours;
  const minutes = Math.ceil(timeRemaining * 60);
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  
  let timeString = "";
  if (hours > 0) {
    timeString = `${hours}h ${remainingMinutes}m`;
  } else {
    timeString = `${remainingMinutes}m`;
  }
  
  return {
    allowed: false,
    timeRemaining: timeString,
  };
}

// Função para selecionar trabalho baseado na raridade
function selectRandomJob(jobs) {
  // Criar array com base na raridade (quanto menor a raridade, menor a chance)
  const weightedJobs = [];
  
  jobs.forEach(job => {
    const weight = Math.max(1, Math.floor(100 / job.rarity));
    for (let i = 0; i < weight; i++) {
      weightedJobs.push(job);
    }
  });
  
  return weightedJobs[Math.floor(Math.random() * weightedJobs.length)];
}