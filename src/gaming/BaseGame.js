/**
 * 🎮 Classe Base para Jogos
 * Interface comum para todos os tipos de jogos
 */

import { logger } from '../utils/logger.js';
import { EventEmitter } from 'events';

class BaseGame extends EventEmitter {
  constructor(gameId, options = {}) {
    super();
    
    this.gameId = gameId;
    this.gameType = options.type || 'generic';
    this.gameName = options.name || gameId;
    this.description = options.description || 'Jogo genérico';
    
    // Estados do jogo
    this.isInitialized = false;
    this.isRunning = false;
    this.isPaused = false;
    this.isEnded = false;
    
    // Configurações do jogo
    this.config = {
      maxPlayers: 1,
      timeLimit: null,
      scoreLimit: null,
      difficulty: 'normal',
      ...options.config
    };
    
    // Estado atual
    this.state = {
      score: 0,
      level: 1,
      lives: 3,
      time: 0,
      actions: 0,
      ...options.initialState
    };
    
    // Histórico de ações
    this.actionHistory = [];
    this.startTime = null;
    this.endTime = null;
    
    // Estatísticas
    this.stats = {
      totalActions: 0,
      successfulActions: 0,
      failedActions: 0,
      averageActionTime: 0,
      bestScore: 0,
      totalTime: 0
    };
    
    // Eventos do jogo
    this.setupEventHandlers();
  }

  /**
   * Inicializar jogo
   */
  async initialize() {
    try {
      logger.info(`🎮 Inicializando jogo: ${this.gameName}`);
      
      // Reset do estado
      this.resetState();
      
      // Inicialização específica do jogo
      await this.onInitialize();
      
      this.isInitialized = true;
      this.emit('initialized', { gameId: this.gameId });
      
      logger.success(`✅ Jogo inicializado: ${this.gameName}`);
      
    } catch (error) {
      logger.error(`❌ Erro ao inicializar jogo ${this.gameId}:`, error);
      throw error;
    }
  }

  /**
   * Iniciar jogo
   */
  async start() {
    if (!this.isInitialized) {
      throw new Error('Jogo deve ser inicializado primeiro');
    }
    
    if (this.isRunning) {
      throw new Error('Jogo já está rodando');
    }
    
    try {
      logger.info(`🎯 Iniciando jogo: ${this.gameName}`);
      
      this.isRunning = true;
      this.isPaused = false;
      this.isEnded = false;
      this.startTime = Date.now();
      
      // Início específico do jogo
      await this.onStart();
      
      this.emit('started', { gameId: this.gameId, timestamp: this.startTime });
      
      logger.success(`🚀 Jogo iniciado: ${this.gameName}`);
      
    } catch (error) {
      logger.error(`❌ Erro ao iniciar jogo ${this.gameId}:`, error);
      this.isRunning = false;
      throw error;
    }
  }

  /**
   * Processar ação do jogador
   */
  async processAction(action, data = {}) {
    if (!this.isRunning || this.isPaused || this.isEnded) {
      return {
        success: false,
        message: 'Jogo não está ativo',
        state: this.getState()
      };
    }
    
    try {
      const actionStart = Date.now();
      
      // Validar ação
      const validation = await this.validateAction(action, data);
      if (!validation.valid) {
        return {
          success: false,
          message: validation.message,
          state: this.getState()
        };
      }
      
      // Processar ação específica do jogo
      const result = await this.onAction(action, data);
      
      // Registrar ação
      const actionTime = Date.now() - actionStart;
      this.recordAction(action, data, result, actionTime);
      
      // Verificar condições de fim de jogo
      await this.checkGameEnd();
      
      this.emit('action', {
        gameId: this.gameId,
        action,
        data,
        result,
        state: this.getState(),
        timestamp: Date.now()
      });
      
      return {
        success: true,
        result,
        state: this.getState(),
        actionTime
      };
      
    } catch (error) {
      logger.error(`❌ Erro ao processar ação ${action} no jogo ${this.gameId}:`, error);
      
      this.recordAction(action, data, { success: false, error: error.message }, 0);
      
      return {
        success: false,
        message: error.message,
        state: this.getState()
      };
    }
  }

  /**
   * Pausar jogo
   */
  async pause() {
    if (!this.isRunning || this.isPaused) {
      return false;
    }
    
    this.isPaused = true;
    await this.onPause();
    
    this.emit('paused', { gameId: this.gameId, timestamp: Date.now() });
    logger.info(`⏸️ Jogo pausado: ${this.gameName}`);
    
    return true;
  }

  /**
   * Resumir jogo
   */
  async resume() {
    if (!this.isRunning || !this.isPaused) {
      return false;
    }
    
    this.isPaused = false;
    await this.onResume();
    
    this.emit('resumed', { gameId: this.gameId, timestamp: Date.now() });
    logger.info(`▶️ Jogo resumido: ${this.gameName}`);
    
    return true;
  }

  /**
   * Finalizar jogo
   */
  async end(reason = 'manual') {
    if (!this.isRunning || this.isEnded) {
      return false;
    }
    
    try {
      this.isEnded = true;
      this.isRunning = false;
      this.endTime = Date.now();
      
      // Calcular estatísticas finais
      this.calculateFinalStats();
      
      // Finalização específica do jogo
      await this.onEnd(reason);
      
      const gameData = this.getGameData();
      
      this.emit('ended', {
        gameId: this.gameId,
        reason,
        gameData,
        timestamp: this.endTime
      });
      
      logger.info(`🏁 Jogo finalizado: ${this.gameName} (${reason})`);
      
      return gameData;
      
    } catch (error) {
      logger.error(`❌ Erro ao finalizar jogo ${this.gameId}:`, error);
      throw error;
    }
  }

