// Sistema de renderização de mapas visuais para dungeons
// Gera SVGs e converte para PNG para envio no Discord

import sharp from 'sharp';
import { Buffer } from 'buffer';

export class MapRenderer {
  constructor() {
    // Configurações de renderização
    this.config = {
      cellSize: 32,           // Tamanho de cada célula em pixels
      padding: 20,            // Padding ao redor do mapa
      strokeWidth: 1,         // Espessura das bordas
      fontSize: 16,           // Tamanho da fonte para textos
      legendWidth: 200,       // Largura da legenda
      headerHeight: 60,       // Altura do cabeçalho
    };

    // Cores por bioma
    this.biomeColors = {
      'CRYPT': {
        background: '#1a0d0d',
        border: '#4a2424',
        unknown: '#2d1b1b',
        player: '#ff4444'
      },
      'VOLCANO': {
        background: '#2d0a0a',
        border: '#5c1a1a',
        unknown: '#3d1f1f',
        player: '#ff6b35'
      },
      'FOREST': {
        background: '#0d1a0d',
        border: '#244a24',
        unknown: '#1b2d1b',
        player: '#44ff44'
      },
      'GLACIER': {
        background: '#0d0d1a',
        border: '#24244a',
        unknown: '#1b1b2d',
        player: '#4444ff'
      },
      'RUINS': {
        background: '#1a1a0d',
        border: '#4a4a24',
        unknown: '#2d2d1b',
        player: '#ffff44'
      },
      'ABYSS': {
        background: '#0a0a0a',
        border: '#2a2a2a',
        unknown: '#1a1a1a',
        player: '#aa44ff'
      }
    };

    // Símbolos e cores por tipo de sala
    this.roomStyles = {
      'empty': { symbol: '⚪', color: '#888888', bg: '#f0f0f0' },
      'entrance': { symbol: '🚪', color: '#00ff00', bg: '#e0ffe0' },
      'monster': { symbol: '👹', color: '#ff4444', bg: '#ffe0e0' },
      'trap': { symbol: '🕳️', color: '#ff8800', bg: '#fff0e0' },
      'event': { symbol: '❓', color: '#4488ff', bg: '#e0e8ff' },
      'boss': { symbol: '💀', color: '#880000', bg: '#ffe0e0' },
      'shop': { symbol: '🏪', color: '#ffaa00', bg: '#fff8e0' },
      'loot': { symbol: '💎', color: '#00aaff', bg: '#e0f0ff' },
      'exit': { symbol: '🏁', color: '#00aa00', bg: '#e0ffe0' }
    };
  }

