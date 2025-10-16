// Utilitário adicional para elementos visuais de dungeons
// Fornece componentes reutilizáveis para interfaces visuais

export class DungeonVisuals {
  
  /**
   * Gera um minimapa ASCII melhorado para embeds
   * @param {Object} dungeon - Dados da dungeon
   * @param {number} playerX - Posição X do jogador
   * @param {number} playerY - Posição Y do jogador
   * @param {number} radius - Raio de visão (padrão 3)
   */
  static generateAsciiMinimap(dungeon, playerX, playerY, radius = 3) {
    const grid = dungeon.grid;
    const symbols = {
      'empty': '⚪',
      'entrance': '🚪',
      'monster': '👹',
      'trap': '🕳️',
      'event': '❓',
      'boss': '💀',
      'shop': '🏪',
      'loot': '💎',
      'exit': '🏁',
      'unknown': '❔',
      'player': '🔴'
    };

    let map = '';
    
    for (let y = playerY - radius; y <= playerY + radius; y++) {
      for (let x = playerX - radius; x <= playerX + radius; x++) {
        if (x === playerX && y === playerY) {
          map += symbols.player;
        } else if (x < 0 || y < 0 || x >= grid.length || y >= grid[0]?.length) {
          map += '⬛'; // Fora dos limites
        } else {
          const cell = grid[x]?.[y];
          if (cell && cell.discovered) {
            map += symbols[cell.type] || symbols.empty;
          } else {
            map += symbols.unknown;
          }
        }
      }
      map += '\n';
    }
    
    return map.trim();
  }

  /**
   * Cria uma barra de progresso visual
   * @param {number} current - Valor atual
   * @param {number} max - Valor máximo
   * @param {number} length - Comprimento da barra
   * @param {string} fillChar - Caractere de preenchimento
   * @param {string} emptyChar - Caractere vazio
   */
  static createProgressBar(current, max, length = 20, fillChar = '█', emptyChar = '░') {
    const percentage = Math.max(0, Math.min(100, (current / max) * 100));
    const filledLength = Math.round((percentage / 100) * length);
    const emptyLength = length - filledLength;
    
    return `${fillChar.repeat(filledLength)}${emptyChar.repeat(emptyLength)} ${percentage.toFixed(1)}%`;
  }

  /**
   * Gera um indicador de direção baseado nas saídas disponíveis
   * @param {Array} exits - Array de direções disponíveis ['north', 'south', etc.]
   */
  static createDirectionIndicator(exits) {
    const directions = {
      'north': '⬆️',
      'south': '⬇️',
      'east': '➡️',
      'west': '⬅️'
    };

    const compass = `
      ${exits.includes('north') ? directions.north : '⚫'}
  ${exits.includes('west') ? directions.west : '⚫'} 🔴 ${exits.includes('east') ? directions.east : '⚫'}
      ${exits.includes('south') ? directions.south : '⚫'}
    `.trim();

    return compass;
  }

  /**
   * Gera uma representação visual da saúde do jogador
   * @param {number} current - HP atual
   * @param {number} max - HP máximo
   */
  static createHealthBar(current, max) {
    const percentage = (current / max) * 100;
    let emoji = '💚'; // Verde
    
    if (percentage <= 25) emoji = '❤️'; // Vermelho
    else if (percentage <= 50) emoji = '🧡'; // Laranja
    else if (percentage <= 75) emoji = '💛'; // Amarelo
    
    return `${emoji} ${current}/${max} ${this.createProgressBar(current, max, 15, '█', '░')}`;
  }

  /**
   * Cria um indicador visual do bioma atual
   * @param {string} biome - Código do bioma
   */
  static getBiomeIndicator(biome) {
    const indicators = {
      'CRYPT': { emoji: '💀', name: 'Cripta Sombria', color: '#8B0000' },
      'VOLCANO': { emoji: '🌋', name: 'Vulcão Ardente', color: '#FF4500' },
      'FOREST': { emoji: '🌲', name: 'Floresta Perdida', color: '#228B22' },
      'GLACIER': { emoji: '❄️', name: 'Geleira Eterna', color: '#87CEEB' },
      'RUINS': { emoji: '🏛️', name: 'Ruínas Antigas', color: '#DAA520' },
      'ABYSS': { emoji: '🕳️', name: 'Abismo Profundo', color: '#4B0082' }
    };

    return indicators[biome] || { emoji: '❓', name: 'Bioma Desconhecido', color: '#666666' };
  }

  /**
   * Gera um resumo visual das estatísticas do jogador
   * @param {Object} stats - Estatísticas do jogador
   */
  static createStatsDisplay(stats) {
    return `
**⚔️ ATK:** ${stats.atk || 10} | **🛡️ DEF:** ${stats.def || 5}
**⚡ SPD:** ${stats.spd || 8} | **🍀 LCK:** ${stats.lck || 3}
**⭐ LVL:** ${stats.level || 1} | **💰 Moedas:** ${stats.coins || 0}
    `.trim();
  }

  /**
   * Cria um layout de inventário visual
   * @param {Array} items - Array de itens
   * @param {number} maxSlots - Número máximo de slots
   */
  static createInventoryGrid(items, maxSlots = 20) {
    const slots = new Array(maxSlots).fill('📦');
    
    items.forEach((item, index) => {
      if (index < maxSlots) {
        const rarityEmojis = {
          'common': '⚪',
          'uncommon': '🟢',
          'rare': '🔵',
          'epic': '🟣',
          'legendary': '🟡'
        };
        
        slots[index] = rarityEmojis[item.rarity] || '📦';
      }
    });

    // Organizar em grid 4x5
    let grid = '';
    for (let row = 0; row < 5; row++) {
      for (let col = 0; col < 4; col++) {
        const index = row * 4 + col;
        grid += slots[index] || '⬛';
      }
      grid += '\n';
    }

    return grid.trim();
  }

  /**
   * Gera um cabeçalho visual para embeds de dungeon
   * @param {string} title - Título principal
   * @param {string} subtitle - Subtítulo
   * @param {string} biome - Bioma atual
   */
  static createDungeonHeader(title, subtitle, biome) {
    const biomeInfo = this.getBiomeIndicator(biome);
    
    return {
      title: `${biomeInfo.emoji} ${title}`,
      description: `**${biomeInfo.name}** - ${subtitle}`,
      color: parseInt(biomeInfo.color.replace('#', ''), 16)
    };
  }

  /**
   * Cria um rodapé com dicas de comandos
   * @param {Array} commands - Array de comandos para mostrar
   */
  static createCommandFooter(commands) {
    const tips = commands.map(cmd => `\`m.${cmd}\``).join(' | ');
    return `💡 Comandos: ${tips}`;
  }
}

export default DungeonVisuals;