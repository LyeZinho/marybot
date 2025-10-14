import { Events } from 'discord.js';

export const name = Events.MessageCreate;

export async function execute(message) {
  // Ignorar bots
  if (message.author.bot) return;

  // Sistema básico de XP por mensagem (chance de 10%)
  if (Math.random() < 0.1) {
    try {
      const { prisma } = await import('../database/client.js');
      const { getRandomInt } = await import('../utils/random.js');
      
      // Buscar ou criar usuário
      let user = await prisma.user.findUnique({
        where: { discordId: message.author.id }
      });

      if (!user) {
        user = await prisma.user.create({
          data: {
            discordId: message.author.id,
            username: message.author.username
          }
        });
      }

      // Adicionar XP aleatório (1-5)
      const xpGain = getRandomInt(1, 5);
      const oldLevel = Math.floor(user.xp / 100) + 1;
      
      await prisma.user.update({
        where: { discordId: message.author.id },
        data: {
          xp: { increment: xpGain }
        }
      });

      // Verificar se subiu de nível
      const newLevel = Math.floor((user.xp + xpGain) / 100) + 1;
      
      if (newLevel > oldLevel) {
        // Recompensa por subir de nível
        const levelReward = newLevel * 10;
        
        await prisma.user.update({
          where: { discordId: message.author.id },
          data: {
            coins: { increment: levelReward }
          }
        });

        // Enviar mensagem de level up (apenas se não for spam)
        const levelUpEmbed = {
          title: '🎉 Level Up!',
          description: `Parabéns ${message.author.username}! Você subiu para o **nível ${newLevel}**!`,
          fields: [
            { name: '💰 Recompensa', value: `+${levelReward} 🪙`, inline: true },
            { name: '✨ Novo Nível', value: `${newLevel}`, inline: true }
          ],
          color: 0x00FF7F,
          timestamp: new Date(),
          footer: {
            text: 'Continue participando para ganhar mais XP!',
            icon_url: message.author.displayAvatarURL()
          }
        };

        // Chance de 50% de mostrar level up para não fazer spam
        if (Math.random() < 0.5) {
          await message.reply({ embeds: [levelUpEmbed] });
        }
      }

    } catch (error) {
      console.error('Erro ao processar XP da mensagem:', error);
    }
  }

  // Easter eggs e respostas automáticas
  const content = message.content.toLowerCase();
  
  if (content.includes('marybot') || content.includes('mary bot')) {
    const responses = [
      '🤖 Olá! Eu sou a MaryBot! Use `/help` para ver meus comandos!',
      '🎌 Oi! Pronta para falar sobre animes?',
      '✨ Oi! Como posso ajudar hoje?',
      '🎮 Olá! Que tal jogar alguns minigames?',
      '💰 Oi! Já coletou seu `/daily` hoje?'
    ];
    
    const randomResponse = responses[Math.floor(Math.random() * responses.length)];
    
    // Chance de 30% de responder para não fazer spam
    if (Math.random() < 0.3) {
      await message.reply(randomResponse);
    }
  }

  // Reagir a mensagens sobre anime
  if (content.includes('anime') && Math.random() < 0.1) {
    try {
      await message.react('🎌');
    } catch (error) {
      console.error('Erro ao reagir à mensagem:', error);
    }
  }

  // Reagir a mensagens sobre waifus
  if ((content.includes('waifu') || content.includes('husbando')) && Math.random() < 0.2) {
    try {
      await message.react('😍');
    } catch (error) {
      console.error('Erro ao reagir à mensagem:', error);
    }
  }
}