  /**
   * Gera um mapa visual em SVG
   * @param {Object} dungeon - Dados da dungeon
   * @param {number} playerX - Posição X do jogador
   * @param {number} playerY - Posição Y do jogador
   * @param {boolean} showAll - Se deve mostrar todas as salas ou apenas as descobertas
   * @param {string} mode - 'local' para minimapa ou 'full' para mapa completo
   */
  generateMapSVG(dungeon, playerX, playerY, showAll = false, mode = 'local') {
    const grid = dungeon.grid;
    const biome = dungeon.biome || 'CRYPT';
    const colors = this.biomeColors[biome];

    let startX = 0, startY = 0, endX = grid.length, endY = grid[0].length;

    // Se for modo local, mostrar apenas área 7x7 ao redor do jogador
    if (mode === 'local') {
      const radius = 3;
      startX = Math.max(0, playerX - radius);
      startY = Math.max(0, playerY - radius);
      endX = Math.min(grid.length, playerX + radius + 1);
      endY = Math.min(grid[0].length, playerY + radius + 1);
    }

    const mapWidth = (endX - startX) * this.config.cellSize;
    const mapHeight = (endY - startY) * this.config.cellSize;
    
    // Calcular altura necessária para legenda completa
    const legendItemsCount = 7; // número de itens na legenda
    const legendHeight = 50 + (legendItemsCount * 25) + 30 + 80; // título + itens + espaço + progresso
    const finalMapHeight = Math.max(mapHeight, legendHeight);
    
    const totalWidth = mapWidth + this.config.padding * 2 + this.config.legendWidth;
    const totalHeight = finalMapHeight + this.config.padding * 2 + this.config.headerHeight;

    let svg = `
      <svg width="${totalWidth}" height="${totalHeight}" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <style>
            .header { font-family: 'Segoe UI', Arial, sans-serif; font-size: 18px; font-weight: bold; fill: #ffffff; }
            .subheader { font-family: 'Segoe UI', Arial, sans-serif; font-size: 14px; fill: #cccccc; }
            .legend-title { font-family: 'Segoe UI', Arial, sans-serif; font-size: 16px; font-weight: bold; fill: #ffffff; }
            .legend-text { font-family: 'Segoe UI', Arial, sans-serif; font-size: 12px; fill: #cccccc; }
            .cell { stroke: ${colors.border}; stroke-width: ${this.config.strokeWidth}; }
            .player-glow { filter: drop-shadow(0 0 8px ${colors.player}); }
          </style>
        </defs>
        
        <!-- Background -->
        <rect width="${totalWidth}" height="${totalHeight}" fill="${colors.background}"/>
        
        <!-- Header -->
        <text x="${totalWidth/2}" y="30" text-anchor="middle" class="header">
          ${this.getBiomeName(biome)} - Andar ${dungeon.floor || 1}
        </text>
        <text x="${totalWidth/2}" y="50" text-anchor="middle" class="subheader">
          Posição: (${playerX}, ${playerY}) | Modo: ${mode === 'local' ? 'Local' : 'Completo'}
        </text>
        
        <!-- Map Grid -->
        <g transform="translate(${this.config.padding}, ${this.config.headerHeight + this.config.padding})">
    `;

    // Desenhar células do mapa
    for (let x = startX; x < endX; x++) {
      for (let y = startY; y < endY; y++) {
        const cell = grid[x] && grid[x][y];
        const cellX = (x - startX) * this.config.cellSize;
        const cellY = (y - startY) * this.config.cellSize;
        
        let cellColor = colors.unknown;
        let symbol = '❔';
        let symbolColor = '#666666';

        if (cell && (cell.discovered || showAll)) {
          const style = this.roomStyles[cell.type] || this.roomStyles.empty;
          cellColor = style.bg;
          symbol = style.symbol;
          symbolColor = style.color;
        }

        // Desenhar célula
        svg += `
          <rect x="${cellX}" y="${cellY}" 
                width="${this.config.cellSize}" height="${this.config.cellSize}"
                fill="${cellColor}" class="cell"/>
        `;

        // Adicionar símbolo da sala
        svg += `
          <text x="${cellX + this.config.cellSize/2}" y="${cellY + this.config.cellSize/2 + 6}"
                text-anchor="middle" font-size="20" fill="${symbolColor}">
            ${symbol}
          </text>
        `;

        // Destacar posição do jogador
        if (x === playerX && y === playerY) {
          svg += `
            <circle cx="${cellX + this.config.cellSize/2}" cy="${cellY + this.config.cellSize/2}"
                    r="${this.config.cellSize * 0.4}" fill="none" 
                    stroke="${colors.player}" stroke-width="3" class="player-glow"/>
            <text x="${cellX + this.config.cellSize/2}" y="${cellY + this.config.cellSize/2 + 6}"
                  text-anchor="middle" font-size="24" fill="${colors.player}" class="player-glow">
              🔴
            </text>
          `;
        }
      }
    }

    svg += `
        </g>
        
        <!-- Legend -->
        <g transform="translate(${mapWidth + this.config.padding * 2}, ${this.config.headerHeight + this.config.padding})">
          <rect x="0" y="0" width="${this.config.legendWidth - 20}" height="${finalMapHeight}" 
                fill="rgba(0,0,0,0.7)" stroke="${colors.border}" stroke-width="1"/>
          
          <text x="10" y="20" class="legend-title">🔍 Legenda</text>
    `;

    // Adicionar itens da legenda
    const legendItems = [
      { symbol: '🔴', text: 'Sua posição', color: colors.player },
      { symbol: '🚪', text: 'Entrada', color: '#00ff00' },
      { symbol: '👹', text: 'Monstro', color: '#ff4444' },
      { symbol: '💀', text: 'Boss', color: '#880000' },
      { symbol: '🏪', text: 'Loja', color: '#ffaa00' },
      { symbol: '💎', text: 'Tesouro', color: '#00aaff' },
      { symbol: '❔', text: 'Inexplorado', color: '#666666' }
    ];

    legendItems.forEach((item, index) => {
      const yPos = 50 + index * 25;
      svg += `
        <text x="15" y="${yPos}" font-size="16" fill="${item.color}">${item.symbol}</text>
        <text x="40" y="${yPos}" class="legend-text">${item.text}</text>
      `;
    });

    // Estatísticas de exploração (posicionadas após a legenda)
    const stats = this.calculateMapStats(dungeon);
    const progressStartY = 50 + legendItems.length * 25 + 30; // Espaço após legenda
    svg += `
      <text x="10" y="${progressStartY}" class="legend-title">📊 Progresso</text>
      <text x="10" y="${progressStartY + 20}" class="legend-text">Explorado: ${stats.discovered}/${stats.total}</text>
      <text x="10" y="${progressStartY + 40}" class="legend-text">Progresso: ${stats.percentage}%</text>
    `;

    svg += `
        </g>
      </svg>
    `;

    return svg;
  }

