import config from "../../config.js";
import { getOrCreateUser, getPrisma, updateUserBalance, addTransaction } from "../../database/client.js";
import { economyAntiAbuse } from "../../utils/economyAntiAbuse.js";

export default {
  name: "beg",
  aliases: ["mendigar", "pedir", "implore"],
  description: "Peça esmolas para outras pessoas. Pequenas recompensas com chance de falhar. Cooldown de 30 minutos.",
  category: "economy",
  usage: "beg",
  cooldown: 2000,
  
  async execute(client, message, args) {
    try {
      const discordId = message.author.id;
      const username = message.author.tag;
      const prisma = getPrisma();
      
      // Verificar se o usuário existe, se não, criar
      const user = await getOrCreateUser(discordId, username);
      
      // Verificar rate limiting e anti-abuso
      const abuseCheck = await economyAntiAbuse.isActionAllowed(discordId, message.guild?.id, 'beg');
      if (!abuseCheck.allowed) {
        const errorEmbed = {
          color: config.colors.error,
          title: `${config.emojis.error} Ação Bloqueada`,
          description: abuseCheck.message,
        };
        return message.reply({ embeds: [errorEmbed] });
      }
      
      // Verificar cooldown de mendigar (30 minutos)
      const canBeg = await canUseBeg(discordId);
      
      if (!canBeg.allowed) {
        const errorEmbed = {
          color: config.colors.warning,
          title: `${config.emojis.warning} Muito cedo!`,
          description: `As pessoas ainda lembram da última vez que você pediu dinheiro.\n\n⏰ **Pode mendigar novamente em:** ${canBeg.timeRemaining}`,
          footer: {
            text: "O cooldown de mendigar é de 30 minutos",
          },
        };
        
        return message.reply({ embeds: [errorEmbed] });
      }
      
      // Chances de sucesso e falha
      const successRate = 0.7; // 70% de chance de sucesso
      const isSuccessful = Math.random() < successRate;
      
      if (!isSuccessful) {
        // Falha - sem recompensa
        const failureResponses = [
          { message: "😔 Uma pessoa ignorou você completamente.", emoji: "😔" },
          { message: "🙄 Alguém disse: 'Arranja um emprego!'", emoji: "🙄" },
          { message: "😬 A pessoa fingiu que não te viu.", emoji: "😬" },
          { message: "🏃 A pessoa saiu correndo quando te viu.", emoji: "🏃" },
          { message: "💸 Alguém disse que também está sem dinheiro.", emoji: "💸" },
          { message: "📱 A pessoa estava muito ocupada no celular.", emoji: "📱" },
          { message: "🎧 A pessoa estava com fones e não te ouviu.", emoji: "🎧" },
          { message: "👮 Um guarda te disse para sair dali.", emoji: "👮" },
        ];
        
        const failure = failureResponses[Math.floor(Math.random() * failureResponses.length)];
        
        // Atualizar cooldown mesmo sem recompensa
        await prisma.user.update({
          where: { discordId },
          data: { lastBeg: new Date() },
        });
        
        const failEmbed = {
          color: config.colors.error,
          title: `${failure.emoji} Que azar!`,
          description: `${failure.message}\n\nVocê não conseguiu nada desta vez.`,
          footer: {
            text: "Tente novamente em 30 minutos",
          },
        };
        
        return message.reply({ embeds: [failEmbed] });
      }
      
      // Sucesso - calcular recompensa
      const baseReward = Math.floor(Math.random() * 40) + 10; // 10-49 moedas base
      
      // Diferentes tipos de pessoas generosas
      const benefactors = [
        { name: "uma velhinha gentil", emoji: "👵", multiplier: 1.0, extraMsg: "" },
        { name: "um empresário apressado", emoji: "💼", multiplier: 1.2, extraMsg: "Ele estava com pressa mas foi generoso!" },
        { name: "uma mãe com criança", emoji: "👩‍👧", multiplier: 0.8, extraMsg: "Ela te deu o que podia." },
        { name: "um adolescente legal", emoji: "🧑", multiplier: 0.9, extraMsg: "Ele compartilhou sua mesada contigo!" },
        { name: "um turista perdido", emoji: "🗺️", multiplier: 1.1, extraMsg: "Ele estava perdido mas te ajudou mesmo assim!" },
        { name: "um aposentado sorridente", emoji: "👴", multiplier: 1.3, extraMsg: "Ele disse que já passou por isso na juventude." },
        { name: "uma estudante universitária", emoji: "🎓", multiplier: 0.7, extraMsg: "Ela também não tem muito, mas quis ajudar." },
        { name: "um delivery boy", emoji: "🛵", multiplier: 1.0, extraMsg: "Ele dividiu as gorjetas do dia contigo!" },
        
        // Eventos especiais (raros)
        { name: "um milionário excêntrico", emoji: "🤵", multiplier: 5.0, extraMsg: "🌟 ELE TE DEU UMA NOTA DE 100!", special: true },
        { name: "uma celebridade disfarçada", emoji: "🕶️", multiplier: 4.0, extraMsg: "⭐ Você não acreditaria se eu contasse quem era!", special: true },
        { name: "um ganhador da loteria", emoji: "🎰", multiplier: 3.5, extraMsg: "🎉 Ele acabou de ganhar na loteria e compartilhou!", special: true },
      ];
      
      // Selecionar benfeitor (eventos especiais têm 3% de chance)
      let selectedBenefactor;
      const isSpecialEvent = Math.random() < 0.03;
      
      if (isSpecialEvent) {
        const specialBenefactors = benefactors.filter(b => b.special);
        selectedBenefactor = specialBenefactors[Math.floor(Math.random() * specialBenefactors.length)];
      } else {
        const normalBenefactors = benefactors.filter(b => !b.special);
        selectedBenefactor = normalBenefactors[Math.floor(Math.random() * normalBenefactors.length)];
      }
      
      // Calcular recompensa final
      let finalReward = Math.floor(baseReward * selectedBenefactor.multiplier);
      
      // Bônus de pena (quanto menor o saldo, maior a pena)
      let pityBonus = 0;
      if (user.coins < 100) {
        pityBonus = Math.floor(Math.random() * 20) + 5; // 5-24 extra
      } else if (user.coins < 500) {
        pityBonus = Math.floor(Math.random() * 10) + 2; // 2-11 extra
      }
      
      finalReward += pityBonus;
      
      // Chance de encontrar moeda no chão (5%)
      let foundCoin = 0;
      if (Math.random() < 0.05) {
        foundCoin = Math.floor(Math.random() * 15) + 5; // 5-19 moedas
        finalReward += foundCoin;
      }
      
      // Atualizar dados do usuário
      const updatedUser = await prisma.user.update({
        where: { discordId },
        data: {
          coins: { increment: finalReward },
          lastBeg: new Date(),
          xp: { increment: 1 }, // 1 XP por tentativa bem-sucedida
        },
      });
      
      // Registrar transação
      await addTransaction(
        updatedUser.id,
        'BEG',
        finalReward,
        `Recebeu de: ${selectedBenefactor.name}`
      );
      
      // Registrar ação no sistema anti-abuso
      await economyAntiAbuse.recordAction(discordId, message.guild?.id, 'beg', finalReward, {
        benefactor: selectedBenefactor.name,
        special: selectedBenefactor.special || false,
        pityBonus,
        foundCoin,
      });
      
      // Determinar cor baseado na recompensa
      let embedColor = config.colors.success;
      if (selectedBenefactor.special) {
        embedColor = 0xFFD700; // Dourado para eventos especiais
      } else if (finalReward >= 50) {
        embedColor = 0x00FF7F; // Verde claro para boas recompensas
      }
      
      // Criar embed de sucesso
      const begEmbed = {
        color: embedColor,
        title: `${selectedBenefactor.emoji} Alguém foi generoso!`,
        description: `${selectedBenefactor.name.charAt(0).toUpperCase() + selectedBenefactor.name.slice(1)} te deu **${finalReward.toLocaleString()}** moedas!`,
        fields: [
          {
            name: "💰 Valor Recebido",
            value: `${baseReward} moedas base`,
            inline: true,
          },
          {
            name: "🎭 Generosidade",
            value: `x${selectedBenefactor.multiplier} multiplicador`,
            inline: true,
          },
          {
            name: "⏰ Próxima Tentativa",
            value: "Em 30 minutos",
            inline: true,
          },
        ],
        footer: {
          text: `${message.author.tag} • +1 XP ganho`,
          icon_url: message.author.displayAvatarURL({ dynamic: true }),
        },
        timestamp: new Date().toISOString(),
      };
      
      // Adicionar mensagem extra se houver
      if (selectedBenefactor.extraMsg) {
        begEmbed.fields.push({
          name: "💬 História",
          value: selectedBenefactor.extraMsg,
          inline: false,
        });
      }
      
      // Adicionar bônus de pena
      if (pityBonus > 0) {
        begEmbed.fields.push({
          name: "💔 Bônus de Compaixão",
          value: `+${pityBonus} moedas (você realmente precisava!)`,
          inline: false,
        });
      }
      
      // Adicionar moeda encontrada
      if (foundCoin > 0) {
        begEmbed.fields.push({
          name: "🪙 Sorte Extra",
          value: `+${foundCoin} moedas encontradas no chão!`,
          inline: false,
        });
      }
      
      await message.reply({ embeds: [begEmbed] });
      
    } catch (error) {
      console.error("Erro no comando beg:", error);
      
      const errorEmbed = {
        color: config.colors.error,
        title: `${config.emojis.error} Erro`,
        description: "Ocorreu um erro ao mendigar. Tente novamente.",
      };
      
      await message.reply({ embeds: [errorEmbed] });
    }
  },
};

// Função para verificar se pode mendigar
async function canUseBeg(discordId) {
  const prisma = getPrisma();
  
  const user = await prisma.user.findUnique({
    where: { discordId },
    select: { lastBeg: true },
  });
  
  if (!user?.lastBeg) {
    return { allowed: true };
  }
  
  const now = new Date();
  const lastBeg = new Date(user.lastBeg);
  const diffMs = now - lastBeg;
  const diffMinutes = diffMs / (1000 * 60);
  
  if (diffMinutes >= 30) {
    return { allowed: true };
  }
  
  const minutesRemaining = Math.ceil(30 - diffMinutes);
  
  return {
    allowed: false,
    timeRemaining: `${minutesRemaining} minuto${minutesRemaining !== 1 ? 's' : ''}`,
  };
}