  /**
   * Obter estado atual
   */
  getState() {
    return {
      ...this.state,
      isRunning: this.isRunning,
      isPaused: this.isPaused,
      isEnded: this.isEnded,
      timestamp: Date.now()
    };
  }

  /**
   * Obter dados completos do jogo
   */
  getGameData() {
    const totalTime = this.endTime ? this.endTime - this.startTime : Date.now() - (this.startTime || Date.now());
    
    return {
      gameId: this.gameId,
      gameType: this.gameType,
      gameName: this.gameName,
      startTime: this.startTime,
      endTime: this.endTime,
      totalTime,
      finalState: this.getState(),
      stats: this.stats,
      history: this.actionHistory,
      config: this.config
    };
  }

  /**
   * Registrar ação
   */
  recordAction(action, data, result, actionTime) {
    this.state.actions++;
    this.stats.totalActions++;
    
    if (result.success) {
      this.stats.successfulActions++;
    } else {
      this.stats.failedActions++;
    }
    
    // Atualizar tempo médio de ação
    this.stats.averageActionTime = (
      (this.stats.averageActionTime * (this.stats.totalActions - 1) + actionTime) / 
      this.stats.totalActions
    );
    
    // Adicionar ao histórico
    this.actionHistory.push({
      action,
      data,
      result,
      state: { ...this.state },
      actionTime,
      timestamp: Date.now()
    });
    
    // Manter histórico limitado
    if (this.actionHistory.length > 1000) {
      this.actionHistory = this.actionHistory.slice(-1000);
    }
  }

  /**
   * Reset do estado
   */
  resetState() {
    this.isRunning = false;
    this.isPaused = false;
    this.isEnded = false;
    this.startTime = null;
    this.endTime = null;
    this.actionHistory = [];
    
    // Reset do estado específico do jogo
    this.state = {
      score: 0,
      level: 1,
      lives: 3,
      time: 0,
      actions: 0
    };
    
    this.stats = {
      totalActions: 0,
      successfulActions: 0,
      failedActions: 0,
      averageActionTime: 0,
      bestScore: this.stats?.bestScore || 0,
      totalTime: 0
    };
  }

  /**
   * Calcular estatísticas finais
   */
  calculateFinalStats() {
    const totalTime = this.endTime - this.startTime;
    
    this.stats.totalTime = totalTime;
    this.stats.bestScore = Math.max(this.stats.bestScore, this.state.score);
    
    // Taxa de sucesso
    this.stats.successRate = this.stats.totalActions > 0 ? 
      this.stats.successfulActions / this.stats.totalActions : 0;
    
    // Ações por minuto
    this.stats.actionsPerMinute = totalTime > 0 ? 
      (this.stats.totalActions / (totalTime / 60000)) : 0;
  }

  /**
   * Verificar condições de fim de jogo
   */
  async checkGameEnd() {
    // Verificar limite de tempo
    if (this.config.timeLimit && this.startTime) {
      const elapsed = Date.now() - this.startTime;
      if (elapsed >= this.config.timeLimit) {
        await this.end('timeLimit');
        return;
      }
    }
    
    // Verificar limite de pontuação
    if (this.config.scoreLimit && this.state.score >= this.config.scoreLimit) {
      await this.end('scoreLimit');
      return;
    }
    
    // Verificar vidas
    if (this.state.lives <= 0) {
      await this.end('gameOver');
      return;
    }
    
    // Verificações específicas do jogo
    await this.onCheckGameEnd();
  }

  /**
   * Configurar manipuladores de eventos
   */
  setupEventHandlers() {
    this.on('error', (error) => {
      logger.error(`❌ Erro no jogo ${this.gameId}:`, error);
    });
    
    this.on('warning', (warning) => {
      logger.warn(`⚠️ Aviso no jogo ${this.gameId}:`, warning);
    });
  }

  // =================================
  // Métodos para serem sobrescritos
  // =================================

  /**
   * Inicialização específica do jogo
   */
  async onInitialize() {
    // Implementar na classe filha
  }

  /**
   * Início específico do jogo
   */
  async onStart() {
    // Implementar na classe filha
  }

  /**
   * Processar ação específica do jogo
   */
  async onAction(action, data) {
    // Implementar na classe filha
    return {
      success: true,
      message: 'Ação processada',
      scoreChange: 0
    };
  }

  /**
   * Validar ação
   */
  async validateAction(action, data) {
    // Implementar validações específicas na classe filha
    return {
      valid: true,
      message: 'Ação válida'
    };
  }

  /**
   * Pausar específico do jogo
   */
  async onPause() {
    // Implementar na classe filha se necessário
  }

  /**
   * Resumir específico do jogo
   */
  async onResume() {
    // Implementar na classe filha se necessário
  }

  /**
   * Finalização específica do jogo
   */
  async onEnd(reason) {
    // Implementar na classe filha se necessário
  }

  /**
   * Verificações específicas de fim de jogo
   */
  async onCheckGameEnd() {
    // Implementar na classe filha se necessário
  }
}

export { BaseGame };