  /**
   * Converte SVG para PNG usando Sharp
   * @param {string} svgString - String do SVG
   * @param {Object} options - Opções de conversão
   */
  async svgToPng(svgString, options = {}) {
    const { width = 1200, quality = 90 } = options;
    
    try {
      const pngBuffer = await sharp(Buffer.from(svgString))
        .png({ quality })
        .resize(width, null, { withoutEnlargement: true })
        .toBuffer();
      
      return pngBuffer;
    } catch (error) {
      console.error('Erro ao converter SVG para PNG:', error);
      throw error;
    }
  }

  /**
   * Gera um arquivo de mapa completo (SVG + PNG)
   * @param {Object} dungeon - Dados da dungeon
   * @param {number} playerX - Posição X do jogador
   * @param {number} playerY - Posição Y do jogador
   * @param {string} mode - Modo do mapa ('local' ou 'full')
   * @param {string} format - Formato de saída ('svg', 'png', 'both')
   */
  async generateMap(dungeon, playerX, playerY, mode = 'local', format = 'png') {
    const svg = this.generateMapSVG(dungeon, playerX, playerY, mode === 'full', mode);
    
    const result = { svg };
    
    if (format === 'png' || format === 'both') {
      result.png = await this.svgToPng(svg);
    }
    
    return result;
  }

  /**
   * Calcula estatísticas do mapa
   */
  calculateMapStats(dungeon) {
    const grid = dungeon.grid;
    let total = 0;
    let discovered = 0;

    for (let x = 0; x < grid.length; x++) {
      for (let y = 0; y < grid[x].length; y++) {
        if (grid[x][y]) {
          total++;
          if (grid[x][y].discovered) {
            discovered++;
          }
        }
      }
    }

    return {
      total,
      discovered,
      percentage: Math.round((discovered / total) * 100)
    };
  }

  /**
   * Converte código do bioma para nome legível
   */
  getBiomeName(biome) {
    const names = {
      'CRYPT': 'Cripta Sombria',
      'VOLCANO': 'Vulcão Ardente', 
      'FOREST': 'Floresta Perdida',
      'GLACIER': 'Geleira Eterna',
      'RUINS': 'Ruínas Antigas',
      'ABYSS': 'Abismo Profundo'
    };
    return names[biome] || 'Dungeon Misteriosa';
  }
}

// Instância global do renderizador
export const mapRenderer = new MapRenderer();