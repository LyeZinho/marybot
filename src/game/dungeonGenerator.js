// Sistema de geração procedural de dungeons
// Baseado em seeds para garantir reprodutibilidade

export class SeededRandom {
  constructor(seed) {
    this.seed = seed;
  }

  // Gera número aleatório entre 0 e 1
  random() {
    this.seed = (this.seed * 9301 + 49297) % 233280;
    return this.seed / 233280;
  }

  // Gera inteiro entre min e max (inclusive)
  int(min, max) {
    return Math.floor(this.random() * (max - min + 1)) + min;
  }

  // Escolhe elemento aleatório de array
  choice(array) {
    return array[this.int(0, array.length - 1)];
  }

  // Embaralha array
  shuffle(array) {
    const result = [...array];
    for (let i = result.length - 1; i > 0; i--) {
      const j = this.int(0, i);
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }
}

export class DungeonGenerator {
  constructor(seed, floor = 1) {
    this.rng = new SeededRandom(this.hashSeed(seed + floor));
    this.floor = floor;
    this.biome = this.getBiomeForFloor(floor);
  }

  // Converte string seed em número
  hashSeed(seed) {
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
      const char = seed.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Converte para 32bit int
    }
    return Math.abs(hash);
  }

  // Determina bioma baseado no andar
  getBiomeForFloor(floor) {
    const biomes = ['CRYPT', 'VOLCANO', 'FOREST', 'GLACIER', 'RUINS', 'ABYSS'];
    const index = Math.floor((floor - 1) / 5) % biomes.length;
    return biomes[index];
  }

  // Gera o mapa da dungeon
  generateDungeon(size = null) {
    const mapSize = size || this.rng.int(5, 8);
    const grid = this.createEmptyGrid(mapSize);
    
    // Posições especiais
    const entrance = { x: 0, y: Math.floor(mapSize / 2) };
    const boss = { x: mapSize - 1, y: Math.floor(mapSize / 2) };
    
    // Gerar caminho principal (garantir que seja resolvível)
    const mainPath = this.generateMainPath(entrance, boss, mapSize);
    
    // Preencher grid com salas
    this.fillGrid(grid, mainPath, entrance, boss);
    
    // Conectar salas adjacentes com saídas inteligentes
    this.connectRoomsWithSmartExits(grid, mapSize);
    
    return {
      size: mapSize,
      grid,
      entrance,
      boss,
      biome: this.biome,
      floor: this.floor,
      seed: this.rng.seed
    };
  }

  createEmptyGrid(size) {
    return Array(size).fill(null).map(() => 
      Array(size).fill(null).map(() => ({
        type: 'EMPTY',
        discovered: false,
        exits: [],
        content: null,
        description: '',
        isObstacle: false // Nova propriedade para identificar obstáculos
      }))
    );
  }

  generateMainPath(start, end, size) {
    const path = [start];
    let current = { ...start };
    
    // Caminho simplificado: vai sempre em direção ao boss
    while (current.x < end.x || current.y !== end.y) {
      if (current.x < end.x && this.rng.random() > 0.3) {
        current.x++;
      } else if (current.y < end.y) {
        current.y++;
      } else if (current.y > end.y) {
        current.y--;
      } else {
        current.x++;
      }
      
      path.push({ ...current });
    }
    
    return path;
  }

  fillGrid(grid, mainPath, entrance, boss) {
    const size = grid.length;
    
    // Marcar salas do caminho principal
    const pathSet = new Set(mainPath.map(p => `${p.x},${p.y}`));
    
    for (let x = 0; x < size; x++) {
      for (let y = 0; y < size; y++) {
        const room = grid[x][y];
        const isOnMainPath = pathSet.has(`${x},${y}`);
        
        // Definir tipo da sala
        if (x === entrance.x && y === entrance.y) {
          room.type = 'ENTRANCE';
          room.description = this.getRoomDescription('ENTRANCE');
        } else if (x === boss.x && y === boss.y) {
          room.type = 'BOSS';
          room.description = this.getRoomDescription('BOSS');
        } else if (isOnMainPath) {
          room.type = this.getMainPathRoomType();
          room.description = this.getRoomDescription(room.type);
        } else if (this.rng.random() < 0.7) { // 70% chance de ter sala
          let roomType = this.getRandomRoomType();
          // Se gerar obstáculo no caminho principal, substituir por sala vazia
          if (roomType === 'OBSTACLE' && isOnMainPath) {
            roomType = 'EMPTY';
          }
          room.type = roomType;
          room.description = this.getRoomDescription(room.type);
          
          // Marcar como obstáculo se necessário
          if (roomType === 'OBSTACLE') {
            room.isObstacle = true;
          }
        } else {
          room.type = null; // Sem sala (parede)
          room.content = null;
          continue;
        }
        
        // Adicionar conteúdo específico
        room.content = this.generateRoomContent(room.type);
      }
    }
  }

