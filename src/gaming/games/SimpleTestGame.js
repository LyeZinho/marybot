/**
 * 🎮 Jogo Simples de Exemplo
 * Jogo básico para testar o sistema
 */

import { BaseGame } from '../BaseGame.js';
import { logger } from '../../utils/logger.js';

class SimpleTestGame extends BaseGame {
  constructor(options = {}) {
    super('simple_test', {
      type: 'simple',
      name: 'Jogo de Teste Simples',
      description: 'Jogo básico para testar o sistema de gaming',
      config: {
        maxPlayers: 1,
        timeLimit: 120000, // 2 minutos
        scoreLimit: 100,
        ...options.config
      },
      initialState: {
        score: 0,
        level: 1,
        lives: 3,
        position: { x: 0, y: 0 },
        inventory: [],
        ...options.initialState
      },
      ...options
    });

    // Estado específico do jogo simples
    this.gameArea = {
      width: 10,
      height: 10,
      items: [],
      enemies: [],
      player: { x: 5, y: 5 }
    };

    // Configurações específicas
    this.targetScore = 100;
    this.itemSpawnRate = 0.3;
    this.enemySpawnRate = 0.1;
  }

  /**
   * Inicialização específica do jogo simples
   */
  async onInitialize() {
    try {
      logger.info('🎮 Inicializando jogo de teste simples...');
      
      // Gerar itens iniciais
      this.generateItems(5);
      
      // Gerar inimigos iniciais
      this.generateEnemies(2);
      
      // Posicionar jogador no centro
      this.gameArea.player = { x: 5, y: 5 };
      this.state.position = { ...this.gameArea.player };
      
      logger.success('✅ Jogo de teste simples inicializado');
      
    } catch (error) {
      logger.error('❌ Erro ao inicializar jogo simples:', error);
      throw error;
    }
  }

  /**
   * Início específico do jogo simples
   */
  async onStart() {
    try {
      // Começar loop de spawn de itens/inimigos
      this.startSpawnLoop();
      
      logger.info('🚀 Jogo de teste simples iniciado');
      
    } catch (error) {
      logger.error('❌ Erro ao iniciar jogo simples:', error);
      throw error;
    }
  }

  /**
   * Processar ação específica do jogo simples
   */
  async onAction(action, data) {
    try {
      let result = {
        success: false,
        message: 'Ação não reconhecida',
        scoreChange: 0
      };

      switch (action) {
        case 'move':
        case 'up':
        case 'down':
        case 'left':
        case 'right':
          result = await this.handleMove(action, data);
          break;
          
        case 'collect':
          result = await this.handleCollect(data);
          break;
          
        case 'attack':
          result = await this.handleAttack(data);
          break;
          
        case 'wait':
          result = await this.handleWait(data);
          break;
          
        case 'status':
          result = await this.getGameStatus();
          break;
          
        default:
          result = {
            success: false,
            message: `Ação '${action}' não reconhecida. Ações disponíveis: move, up, down, left, right, collect, attack, wait, status`,
            scoreChange: 0
          };
      }

      // Processar eventos do jogo após a ação
      await this.processGameEvents();

      return result;

    } catch (error) {
      logger.error(`❌ Erro ao processar ação ${action}:`, error);
      return {
        success: false,
        message: error.message,
        scoreChange: 0
      };
    }
  }

  /**
   * Lidar com movimento
   */
  async handleMove(direction, data) {
    const currentPos = this.gameArea.player;
    let newPos = { ...currentPos };
    
    // Determinar nova posição
    switch (direction) {
      case 'up':
        newPos.y = Math.max(0, currentPos.y - 1);
        break;
      case 'down':
        newPos.y = Math.min(this.gameArea.height - 1, currentPos.y + 1);
        break;
      case 'left':
        newPos.x = Math.max(0, currentPos.x - 1);
        break;
      case 'right':
        newPos.x = Math.min(this.gameArea.width - 1, currentPos.x + 1);
        break;
      case 'move':
        // Movimento com coordenadas específicas
        if (data.x !== undefined) newPos.x = Math.max(0, Math.min(this.gameArea.width - 1, data.x));
        if (data.y !== undefined) newPos.y = Math.max(0, Math.min(this.gameArea.height - 1, data.y));
        break;
    }
    
    // Verificar se houve movimento
    if (newPos.x === currentPos.x && newPos.y === currentPos.y) {
      return {
        success: false,
        message: 'Movimento bloqueado - limite da área',
        scoreChange: 0
      };
    }
    
    // Atualizar posição
    this.gameArea.player = newPos;
    this.state.position = { ...newPos };
    
    // Verificar colisões
    const collisionResult = await this.checkCollisions();
    
    return {
      success: true,
      message: `Movido para (${newPos.x}, ${newPos.y})`,
      scoreChange: collisionResult.scoreChange || 0,
      collision: collisionResult.collision
    };
  }

