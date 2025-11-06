// Comando de calendário de anime
import { AttachmentBuilder } from 'discord.js';
import { calendarRenderer } from '../../utils/calendarRenderer.js';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';
import config from '../../config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default {
  name: "calendar",
  aliases: ["calendario", "cal", "anime-calendar"],
  description: "Exibe o calendário de anime do mês ou informações de um personagem específico.",
  category: "anime",
  usage: "calendar [dia|month|today]",
  cooldown: 5000,
  
  async execute(client, message, args) {
    try {
      // Carregar dados do calendário
      const calendarPath = path.join(__dirname, '../../data/animeCalendar.json');
      const calendarData = JSON.parse(fs.readFileSync(calendarPath, 'utf8'));
      
      const now = new Date();
      const currentDay = now.getDate();
      const currentMonth = now.getMonth() + 1;
      const currentYear = now.getFullYear();
      
      // Se nenhum argumento, mostrar calendário do mês
      if (!args.length || args[0] === 'month') {
        return await this.showMonthCalendar(message, currentMonth, currentYear, calendarData, currentDay);
      }
      
      // Se argumento é "today", mostrar personagem de hoje
      if (args[0] === 'today' || args[0] === 'hoje') {
        return await this.showCharacterCard(message, currentDay, calendarData);
      }
      
      // Se argumento é um número, mostrar personagem daquele dia
      const day = parseInt(args[0]);
      if (!isNaN(day) && day >= 1 && day <= 31) {
        return await this.showCharacterCard(message, day, calendarData);
      }
      
      // Argumento inválido
      const embed = {
        color: config.colors.error,
        title: '❌ Uso Incorreto',
        description: `**Uso correto:**\n` +
                    `\`${config.prefix}calendar\` - Mostra calendário do mês\n` +
                    `\`${config.prefix}calendar today\` - Personagem de hoje\n` +
                    `\`${config.prefix}calendar [1-31]\` - Personagem de um dia específico\n` +
                    `\`${config.prefix}calendar month\` - Calendário completo`,
        footer: { text: 'Cada dia tem um personagem especial!' }
      };
      
      return message.reply({ embeds: [embed] });
      
    } catch (error) {
      console.error('Erro no comando calendar:', error);
      
      const embed = {
        color: config.colors.error,
        title: '❌ Erro',
        description: 'Ocorreu um erro ao processar o calendário.',
        footer: { text: 'Tente novamente mais tarde' }
      };
      
      return message.reply({ embeds: [embed] });
    }
  },
  
  /**
   * Mostra o calendário do mês inteiro
   */
  async showMonthCalendar(message, month, year, calendarData, todayDay) {
    try {
      // Enviar mensagem de carregamento
      const loadingEmbed = {
        color: config.colors.primary,
        title: '📅 Gerando Calendário...',
        description: `${config.emojis.loading} Aguarde enquanto criamos o calendário visual...`,
      };
      
      const loadingMsg = await message.reply({ embeds: [loadingEmbed] });
      
      // Renderizar calendário
      const calendarBuffer = await calendarRenderer.renderCalendar(
        month,
        year,
        calendarData.calendar,
        todayDay
      );
      
      // Criar attachment
      const attachment = new AttachmentBuilder(calendarBuffer, {
        name: `calendario-${month}-${year}.png`
      });
      
      // Estatísticas do mês
      const daysInMonth = new Date(year, month, 0).getDate();
      const charactersThisMonth = Object.keys(calendarData.calendar)
        .filter(day => parseInt(day) <= daysInMonth)
        .length;
      
      const todayCharacter = calendarData.calendar[todayDay.toString()];
      
      const embed = {
        color: config.colors.primary,
        title: `🎌 Calendário de Anime - ${this.getMonthName(month)} ${year}`,
        description: `Cada dia do mês tem um personagem especial de anime!\n\n` +
                    `📊 **${charactersThisMonth}** personagens neste mês\n` +
                    `📅 **Hoje** (dia ${todayDay}): ${todayCharacter ? `**${todayCharacter.name}** de *${todayCharacter.anime}*` : 'Sem personagem'}`,
        image: { url: `attachment://calendario-${month}-${year}.png` },
        fields: [
          {
            name: '💡 Como usar',
            value: `\`${config.prefix}calendar [dia]\` - Ver detalhes de um personagem\n` +
                   `\`${config.prefix}calendar today\` - Personagem de hoje`,
            inline: false
          },
          {
            name: '🎭 Personagem de Hoje',
            value: todayCharacter 
              ? `**${todayCharacter.name}**\n*${todayCharacter.anime}*\n✨ ${todayCharacter.trait}\n\n"${todayCharacter.quote}"`
              : 'Nenhum personagem para hoje',
            inline: false
          }
        ],
        footer: {
          text: 'MaryBot • Use calendar [dia] para ver mais detalhes'
        },
        timestamp: new Date()
      };
      
      // Editar mensagem de carregamento com resultado
      await loadingMsg.edit({
        embeds: [embed],
        files: [attachment]
      });
      
    } catch (error) {
      console.error('Erro ao mostrar calendário mensal:', error);
      throw error;
    }
  },
  
  /**
   * Mostra card de personagem individual
   */
  async showCharacterCard(message, day, calendarData) {
    try {
      const character = calendarData.calendar[day.toString()];
      
      if (!character) {
        const embed = {
          color: config.colors.warning,
          title: '⚠️ Dia Inválido',
          description: `Não há personagem cadastrado para o dia **${day}**.\n\n` +
                      `Dias válidos: 1-31`,
        };
        
        return message.reply({ embeds: [embed] });
      }
      
      // Enviar mensagem de carregamento
      const loadingEmbed = {
        color: config.colors.primary,
        title: '🎭 Carregando Personagem...',
        description: `${config.emojis.loading} Preparando card de **${character.name}**...`,
      };
      
      const loadingMsg = await message.reply({ embeds: [loadingEmbed] });
      
      // Renderizar card do personagem
      const cardBuffer = await calendarRenderer.renderCharacterCard(character, day);
      
      const attachment = new AttachmentBuilder(cardBuffer, {
        name: `character-day-${day}.png`
      });
      
      // Buscar informações adicionais da API (MyAnimeList)
      let apiInfo = null;
      try {
        apiInfo = await this.fetchAnimeInfo(character.malId);
      } catch (error) {
        console.error('Erro ao buscar info da API:', error);
      }
      
      const embed = {
        color: config.colors.primary,
        title: `🎌 Personagem do Dia ${day}`,
        description: `**${character.name}**\n*${character.anime}*`,
        image: { url: `attachment://character-day-${day}.png` },
        fields: [
          {
            name: '📝 Descrição',
            value: character.description,
            inline: false
          },
          {
            name: '✨ Característica',
            value: character.trait,
            inline: true
          },
          {
            name: '🎂 Aniversário',
            value: character.birthday,
            inline: true
          },
          {
            name: '💬 Frase Icônica',
            value: `"${character.quote}"`,
            inline: false
          }
        ],
        footer: {
          text: `MaryBot • Dia ${day} • ${apiInfo ? `Score MAL: ${apiInfo.score || 'N/A'}` : 'Anime Calendar'}`
        },
        timestamp: new Date()
      };
      
      // Adicionar informações da API se disponível
      if (apiInfo) {
        embed.fields.push({
          name: '📊 Informações do Anime',
          value: `**Gêneros:** ${apiInfo.genres || 'N/A'}\n` +
                 `**Episódios:** ${apiInfo.episodes || 'N/A'}\n` +
                 `**Status:** ${apiInfo.status || 'N/A'}`,
          inline: false
        });
        
        if (apiInfo.imageUrl) {
          embed.thumbnail = { url: apiInfo.imageUrl };
        }
      }
      
      await loadingMsg.edit({
        embeds: [embed],
        files: [attachment]
      });
      
    } catch (error) {
      console.error('Erro ao mostrar card de personagem:', error);
      throw error;
    }
  },
  
  /**
   * Busca informações do anime na API Jikan (MyAnimeList)
   */
  async fetchAnimeInfo(malId) {
    if (!malId) return null;
    
    try {
      const response = await fetch(`https://api.jikan.moe/v4/anime/${malId}`);
      
      if (!response.ok) return null;
      
      const data = await response.json();
      const anime = data.data;
      
      return {
        score: anime.score,
        episodes: anime.episodes,
        status: anime.status,
        genres: anime.genres?.map(g => g.name).join(', ') || 'N/A',
        imageUrl: anime.images?.jpg?.large_image_url
      };
      
    } catch (error) {
      console.error('Erro ao buscar dados da API Jikan:', error);
      return null;
    }
  },
  
  /**
   * Retorna nome do mês em português
   */
  getMonthName(month) {
    const months = [
      'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];
    return months[month - 1];
  }
};
