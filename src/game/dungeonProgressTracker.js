// Sistema algorítmico de rastreamento de progresso em dungeons
// Utiliza seeds determinísticas para calcular e comprimir dados de exploração

export class DungeonProgressTracker {
  constructor() {
    this.visitedRooms = new Set(); // Cache temporário para sessão atual
  }

  /**
   * Comprime uma lista de coordenadas visitadas em uma string compacta
   * Usa encoding base36 para reduzir o tamanho
   * @param {Array} visitedCoords - Array de [x, y] coordenadas
   * @returns {string} String compactada representando o progresso
   */
  compressVisitedRooms(visitedCoords) {
    if (!visitedCoords || visitedCoords.length === 0) return '';
    
    // Ordenar coordenadas para garantir consistência
    const sorted = visitedCoords.sort((a, b) => {
      if (a[0] !== b[0]) return a[0] - b[0];
      return a[1] - b[1];
    });

    // Converter para string compacta usando base36
    let compressed = '';
    for (const [x, y] of sorted) {
      // Normalizar coordenadas negativas (adicionar offset)
      const normalizedX = x + 100; // Assumindo dungeons não maiores que 200x200
      const normalizedY = y + 100;
      
      // Combinar x,y em um número único e converter para base36
      const combined = (normalizedX * 1000) + normalizedY;
      compressed += combined.toString(36) + ',';
    }
    
    return compressed.slice(0, -1); // Remover última vírgula
  }

  /**
   * Descomprime string de progresso de volta para coordenadas
   * @param {string} compressedData - String compactada
   * @returns {Array} Array de [x, y] coordenadas
   */
  decompressVisitedRooms(compressedData) {
    if (!compressedData) return [];
    
    const coords = [];
    const parts = compressedData.split(',');
    
    for (const part of parts) {
      if (!part) continue;
      
      const combined = parseInt(part, 36);
      const normalizedX = Math.floor(combined / 1000);
      const normalizedY = combined % 1000;
      
      // Remover offset
      const x = normalizedX - 100;
      const y = normalizedY - 100;
      
      coords.push([x, y]);
    }
    
    return coords;
  }

  /**
   * Calcula hash único para uma posição baseado na seed
   * Permite validar se uma sala "existe" sem gerar todo o mapa
   * @param {string} seed - Seed da dungeon
   * @param {number} floor - Andar atual
   * @param {number} x - Coordenada X
   * @param {number} y - Coordenada Y
   * @returns {string} Hash único da sala
   */
  getRoomHash(seed, floor, x, y) {
    const combinedSeed = `${seed}-${floor}-${x}-${y}`;
    return this.simpleHash(combinedSeed);
  }