  /**
   * Lidar com coleta
   */
  async handleCollect(data) {
    const playerPos = this.gameArea.player;
    
    // Encontrar itens na posição atual
    const itemsAtPosition = this.gameArea.items.filter(item => 
      item.x === playerPos.x && item.y === playerPos.y && !item.collected
    );
    
    if (itemsAtPosition.length === 0) {
      return {
        success: false,
        message: 'Nenhum item para coletar nesta posição',
        scoreChange: 0
      };
    }
    
    let totalScore = 0;
    let collectedItems = [];
    
    for (const item of itemsAtPosition) {
      item.collected = true;
      totalScore += item.value;
      collectedItems.push(item.type);
      this.state.inventory.push(item.type);
    }
    
    this.state.score += totalScore;
    
    return {
      success: true,
      message: `Coletou: ${collectedItems.join(', ')}`,
      scoreChange: totalScore,
      items: collectedItems
    };
  }

  /**
   * Lidar com ataque
   */
  async handleAttack(data) {
    const playerPos = this.gameArea.player;
    
    // Encontrar inimigos próximos (adjacentes)
    const nearbyEnemies = this.gameArea.enemies.filter(enemy => {
      const distance = Math.abs(enemy.x - playerPos.x) + Math.abs(enemy.y - playerPos.y);
      return distance <= 1 && !enemy.defeated;
    });
    
    if (nearbyEnemies.length === 0) {
      return {
        success: false,
        message: 'Nenhum inimigo próximo para atacar',
        scoreChange: 0
      };
    }
    
    let totalScore = 0;
    let defeatedEnemies = [];
    
    for (const enemy of nearbyEnemies) {
      enemy.defeated = true;
      totalScore += enemy.reward;
      defeatedEnemies.push(enemy.type);
    }
    
    this.state.score += totalScore;
    
    return {
      success: true,
      message: `Derrotou: ${defeatedEnemies.join(', ')}`,
      scoreChange: totalScore,
      enemies: defeatedEnemies
    };
  }

  /**
   * Aguardar
   */
  async handleWait(data) {
    const waitTime = data?.duration || 1000;
    
    // Simular passagem de tempo
    await new Promise(resolve => setTimeout(resolve, Math.min(waitTime, 3000)));
    
    return {
      success: true,
      message: `Aguardou ${waitTime}ms`,
      scoreChange: 0
    };
  }

  /**
   * Obter status do jogo
   */
  async getGameStatus() {
    const playerPos = this.gameArea.player;
    const itemsNearby = this.gameArea.items.filter(item => {
      const distance = Math.abs(item.x - playerPos.x) + Math.abs(item.y - playerPos.y);
      return distance <= 2 && !item.collected;
    }).length;
    
    const enemiesNearby = this.gameArea.enemies.filter(enemy => {
      const distance = Math.abs(enemy.x - playerPos.x) + Math.abs(enemy.y - playerPos.y);
      return distance <= 2 && !enemy.defeated;
    }).length;
    
    return {
      success: true,
      message: 'Status obtido',
      data: {
        position: playerPos,
        score: this.state.score,
        inventory: this.state.inventory,
        itemsNearby,
        enemiesNearby,
        gameArea: {
          width: this.gameArea.width,
          height: this.gameArea.height
        }
      },
      scoreChange: 0
    };
  }

  /**
   * Verificar colisões
   */
  async checkCollisions() {
    const playerPos = this.gameArea.player;
    let scoreChange = 0;
    let collision = null;
    
    // Verificar colisão com itens
    const itemsAtPosition = this.gameArea.items.filter(item => 
      item.x === playerPos.x && item.y === playerPos.y && !item.collected
    );
    
    if (itemsAtPosition.length > 0) {
      collision = { type: 'items', count: itemsAtPosition.length };
    }
    
    // Verificar colisão com inimigos
    const enemiesAtPosition = this.gameArea.enemies.filter(enemy => 
      enemy.x === playerPos.x && enemy.y === playerPos.y && !enemy.defeated
    );
    
    if (enemiesAtPosition.length > 0) {
      // Jogador perde vida ao colidir com inimigo
      this.state.lives -= 1;
      collision = { type: 'enemies', count: enemiesAtPosition.length, damage: 1 };
      
      if (this.state.lives <= 0) {
        await this.end('gameOver');
      }
    }
    
    return { scoreChange, collision };
  }

