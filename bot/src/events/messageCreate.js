import { Events } from 'discord.js';
import { dataService } from '../services/dataService.js';
import { botConfig } from '../config.js';
import { getRandomElement } from '../utils/random.js';

export const name = Events.MessageCreate;

export async function execute(message) {
  // Ignore bots
  if (message.author.bot) return;

  // XP system for messages (10% chance)
  if (Math.random() < botConfig.economy.messageXpChance) {
    try {
      const xpGain = Math.floor(Math.random() * 
        (botConfig.economy.messageXpMax - botConfig.economy.messageXpMin + 1)) + 
        botConfig.economy.messageXpMin;

      // Add XP using data service
      const result = await dataService.addXP(
        message.author.id, 
        xpGain, 
        'Message activity'
      );

      // Check for level up
      if (result && result.levelUp) {
        const levelUpEmbed = {
          title: '🎉 Level Up!',
          description: `Parabéns ${message.author}! Você alcançou o nível **${result.newLevel}**!`,
          color: parseInt(botConfig.successColor.replace('#', ''), 16),
          fields: [
            {
              name: '💰 Recompensa',
              value: `${result.bonusCoins} moedas`,
              inline: true
            }
          ],
          timestamp: new Date()
        };

        // Try to send level up message in the same channel
        try {
          await message.channel.send({ embeds: [levelUpEmbed] });
        } catch (error) {
          console.warn('Could not send level up message:', error.message);
        }
      }

      // Trigger Discord event for XP gain
      await dataService.triggerDiscordEvent('discord_event', {
        type: 'message_create',
        payload: {
          author: {
            id: message.author.id,
            username: message.author.username,
            bot: message.author.bot
          },
          content: message.content.length, // Send only length for privacy
          channelId: message.channel.id,
          guildId: message.guild?.id,
          xpGained: xpGain
        }
      });

    } catch (error) {
      console.error('❌ Error processing message XP:', error);
      // Continue execution even if XP processing fails
    }
  }

  // Easter eggs and automatic responses
  const content = message.content.toLowerCase();
  
  // Bot mention responses
  if ((content.includes('marybot') || content.includes('mary bot')) && 
      Math.random() < botConfig.easterEggs.botMentionChance) {
    
    const responses = [
      'Oi! 👋 Como posso ajudar você hoje?',
      'Olá! Use `/help` para ver todos os meus comandos! 🤖',
      'Konnichiwa! 🎌 Pronto para explorar o mundo dos animes?',
      'Yo! Que tal jogar um quiz ou fazer um gacha? 🎮',
      'Salve! Não esqueça de pegar seu daily com `/daily`! 💰'
    ];
    
    const randomResponse = getRandomElement(responses);
    
    try {
      await message.reply(randomResponse);
    } catch (error) {
      console.warn('Could not send bot mention response:', error.message);
    }
  }

  // Anime reaction
  if (content.includes('anime') && 
      Math.random() < botConfig.easterEggs.animeReactionChance) {
    
    const animeEmojis = ['🎌', '⭐', '🌸', '🍜', '🎭'];
    const randomEmoji = getRandomElement(animeEmojis);
    
    try {
      await message.react(randomEmoji);
    } catch (error) {
      console.warn('Could not add anime reaction:', error.message);
    }
  }

  // Waifu/Husbando reaction
  if ((content.includes('waifu') || content.includes('husbando')) && 
      Math.random() < botConfig.easterEggs.waifuReactionChance) {
    
    const waifuEmojis = ['💖', '😍', '🥰', '💕', '✨'];
    const randomEmoji = getRandomElement(waifuEmojis);
    
    try {
      await message.react(randomEmoji);
    } catch (error) {
      console.warn('Could not add waifu reaction:', error.message);
    }
  }

  // Special keywords
  const specialKeywords = {
    'arigatou': ['🙏', 'De nada! 😊'],
    'ohayo': ['🌅', 'Ohayo gozaimasu! ☀️'],
    'konbanwa': ['🌙', 'Konbanwa! 🌃'],
    'sayonara': ['👋', 'Mata ne! 👋'],
    'senpai': ['😳', 'S-senpai noticed me! 💖']
  };

  for (const [keyword, reaction] of Object.entries(specialKeywords)) {
    if (content.includes(keyword) && Math.random() < 0.3) {
      try {
        if (reaction[0].length === 2) { // It's an emoji
          await message.react(reaction[0]);
        } else { // It's a text response
          await message.reply(reaction[1]);
        }
      } catch (error) {
        console.warn(`Could not send ${keyword} reaction:`, error.message);
      }
      break; // Only react to one keyword per message
    }
  }
}