  getMainPathRoomType() {
    const types = ['MONSTER', 'EMPTY', 'LOOT', 'EVENT'];
    const weights = [0.4, 0.3, 0.2, 0.1];
    return this.weightedChoice(types, weights);
  }

  getRandomRoomType() {
    const types = ['MONSTER', 'TRAP', 'LOOT', 'SHOP', 'EVENT', 'EMPTY', 'OBSTACLE', 'WORKSHOP', 'ALCHEMY', 'ENCHANTING'];
    const weights = [0.26, 0.10, 0.15, 0.07, 0.07, 0.10, 0.10, 0.05, 0.05, 0.05]; // Crafting stations: 15% total
    return this.weightedChoice(types, weights);
  }

  weightedChoice(items, weights) {
    const random = this.rng.random();
    let sum = 0;
    
    for (let i = 0; i < items.length; i++) {
      sum += weights[i];
      if (random <= sum) {
        return items[i];
      }
    }
    
    return items[items.length - 1];
  }



  // Conecta salas com sistema inteligente de saídas
  connectRoomsWithSmartExits(grid, size) {
    for (let x = 0; x < size; x++) {
      for (let y = 0; y < size; y++) {
        const room = grid[x][y];
        if (!room.type || room.isObstacle) continue; // Pular obstáculos
        
        // Verificar conexões com salas adjacentes
        const directions = [
          { dir: 'north', dx: 0, dy: -1 },
          { dir: 'south', dx: 0, dy: 1 },
          { dir: 'east', dx: 1, dy: 0 },
          { dir: 'west', dx: -1, dy: 0 }
        ];
        
        // Calcular saídas possíveis (não bloqueadas)
        const possibleExits = [];
        
        for (const { dir, dx, dy } of directions) {
          const nx = x + dx;
          const ny = y + dy;
          
          // Verificar se está dentro dos limites
          if (nx >= 0 && nx < size && ny >= 0 && ny < size) {
            const neighbor = grid[nx][ny];
            // Só conectar se a sala vizinha existe e não é obstáculo
            if (neighbor.type && !neighbor.isObstacle) {
              possibleExits.push(dir);
            }
          }
        }
        
        // Determinar quantas saídas esta sala terá (variável aleatório)
        const maxExits = possibleExits.length;
        const minExits = Math.max(1, Math.floor(maxExits * 0.6)); // Pelo menos 60% das saídas possíveis
        const numExits = this.rng.int(minExits, maxExits);
        
        // Selecionar saídas aleatoriamente
        const shuffledExits = this.rng.shuffle([...possibleExits]);
        room.exits = shuffledExits.slice(0, numExits);
      }
    }
  }

  generateRoomContent(roomType) {
    switch (roomType) {
      case 'MONSTER':
        return {
          mobId: this.selectMobForBiome(),
          level: this.rng.int(this.floor, this.floor + 2)
        };
      
      case 'LOOT':
        return {
          coins: this.rng.int(10, 50) * this.floor,
          items: this.generateLootItems(),
          looted: false // Marca se o loot já foi coletado
        };
      
      case 'TRAP':
        return {
          damage: this.rng.int(5, 15) * this.floor,
          type: this.rng.choice(['poison', 'spikes', 'fire', 'ice'])
        };
      
      case 'SHOP':
        return {
          items: this.generateShopItems()
        };
      
      case 'EVENT':
        return {
          eventId: this.rng.choice(['treasure_chest', 'mysterious_altar', 'ancient_statue'])
        };
      
      case 'BOSS':
        return {
          mobId: this.selectBossForBiome(),
          level: this.floor + 3,
          isBoss: true
        };
      
      case 'OBSTACLE':
        return {
          blockType: this.rng.choice(['rocks', 'roots', 'collapse', 'wall']),
          description: 'Passagem completamente bloqueada'
        };
      
      default:
        return null;
    }
  }

  selectMobForBiome() {
    const mobsByBiome = {
      'CRYPT': ['skeleton', 'zombie', 'ghost', 'wraith'],
      'VOLCANO': ['fire_elemental', 'salamander', 'lava_golem'],
      'FOREST': ['goblin', 'wolf', 'treant', 'spider'],
      'GLACIER': ['ice_elemental', 'frost_giant', 'yeti'],
      'RUINS': ['construct', 'guardian', 'ancient_spirit'],
      'ABYSS': ['demon', 'shadow', 'void_spawn']
    };
    
    const mobs = mobsByBiome[this.biome] || mobsByBiome['CRYPT'];
    return this.rng.choice(mobs);
  }