  /**
   * Processar eventos do jogo
   */
  async processGameEvents() {
    // Spawn de novos itens
    if (Math.random() < this.itemSpawnRate) {
      this.generateItems(1);
    }
    
    // Spawn de novos inimigos
    if (Math.random() < this.enemySpawnRate) {
      this.generateEnemies(1);
    }
    
    // Verificar condição de vitória
    if (this.state.score >= this.targetScore) {
      await this.end('victory');
    }
  }

  /**
   * Gerar itens aleatórios
   */
  generateItems(count) {
    for (let i = 0; i < count; i++) {
      const item = {
        id: `item_${Date.now()}_${i}`,
        type: ['coin', 'gem', 'potion'][Math.floor(Math.random() * 3)],
        x: Math.floor(Math.random() * this.gameArea.width),
        y: Math.floor(Math.random() * this.gameArea.height),
        value: Math.floor(Math.random() * 10) + 1,
        collected: false,
        timestamp: Date.now()
      };
      
      this.gameArea.items.push(item);
    }
  }

  /**
   * Gerar inimigos aleatórios
   */
  generateEnemies(count) {
    for (let i = 0; i < count; i++) {
      const enemy = {
        id: `enemy_${Date.now()}_${i}`,
        type: ['goblin', 'orc', 'skeleton'][Math.floor(Math.random() * 3)],
        x: Math.floor(Math.random() * this.gameArea.width),
        y: Math.floor(Math.random() * this.gameArea.height),
        reward: Math.floor(Math.random() * 15) + 5,
        defeated: false,
        timestamp: Date.now()
      };
      
      this.gameArea.enemies.push(enemy);
    }
  }

  /**
   * Iniciar loop de spawn
   */
  startSpawnLoop() {
    this.spawnInterval = setInterval(() => {
      if (this.isRunning && !this.isPaused) {
        this.processGameEvents();
      }
    }, 5000); // A cada 5 segundos
  }

  /**
   * Validar ação
   */
  async validateAction(action, data) {
    const validActions = ['move', 'up', 'down', 'left', 'right', 'collect', 'attack', 'wait', 'status'];
    
    if (!validActions.includes(action)) {
      return {
        valid: false,
        message: `Ação '${action}' não é válida. Ações disponíveis: ${validActions.join(', ')}`
      };
    }
    
    return {
      valid: true,
      message: 'Ação válida'
    };
  }

  /**
   * Finalização específica do jogo simples
   */
  async onEnd(reason) {
    try {
      // Parar loop de spawn
      if (this.spawnInterval) {
        clearInterval(this.spawnInterval);
      }
      
      logger.info(`🏁 Jogo de teste simples finalizado: ${reason}`);
      
      // Log de estatísticas finais
      logger.info(`📊 Estatísticas finais: Pontuação: ${this.state.score}, Itens coletados: ${this.state.inventory.length}, Vidas: ${this.state.lives}`);
      
    } catch (error) {
      logger.error('❌ Erro ao finalizar jogo simples:', error);
    }
  }

  /**
   * Obter representação visual do jogo (para debugging)
   */
  getVisualMap() {
    const map = Array(this.gameArea.height).fill().map(() => Array(this.gameArea.width).fill('.'));
    
    // Colocar itens
    this.gameArea.items.forEach(item => {
      if (!item.collected) {
        map[item.y][item.x] = item.type === 'coin' ? '$' : item.type === 'gem' ? '*' : '+';
      }
    });
    
    // Colocar inimigos
    this.gameArea.enemies.forEach(enemy => {
      if (!enemy.defeated) {
        map[enemy.y][enemy.x] = 'E';
      }
    });
    
    // Colocar jogador
    map[this.gameArea.player.y][this.gameArea.player.x] = 'P';
    
    return map.map(row => row.join(' ')).join('\n');
  }
}

export { SimpleTestGame };