  /**
   * Hash simples mas determinístico
   * @param {string} str - String para hash
   * @returns {string} Hash resultante
   */
  simpleHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Converter para 32bit
    }
    return Math.abs(hash).toString(36);
  }

  /**
   * Calcula o progresso de exploração baseado na seed sem gerar o mapa completo
   * @param {string} seed - Seed da dungeon
   * @param {number} floor - Andar atual
   * @param {Array} visitedCoords - Coordenadas visitadas
   * @returns {Object} Dados de progresso
   */
  calculateExplorationProgress(seed, floor, visitedCoords) {
    const visitedSet = new Set(visitedCoords.map(([x, y]) => `${x},${y}`));
    const roomsVisited = visitedCoords.length;
    
    // Estimar total de salas baseado na seed e andar
    const estimatedTotalRooms = this.estimateTotalRooms(seed, floor);
    const explorationPercentage = Math.min((roomsVisited / estimatedTotalRooms) * 100, 100);
    
    // Calcular score de exploração (bônus por encontrar salas especiais)
    const specialRoomsFound = this.countSpecialRooms(seed, floor, visitedCoords);
    const explorationScore = roomsVisited * 10 + specialRoomsFound * 50;
    
    return {
      roomsVisited,
      estimatedTotalRooms,
      explorationPercentage: Math.round(explorationPercentage * 100) / 100,
      specialRoomsFound,
      explorationScore,
      isFloorComplete: explorationPercentage >= 95
    };
  }

  /**
   * Estima o número total de salas em um andar baseado na seed
   * @param {string} seed - Seed da dungeon
   * @param {number} floor - Andar atual
   * @returns {number} Número estimado de salas
   */
  estimateTotalRooms(seed, floor) {
    const seedNum = this.seedToNumber(seed);
    const floorMultiplier = 1 + (floor * 0.2); // Andares maiores = mais salas
    
    // Base de 30-60 salas, variando com seed e andar
    const baseRooms = 30 + (seedNum % 31); // 30-60
    return Math.floor(baseRooms * floorMultiplier);
  }

  /**
   * Conta salas especiais encontradas (BOSS, SHOP, LOOT, etc.)
   * @param {string} seed - Seed da dungeon
   * @param {number} floor - Andar atual
   * @param {Array} visitedCoords - Coordenadas visitadas
   * @returns {number} Número de salas especiais encontradas
   */
  countSpecialRooms(seed, floor, visitedCoords) {
    let specialCount = 0;
    
    for (const [x, y] of visitedCoords) {
      const roomType = this.predictRoomType(seed, floor, x, y);
      if (['BOSS', 'SHOP', 'LOOT', 'EVENT'].includes(roomType)) {
        specialCount++;
      }
    }
    
    return specialCount;
  }

  /**
   * Prediz o tipo de sala baseado na seed sem gerar o mapa
   * @param {string} seed - Seed da dungeon
   * @param {number} floor - Andar atual
   * @param {number} x - Coordenada X
   * @param {number} y - Coordenada Y
   * @returns {string} Tipo da sala previsto
   */
  predictRoomType(seed, floor, x, y) {
    const roomHash = this.getRoomHash(seed, floor, x, y);
    const hashNum = parseInt(roomHash, 36);
    
    // Probabilidades baseadas na posição e hash
    const specialChance = hashNum % 100;
    
    if (specialChance < 5) return 'BOSS';
    if (specialChance < 10) return 'SHOP';
    if (specialChance < 20) return 'LOOT';
    if (specialChance < 30) return 'EVENT';
    if (specialChance < 50) return 'MONSTER';
    if (specialChance < 70) return 'TRAP';
    return 'EMPTY';
  }

  /**
   * Converte seed string em número para cálculos
   * @param {string} seed - Seed da dungeon
   * @returns {number} Número baseado na seed
   */
  seedToNumber(seed) {
    let num = 0;
    for (let i = 0; i < seed.length; i++) {
      num += seed.charCodeAt(i) * (i + 1);
    }
    return num;
  }

  /**
   * Marca uma sala como visitada no progresso atual
   * @param {number} x - Coordenada X
   * @param {number} y - Coordenada Y
   */
  markRoomVisited(x, y) {
    this.visitedRooms.add(`${x},${y}`);
  }

  /**
   * Verifica se uma sala já foi visitada
   * @param {number} x - Coordenada X
   * @param {number} y - Coordenada Y
   * @returns {boolean} True se já visitada
   */
  isRoomVisited(x, y) {
    return this.visitedRooms.has(`${x},${y}`);
  }

  /**
   * Obtém todas as salas visitadas na sessão atual
   * @returns {Array} Array de [x, y] coordenadas
   */
  getCurrentVisitedRooms() {
    return Array.from(this.visitedRooms).map(coord => {
      const [x, y] = coord.split(',').map(Number);
      return [x, y];
    });
  }

  /**
   * Carrega progresso comprimido e reconstitui cache
   * @param {string} compressedProgress - Progresso comprimido
   */
  loadProgress(compressedProgress) {
    this.visitedRooms.clear();
    const coords = this.decompressVisitedRooms(compressedProgress);
    
    for (const [x, y] of coords) {
      this.visitedRooms.add(`${x},${y}`);
    }
  }

  /**
   * Salva progresso atual comprimido
   * @returns {string} Progresso comprimido
   */
  saveProgress() {
    const coords = this.getCurrentVisitedRooms();
    return this.compressVisitedRooms(coords);
  }

  /**
   * Gera relatório detalhado de exploração
   * @param {string} seed - Seed da dungeon
   * @param {number} floor - Andar atual
   * @returns {Object} Relatório completo
   */
  generateExplorationReport(seed, floor) {
    const visitedCoords = this.getCurrentVisitedRooms();
    const progress = this.calculateExplorationProgress(seed, floor, visitedCoords);
    const compressedData = this.saveProgress();
    
    return {
      ...progress,
      compressedProgress: compressedData,
      dataSize: compressedData.length,
      visitedCoordinates: visitedCoords,
      averageDataPerRoom: compressedData.length / Math.max(visitedCoords.length, 1)
    };
  }
}

// Instância global do rastreador de progresso
export const dungeonProgressTracker = new DungeonProgressTracker();