  selectBossForBiome() {
    const bossesByBiome = {
      'CRYPT': ['lich_king', 'bone_dragon'],
      'VOLCANO': ['volcano_lord', 'phoenix'],
      'FOREST': ['forest_guardian', 'ancient_treant'],
      'GLACIER': ['frost_king', 'ice_dragon'],
      'RUINS': ['ancient_guardian', 'titan_construct'],
      'ABYSS': ['demon_lord', 'void_master']
    };
    
    const bosses = bossesByBiome[this.biome] || bossesByBiome['CRYPT'];
    return this.rng.choice(bosses);
  }

  generateLootItems() {
    const itemCount = this.rng.int(1, 3);
    const items = [];
    
    for (let i = 0; i < itemCount; i++) {
      items.push({
        type: this.rng.choice(['potion', 'weapon', 'armor', 'accessory']),
        rarity: this.rollRarity(),
        level: this.floor
      });
    }
    
    return items;
  }

  generateShopItems() {
    return [
      { type: 'health_potion', price: 50 },
      { type: 'mana_potion', price: 30 },
      { type: 'weapon_upgrade', price: 100 * this.floor },
      { type: 'armor_upgrade', price: 80 * this.floor }
    ];
  }

  rollRarity() {
    const random = this.rng.random();
    if (random < 0.5) return 'COMMON';
    if (random < 0.75) return 'UNCOMMON';
    if (random < 0.90) return 'RARE';
    if (random < 0.98) return 'EPIC';
    return 'LEGENDARY';
  }

  getRoomDescription(roomType) {
    const descriptions = {
      'ENTRANCE': [
        'A entrada da dungeon. Ar frio e úmido escapa pelas pedras antigas.',
        'Um portal sombrio marca o início da sua jornada.',
        'Runas antigas brilham fracamente nas paredes da entrada.'
      ],
      'EMPTY': [
        'Uma sala vazia com ecos de passos distantes.',
        'Nada além de poeira e sombras nesta câmara.',
        'Uma sala abandonada há muito tempo.'
      ],
      'MONSTER': [
        'Você sente uma presença hostil nesta sala.',
        'Sons ameaçadores ecoam pelas paredes.',
        'Algo se move nas sombras...'
      ],
      'LOOT': [
        'Um brilho dourado chama sua atenção.',
        'Há um baú antigo no centro da sala.',
        'Tesouros abandonados jazem aqui.'
      ],
      'TRAP': [
        'Esta sala parece perigosa...',
        'Você nota marcas suspeitas no chão.',
        'Algo não está certo neste lugar.'
      ],
      'SHOP': [
        'Um mercador misterioso oferece seus produtos.',
        'Uma loja improvisada surge das sombras.',
        'Alguém montou um pequeno posto comercial aqui.'
      ],
      'EVENT': [
        'Algo interessante acontece nesta sala.',
        'Uma situação estranha se apresenta.',
        'Você encontra algo inusitado.'
      ],
      'BOSS': [
        'Uma presença aterrorizante domina esta câmara.',
        'O ar fica denso conforme você se aproxima.',
        'Este é claramente o covil de algo poderoso.'
      ],
      'OBSTACLE': [
        'Uma parede rochosa bloqueia completamente a passagem.',
        'Escombros de pedra impedem qualquer entrada.',
        'Um desmoronamento tornou esta área inacessível.',
        'Raízes gigantes ou formações rochosas bloqueiam o caminho.'
      ],
      'WORKSHOP': [
        'Uma antiga forja ainda funcional domina esta sala.',
        'Ferramentas de ferreiro estão espalhadas pela bigorna.',
        'O calor de uma forja mágica aquece o ambiente.',
        'Uma oficina bem equipada para trabalhar metais.'
      ],
      'ALCHEMY': [
        'Frascos borbulhantes e caldeirões enchem a mesa.',
        'O ar está carregado com aromas de poções e essências.',
        'Um laboratório alquímico bem organizado.',
        'Ingredientes raros estão catalogados nas prateleiras.'
      ],
      'ENCHANTING': [
        'Cristais flutuantes emitem uma luz suave e mística.',
        'Runas arcanas brilham em um círculo de encantamento.',
        'Uma mesa de encantamento pulsa com energia mágica.',
        'O ar vibra com poder arcano concentrado.'
      ]
    };
    
    const options = descriptions[roomType] || descriptions['EMPTY'];
    return this.rng.choice(options);
  }
}