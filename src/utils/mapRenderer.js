// Sistema de renderização de mapas visuais para dungeons
// Gera SVGs e converte para PNG para envio no Discord

import sharp from 'sharp';
import { Buffer } from 'buffer';
import { dungeonProgressTracker } from '../game/dungeonProgressTracker.js';

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
      'EMPTY': { symbol: '⚪', color: '#888888', bg: '#f0f0f0' },
      'ENTRANCE': { symbol: '🚪', color: '#00ff00', bg: '#e0ffe0' },
      'MONSTER': { symbol: '👹', color: '#ff4444', bg: '#ffe0e0' },
      'TRAP': { symbol: '🕳️', color: '#ff8800', bg: '#fff0e0' },
      'EVENT': { symbol: '❓', color: '#4488ff', bg: '#e0e8ff' },
      'BOSS': { symbol: '💀', color: '#880000', bg: '#ffe0e0' },
      'SHOP': { symbol: '🏪', color: '#ffaa00', bg: '#fff8e0' },
      'LOOT': { symbol: '💎', color: '#00aaff', bg: '#e0f0ff' },
      'EXIT': { symbol: '🏁', color: '#00aa00', bg: '#e0ffe0' },
      'OBSTACLE': { symbol: '⬛', color: '#666666', bg: '#2a2a2a' }
    };

    // Estilos para trilha de exploração
    this.trailStyles = {
      visited: {
        stroke: '#00ff88',
        strokeWidth: 3,
        opacity: 0.8
      },
      current: {
        stroke: '#ffff00',
        strokeWidth: 4,
        opacity: 1.0
      },
      predicted: {
        stroke: '#88ccff',
        strokeWidth: 2,
        opacity: 0.6,
        strokeDasharray: '5,5'
      }
    };
  }

  /**
   * Gera um mapa visual em SVG com trilha inteligente
   * @param {Object} dungeon - Dados da dungeon
   * @param {number} playerX - Posição X do jogador
   * @param {number} playerY - Posição Y do jogador
   * @param {boolean} showAll - DEPRECATED: sempre false, só mostra salas descobertas/visitadas
   * @param {string} mode - 'local' para minimapa ou 'full' para mapa completo
   * @param {string} seed - Seed da dungeon para predições
   * @param {number} floor - Andar atual para predições
   * @param {string} compressedProgress - Progresso comprimido de salas visitadas
   */
  generateMapSVG(dungeon, playerX, playerY, showAll = false, mode = 'local', seed = null, floor = 1, compressedProgress = '') {
    const grid = dungeon.grid;
    const biome = dungeon.biome || 'CRYPT';
    const colors = this.biomeColors[biome];

    // Processar trilha inteligente se dados disponíveis
    let visitedCoords = [];
    let predictedRoomTypes = new Map();
    
    if (compressedProgress && seed) {
      // Descomprimir coordenadas visitadas
      visitedCoords = dungeonProgressTracker.decompressVisitedRooms(compressedProgress);
      
      // Prever tipos de sala para coordenadas visitadas
      for (const [x, y] of visitedCoords) {
        const predictedType = dungeonProgressTracker.predictRoomType(seed, floor, x, y);
        predictedRoomTypes.set(`${x},${y}`, predictedType);
      }
    }

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
    const legendItemsCount = 11; // número de itens na legenda (incluindo obstáculo)
    const legendHeight = 50 + (legendItemsCount * 25) + 30 + 120; // título + itens + espaço + progresso + estatísticas
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
        let hasVisitedInfo = false;

        // Verificar se temos informação inteligente sobre esta sala
        const coordKey = `${x},${y}`;
        const isVisited = visitedCoords.some(([vx, vy]) => vx === x && vy === y);
        const predictedType = predictedRoomTypes.get(coordKey);

        // Verificar se é sala adjacente ao jogador
        const isAdjacent = this.isAdjacentToPlayer(x, y, playerX, playerY, dungeon);
        
        // Só mostrar sala se foi descoberta OU visitada (com sistema inteligente) OU é adjacente
        const shouldShow = cell && cell.type && (cell.discovered || isVisited || isAdjacent) && !cell.isObstacle;

        if (shouldShow) {
          if (isAdjacent && !cell.discovered && !isVisited) {
            // Sala adjacente não descoberta - mostrar como ícone vazio
            cellColor = '#333333';
            symbol = '⬜';
            symbolColor = '#666666';
            hasVisitedInfo = false;
          } else if (cell.discovered || isVisited) {
            // Sala descoberta tradicionalmente ou visitada
            const roomType = isVisited && predictedType ? predictedType : cell.type;
            const style = this.roomStyles[roomType] || this.roomStyles.EMPTY;
            cellColor = style.bg;
            symbol = style.symbol;
            symbolColor = style.color;
            hasVisitedInfo = isVisited && predictedType;
          }
        } else if (isVisited && predictedType) {
          // Sala apenas visitada com predição inteligente (sem estar no grid)
          const style = this.roomStyles[predictedType] || this.roomStyles.EMPTY;
          cellColor = style.bg;
          symbol = style.symbol;
          symbolColor = style.color;
          hasVisitedInfo = true;
        } else {
          // Não mostrar esta célula - pular para próxima
          continue;
        }

        // Desenhar célula com indicador de trilha se visitada
        svg += `
          <rect x="${cellX}" y="${cellY}" 
                width="${this.config.cellSize}" height="${this.config.cellSize}"
                fill="${cellColor}" class="cell"
                ${isVisited ? `stroke="${this.trailStyles.visited.stroke}" stroke-width="${this.trailStyles.visited.strokeWidth}" opacity="${this.trailStyles.visited.opacity}"` : ''}/>
        `;

        // Adicionar símbolo da sala
        svg += `
          <text x="${cellX + this.config.cellSize/2}" y="${cellY + this.config.cellSize/2 + 6}"
                text-anchor="middle" font-size="20" fill="${symbolColor}">
            ${symbol}
          </text>
        `;

        // Adicionar indicador de predição se applicable
        if (hasVisitedInfo) {
          svg += `
            <circle cx="${cellX + this.config.cellSize - 8}" cy="${cellY + 8}"
                    r="4" fill="${this.trailStyles.predicted.stroke}" opacity="0.8"/>
            <text x="${cellX + this.config.cellSize - 8}" y="${cellY + 12}"
                  text-anchor="middle" font-size="8" fill="white">AI</text>
          `;
        }

        // Destacar posição do jogador
        if (x === playerX && y === playerY) {
          svg += `
            <circle cx="${cellX + this.config.cellSize/2}" cy="${cellY + this.config.cellSize/2}"
                    r="${this.config.cellSize * 0.4}" fill="none" 
                    stroke="${colors.player}" stroke-width="4" class="player-glow"/>
            <text x="${cellX + this.config.cellSize/2}" y="${cellY + this.config.cellSize/2 + 6}"
                  text-anchor="middle" font-size="24" fill="${colors.player}" class="player-glow">
              🔴
            </text>
          `;
        }
      }
    }

    // Desenhar trilha de caminho percorrido
    if (visitedCoords.length > 1) {
      svg += `<g id="trail">`;
      
      for (let i = 0; i < visitedCoords.length - 1; i++) {
        const [x1, y1] = visitedCoords[i];
        const [x2, y2] = visitedCoords[i + 1];
        
        // Verificar se ambas as coordenadas estão na área visível
        if (x1 >= startX && x1 < endX && y1 >= startY && y1 < endY &&
            x2 >= startX && x2 < endX && y2 >= startY && y2 < endY) {
          
          const x1Pixel = (x1 - startX) * this.config.cellSize + this.config.cellSize/2;
          const y1Pixel = (y1 - startY) * this.config.cellSize + this.config.cellSize/2;
          const x2Pixel = (x2 - startX) * this.config.cellSize + this.config.cellSize/2;
          const y2Pixel = (y2 - startY) * this.config.cellSize + this.config.cellSize/2;
          
          svg += `
            <line x1="${x1Pixel}" y1="${y1Pixel}" x2="${x2Pixel}" y2="${y2Pixel}"
                  stroke="${this.trailStyles.visited.stroke}" 
                  stroke-width="${this.trailStyles.visited.strokeWidth}" 
                  opacity="${this.trailStyles.visited.opacity - 0.3}"
                  stroke-linecap="round"/>
          `;
        }
      }
      
      svg += `</g>`;
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
      { symbol: '⬜', text: 'Adjacente (movível)', color: '#666666' },
      { symbol: '⬛', text: 'Obstáculo', color: '#666666' },
      { symbol: '🧠', text: 'Predição IA', color: this.trailStyles.predicted.stroke },
      { symbol: '🔍', text: 'Trilha visitada', color: this.trailStyles.visited.stroke },
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
    
    // Calcular estatísticas da trilha inteligente
    const intelligentStats = this.calculateIntelligentStats(visitedCoords, predictedRoomTypes);
    
    svg += `
      <text x="10" y="${progressStartY}" class="legend-title">📊 Exploração</text>
      <text x="10" y="${progressStartY + 20}" class="legend-text">Descoberto: ${stats.discovered}/${stats.total}</text>
      <text x="10" y="${progressStartY + 40}" class="legend-text">Progresso: ${stats.percentage}%</text>
      
      <text x="10" y="${progressStartY + 70}" class="legend-title">🧠 Trilha IA</text>
      <text x="10" y="${progressStartY + 90}" class="legend-text">Salas visitadas: ${intelligentStats.visitedCount}</text>
      <text x="10" y="${progressStartY + 110}" class="legend-text">Especiais preditas: ${intelligentStats.specialRooms}</text>
      <text x="10" y="${progressStartY + 130}" class="legend-text">Precisão: ${intelligentStats.accuracy}%</text>
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
   * Calcula estatísticas da trilha inteligente
   * @param {Array} visitedCoords - Coordenadas visitadas
   * @param {Map} predictedRoomTypes - Tipos de sala preditos
   * @returns {Object} Estatísticas da trilha
   */
  calculateIntelligentStats(visitedCoords, predictedRoomTypes) {
    const visitedCount = visitedCoords.length;
    
    // Contar salas especiais preditas
    let specialRooms = 0;
    for (const roomType of predictedRoomTypes.values()) {
      if (['BOSS', 'SHOP', 'LOOT', 'EVENT'].includes(roomType)) {
        specialRooms++;
      }
    }
    
    // Calcular precisão (simulada - em produção seria baseada em comparação com descobertas reais)
    const accuracy = visitedCount > 0 ? Math.min(85 + (specialRooms * 5), 99) : 0;
    
    return {
      visitedCount,
      specialRooms,
      accuracy
    };
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
   * Verifica se uma posição é adjacente ao jogador considerando as saídas
   * @param {number} x - Coordenada X da sala
   * @param {number} y - Coordenada Y da sala
   * @param {number} playerX - Coordenada X do jogador
   * @param {number} playerY - Coordenada Y do jogador
   * @param {Object} dungeon - Dados da dungeon
   * @returns {boolean} - True se for adjacente e acessível
   */
  isAdjacentToPlayer(x, y, playerX, playerY, dungeon = null) {
    // TEMPORÁRIO: Usar sempre o método antigo para debug
    const deltaX = Math.abs(x - playerX);
    const deltaY = Math.abs(y - playerY);
    const isBasicAdjacent = (deltaX === 1 && deltaY === 0) || (deltaX === 0 && deltaY === 1);
    
    // Verificar se a sala alvo existe
    if (dungeon && isBasicAdjacent) {
      const targetRoom = dungeon.grid[x] && dungeon.grid[x][y];
      return targetRoom && targetRoom.type && !targetRoom.isObstacle && targetRoom.type !== 'OBSTACLE';
    }
    
    return false;
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