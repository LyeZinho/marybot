// Comando para mostrar progresso detalhado de exploração da dungeon
import config from "../../config.js";
import { getOrCreateDungeonRun } from "../../database/client.js";
import { dungeonProgressTracker } from "../../game/dungeonProgressTracker.js";

export default {
  name: "progress",
  aliases: ["progresso", "exploration", "exploracao"],
  description: "Mostra seu progresso detalhado de exploração da dungeon atual.",
  category: "dungeon",
  usage: "progress [detailed]",
  cooldown: 3000,
  
  async execute(client, message, args) {
    try {
      const discordId = message.author.id;
      const showDetailed = args[0]?.toLowerCase() === 'detailed' || args[0]?.toLowerCase() === 'detalhado';
      
      // Verificar se tem dungeon ativa
      const dungeonRun = await getOrCreateDungeonRun(discordId);
      
      if (!dungeonRun.mapData?.grid) {
        return message.reply({
          embeds: [{
            color: config.colors.warning,
            title: "⚠️ Nenhuma Dungeon Ativa",
            description: `Você não possui uma dungeon ativa.\n\nUse \`${config.prefix}dungeon start\` para começar uma nova aventura!`,
          }]
        });
      }

      // Carregar progresso do banco de dados
      if (dungeonRun.visitedRooms) {
        dungeonProgressTracker.loadProgress(dungeonRun.visitedRooms);
      }

      // Gerar relatório completo
      const progressReport = dungeonProgressTracker.generateExplorationReport(
        dungeonRun.seed, 
        dungeonRun.currentFloor
      );

      // Criar embed principal
      const embed = this.createProgressEmbed(dungeonRun, progressReport, showDetailed);
      
      await message.reply({ embeds: [embed] });
      
    } catch (error) {
      console.error("Erro no comando progress:", error);
      
      const errorEmbed = {
        color: config.colors.error,
        title: `${config.emojis.error} Erro`,
        description: "Ocorreu um erro ao processar o progresso. Tente novamente.",
      };
      
      await message.reply({ embeds: [errorEmbed] });
    }
  },

  createProgressEmbed(dungeonRun, report, showDetailed) {
    const progressBar = this.createProgressBar(report.explorationPercentage);
    
    const embed = {
      color: this.getProgressColor(report.explorationPercentage),
      title: "📊 Progresso de Exploração",
      description: `Relatório detalhado da sua exploração no **Andar ${dungeonRun.currentFloor}**`,
      fields: [
        {
          name: "🗺️ Exploração Geral",
          value: [
            `**Progresso:** ${progressBar} ${report.explorationPercentage}%`,
            `**Salas Visitadas:** ${report.roomsVisited}`,
            `**Salas Estimadas:** ${report.estimatedTotalRooms}`,
            `**Status:** ${report.isFloorComplete ? '🏆 Completo!' : '🔍 Em Progresso'}`
          ].join('\n'),
          inline: false
        },
        {
          name: "⭐ Descobertas Especiais",
          value: [
            `**Salas Especiais:** ${report.specialRoomsFound}`,
            `**Score de Exploração:** ${report.explorationScore.toLocaleString()} pts`,
            `**Eficiência:** ${this.calculateEfficiency(report)}%`
          ].join('\n'),
          inline: true
        },
        {
          name: "💾 Dados Técnicos",
          value: [
            `**Seed:** \`${dungeonRun.seed.slice(0, 8)}...\``,
            `**Compressão:** ${report.dataSize} chars`,
            `**Chars/Sala:** ${report.averageDataPerRoom.toFixed(1)}`
          ].join('\n'),
          inline: true
        }
      ],
      timestamp: new Date().toISOString(),
    };

    // Adicionar conquistas
    const achievements = this.getAchievements(report);
    if (achievements.length > 0) {
      embed.fields.push({
        name: "🏆 Conquistas",
        value: achievements.join('\n'),
        inline: false
      });
    }

    // Adicionar informações detalhadas se solicitado
    if (showDetailed) {
      embed.fields.push({
        name: "🔍 Análise Detalhada",
        value: [
          `**Coordenadas Visitadas:** ${report.visitedCoordinates.length}`,
          `**Primeira Sala:** (${report.visitedCoordinates[0]?.[0] || 0}, ${report.visitedCoordinates[0]?.[1] || 0})`,
          `**Última Sala:** (${dungeonRun.positionX}, ${dungeonRun.positionY})`,
          `**Área Coberta:** ${this.calculateAreaCoverage(report.visitedCoordinates)} células²`
        ].join('\n'),
        inline: false
      });
    }

    // Footer com dicas
    embed.footer = {
      text: showDetailed 
        ? `Use ${config.prefix}progress para visão simplificada • Sistema algorítmico de rastreamento`
        : `Use ${config.prefix}progress detailed para mais informações • ${report.explorationPercentage}% explorado`,
    };

    return embed;
  },

  createProgressBar(percentage, length = 20) {
    const filled = Math.floor((percentage / 100) * length);
    const empty = length - filled;
    
    const fillChar = '█';
    const emptyChar = '░';
    
    return `${fillChar.repeat(filled)}${emptyChar.repeat(empty)}`;
  },

  getProgressColor(percentage) {
    if (percentage >= 95) return 0x00FF00; // Verde - Completo
    if (percentage >= 75) return 0xFFD700; // Dourado - Quase completo
    if (percentage >= 50) return 0xFF8C00; // Laranja - Meio caminho
    if (percentage >= 25) return 0x1E90FF; // Azul - Progresso inicial
    return 0x808080; // Cinza - Início
  },

  calculateEfficiency(report) {
    // Eficiência baseada na relação entre salas especiais e salas visitadas
    const specialRoomRatio = (report.specialRoomsFound / Math.max(report.roomsVisited, 1)) * 100;
    const progressEfficiency = Math.min(report.explorationPercentage, 100);
    
    return Math.round((specialRoomRatio * 0.3 + progressEfficiency * 0.7));
  },

  getAchievements(report) {
    const achievements = [];
    
    if (report.explorationPercentage >= 25) {
      achievements.push('🥉 **Explorador Iniciante** - 25% explorado');
    }
    if (report.explorationPercentage >= 50) {
      achievements.push('🥈 **Explorador Experiente** - 50% explorado');
    }
    if (report.explorationPercentage >= 75) {
      achievements.push('🥇 **Explorador Veterano** - 75% explorado');
    }
    if (report.isFloorComplete) {
      achievements.push('🏆 **Mestre Explorador** - Andar completo!');
    }
    if (report.specialRoomsFound >= 5) {
      achievements.push('⭐ **Caçador de Tesouros** - 5+ salas especiais');
    }
    if (report.roomsVisited >= 50) {
      achievements.push('🦶 **Andarilho** - 50+ salas visitadas');
    }
    
    return achievements;
  },

  calculateAreaCoverage(coordinates) {
    if (coordinates.length === 0) return 0;
    
    const xCoords = coordinates.map(([x, y]) => x);
    const yCoords = coordinates.map(([x, y]) => y);
    
    const minX = Math.min(...xCoords);
    const maxX = Math.max(...xCoords);
    const minY = Math.min(...yCoords);
    const maxY = Math.max(...yCoords);
    
    const width = Math.abs(maxX - minX) + 1;
    const height = Math.abs(maxY - minY) + 1;
    
    return width * height;
  },

  getBiomeName(biome) {
    const names = {
      'CRYPT': 'Cripta Sombria',
      'VOLCANO': 'Vulcão Ardente', 
      'FOREST': 'Floresta Densa',
      'GLACIER': 'Geleira Eterna',
      'RUINS': 'Ruínas Antigas',
      'ABYSS': 'Abismo Profundo'
    };
    return names[biome] || biome;
  }
};