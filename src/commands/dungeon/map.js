import config from "../../config.js";
import { getOrCreateUser, getOrCreateDungeonRun } from "../../database/client.js";
import { mapRenderer } from "../../utils/mapRenderer.js";
import { AttachmentBuilder } from "discord.js";

export default {
  name: "map",
  aliases: ["minimap", "mapa"],
  description: "Mostra o mapa explorado da dungeon atual.",
  category: "dungeon",
  usage: "map [full|text]",
  cooldown: 2000,
  
  async execute(client, message, args) {
    try {
      const discordId = message.author.id;
      const mode = args[0]?.toLowerCase();
      const showFull = mode === 'full';
      const useTextMode = mode === 'text';
      
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
      
      const dungeon = dungeonRun.mapData;
      const playerX = dungeonRun.positionX;
      const playerY = dungeonRun.positionY;
      
      // Se for modo texto, usar sistema antigo
      if (useTextMode) {
        const mapEmbed = await this.createMapEmbed(dungeonRun, dungeon, playerX, playerY, showFull);
        return await message.reply({ embeds: [mapEmbed] });
      }
      
      // Gerar mapa visual (novo sistema)
      const loadingMessage = await message.reply({
        embeds: [{
          color: config.colors.primary,
          title: "🗺️ Gerando mapa visual...",
          description: `${config.emojis.loading} Aguarde um momento...`,
        }]
      });
      
      try {
        const mapMode = showFull ? 'full' : 'local';
        const mapData = await mapRenderer.generateMap(dungeon, playerX, playerY, mapMode, 'png');
        
        // Criar attachment do PNG
        const attachment = new AttachmentBuilder(mapData.png, {
          name: `mapa_${dungeonRun.seed.slice(-8)}_${mapMode}.png`
        });
        
        // Criar embed com estatísticas
        const stats = mapRenderer.calculateMapStats(dungeon);
        const biomeEmojis = {
          'CRYPT': '💀',
          'VOLCANO': '🌋',
          'FOREST': '🌲',
          'GLACIER': '❄️',
          'RUINS': '🏛️',
          'ABYSS': '🕳️'
        };
        
        const embed = {
          color: config.colors.primary,
          title: `${biomeEmojis[dungeon.biome]} Mapa da Dungeon`,
          description: `**${mapRenderer.getBiomeName(dungeon.biome)}** - Andar ${dungeon.floor || 1}`,
          fields: [
            {
              name: "📍 Posição Atual",
              value: `(${playerX}, ${playerY}) - ${this.getRoomTypeName(dungeon.grid[playerY][playerX]?.type)}`,
              inline: true
            },
            {
              name: "📊 Exploração",
              value: `${stats.discovered}/${stats.total} salas (${stats.percentage}%)`,
              inline: true
            },
            {
              name: "🗺️ Modo",
              value: showFull ? "Mapa Completo" : "Área Local (7x7)",
              inline: true
            }
          ],
          image: {
            url: `attachment://${attachment.name}`
          },
          footer: {
            text: `💡 Use m.map full para mapa completo | m.map text para modo texto`,
          },
          timestamp: new Date().toISOString(),
        };
        
        // Editar mensagem de loading com o resultado final
        await loadingMessage.edit({ 
          embeds: [embed],
          files: [attachment]
        });
        
      } catch (mapError) {
        console.error("Erro ao gerar mapa visual:", mapError);
        
        // Se falhar, editar para fallback em modo texto
        const mapEmbed = await this.createMapEmbed(dungeonRun, dungeon, playerX, playerY, showFull);
        await loadingMessage.edit({ 
          embeds: [mapEmbed]
        });
      }
      
    } catch (error) {
      console.error("Erro no comando map:", error);
      
      const errorEmbed = {
        color: config.colors.error,
        title: `${config.emojis.error} Erro`,
        description: "Ocorreu um erro ao gerar o mapa. Tente novamente com `m.map text` para modo texto.",
      };
      
      await message.reply({ embeds: [errorEmbed] });
    }
  },
  
  async createMapEmbed(dungeonRun, dungeon, playerX, playerY, showFull) {
    const biomeEmojis = {
      'CRYPT': '💀',
      'VOLCANO': '🌋',
      'FOREST': '🌲',
      'GLACIER': '❄️',
      'RUINS': '🏛️',
      'ABYSS': '🕳️'
    };
    
    // Calcular área visível (7x7 ao redor do jogador, ou mapa completo se showFull)
    const viewRange = showFull ? dungeon.size : 7;
    const halfRange = Math.floor(viewRange / 2);
    
    let startX, endX, startY, endY;
    
    if (showFull) {
      startX = 0;
      endX = dungeon.size;
      startY = 0;
      endY = dungeon.size;
    } else {
      startX = Math.max(0, playerX - halfRange);
      endX = Math.min(dungeon.size, playerX + halfRange + 1);
      startY = Math.max(0, playerY - halfRange);
      endY = Math.min(dungeon.size, playerY + halfRange + 1);
    }
    
    // Gerar o mapa visual
    const mapLines = [];
    const legend = new Set();
    
    for (let y = startY; y < endY; y++) {
      let line = '';
      for (let x = startX; x < endX; x++) {
        const cell = this.getMapCell(dungeon, x, y, playerX, playerY, legend);
        line += cell;
      }
      mapLines.push(line);
    }
    
    // Criar legenda
    const legendText = this.createLegend(legend);
    
    // Calcular estatísticas
    const stats = this.calculateMapStats(dungeon);
    
    const embed = {
      color: config.colors.primary,
      title: `${biomeEmojis[dungeonRun.biome]} Mapa da Dungeon`,
      description: `**${this.getBiomeName(dungeonRun.biome)}** - Andar ${dungeonRun.currentFloor}`,
      fields: [
        {
          name: "🗺️ Mapa",
          value: `\`\`\`\n${mapLines.join('\n')}\`\`\``,
          inline: false
        },
        {
          name: "📍 Posição Atual",
          value: `(${playerX}, ${playerY}) - ${this.getRoomTypeName(dungeon.grid[playerX][playerY].type)}`,
          inline: true
        },
        {
          name: "📊 Exploração",
          value: `${stats.discovered}/${stats.total} salas (${stats.percentage.toFixed(1)}%)`,
          inline: true
        },
        {
          name: "🔍 Legenda",
          value: legendText,
          inline: false
        }
      ],
      footer: {
        text: showFull ? 
          `Mapa completo | Use ${config.prefix}map para ver área local` : 
          `Área local | Use ${config.prefix}map full para ver mapa completo`,
      },
      timestamp: new Date().toISOString(),
    };
    
    return embed;
  },
  
  getMapCell(dungeon, x, y, playerX, playerY, legend) {
    // Verificar se é a posição do jogador
    if (x === playerX && y === playerY) {
      legend.add('🔴 - Sua posição');
      return '🔴';
    }
    
    // Verificar se a sala existe
    if (x < 0 || y < 0 || x >= dungeon.size || y >= dungeon.size) {
      return '⬛'; // Fora dos limites
    }
    
    const room = dungeon.grid[x][y];
    
    // Se não foi descoberta, mostrar como desconhecida
    if (!room.discovered) {
      legend.add('❔ - Não explorado');
      return '❔';
    }
    
    // Mapear tipos de sala para emojis
    const roomIcons = {
      'ENTRANCE': '🚪',
      'EMPTY': '⬜',
      'MONSTER': '👹',
      'TRAP': '⚠️',
      'EVENT': '❓',
      'SHOP': '🏪',
      'LOOT': '💰',
      'BOSS': '👑',
      'WALL': '⬛'
    };
    
    const icon = roomIcons[room.type] || '❔';
    
    // Adicionar à legenda
    const legendEntry = `${icon} - ${this.getRoomTypeName(room.type)}`;
    legend.add(legendEntry);
    
    return icon;
  },
  
  createLegend(legendSet) {
    const legendArray = Array.from(legendSet);
    
    // Ordenar por prioridade
    const priorityOrder = ['🔴', '🚪', '⬜', '👹', '💰', '🏪', '⚠️', '❓', '👑', '❔', '⬛'];
    
    legendArray.sort((a, b) => {
      const aIcon = a.split(' ')[0];
      const bIcon = b.split(' ')[0];
      const aIndex = priorityOrder.indexOf(aIcon);
      const bIndex = priorityOrder.indexOf(bIcon);
      
      if (aIndex === -1) return 1;
      if (bIndex === -1) return -1;
      return aIndex - bIndex;
    });
    
    return legendArray.join('\n');
  },
  
  calculateMapStats(dungeon) {
    let total = 0;
    let discovered = 0;
    
    for (let x = 0; x < dungeon.size; x++) {
      for (let y = 0; y < dungeon.size; y++) {
        const room = dungeon.grid[x][y];
        if (room && room.type !== 'WALL') {
          total++;
          if (room.discovered) {
            discovered++;
          }
        }
      }
    }
    
    return {
      total,
      discovered,
      percentage: total > 0 ? (discovered / total) * 100 : 0
    };
  },
  
  getBiomeName(biome) {
    const names = {
      'CRYPT': 'Cripta Sombria',
      'VOLCANO': 'Vulcão Ardente',
      'FOREST': 'Floresta Perdida',
      'GLACIER': 'Geleira Eterna',
      'RUINS': 'Ruínas Antigas',
      'ABYSS': 'Abismo Profundo'
    };
    return names[biome] || biome;
  },
  
  getRoomTypeName(type) {
    const names = {
      'ENTRANCE': 'Entrada',
      'EMPTY': 'Sala Vazia',
      'MONSTER': 'Monstro',
      'TRAP': 'Armadilha',
      'EVENT': 'Evento',
      'SHOP': 'Loja',
      'LOOT': 'Tesouro',
      'BOSS': 'Chefe',
      'WALL': 'Parede'
    };
    return names[type] || type;
  }
};