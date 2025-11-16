/**
 * 🎯 Sessão de Jogo
 * Gerencia uma sessão individual de jogo
 */

import { logger } from '../utils/logger.js';

class GameSession {
  constructor(options) {
    this.id = options.id;
    this.userId = options.userId;
    this.channelId = options.channelId;
    this.gameId = options.gameId;
    this.gameInstance = options.gameInstance;
    this.gameAI = options.gameAI;
    this.browserEngine = options.browserEngine;
    this.options = options.options || {};
    
    this.isActive = false;
    this.isPaused = false;
    this.startTime = null;
    this.lastActivity = Date.now();
    this.score = 0;
    this.moves = 0;
    this.aiEnabled = options.options.aiEnabled || false;
    
    // Estado do jogo
    this.gameState = {};
    this.history = [];
    this.statistics = {
      actionsPerformed: 0,
      correctMoves: 0,
      incorrectMoves: 0,
      averageResponseTime: 0,
      peakScore: 0
    };
  }

  /**
   * Inicializar sessão
   */
  async initialize() {
    try {
      this.startTime = Date.now();
      this.isActive = true;
      
      // Inicializar instância do jogo
      await this.gameInstance.initialize(this);
      
      // Configurar IA se habilitada
      if (this.aiEnabled && this.gameAI) {
        await this.gameAI.loadGameModel(this.gameId);
      }

      logger.info(`🎯 Sessão ${this.id} inicializada para jogo ${this.gameId}`);

    } catch (error) {
      logger.error(`❌ Erro ao inicializar sessão ${this.id}:`, error);
      throw error;
    }
  }

  /**
   * Processar ação do usuário
   */
  async processAction(action, data = {}) {
    if (!this.isActive || this.isPaused) {
      throw new Error('Sessão não está ativa ou está pausada');
    }

    try {
      this.lastActivity = Date.now();
      const startTime = Date.now();
      
      // Processar ação no jogo
      const result = await this.gameInstance.processAction(action, data, this);
      
      // Atualizar estatísticas
      this.updateStatistics(action, result, Date.now() - startTime);
      
      // Adicionar ao histórico
      this.addToHistory(action, data, result);
      
      // Treinar IA se habilitada
      if (this.aiEnabled && this.gameAI) {
        await this.gameAI.trainFromAction(this.gameId, {
          state: this.gameState,
          action,
          data,
          result,
          score: this.score
        });
      }

      return result;

    } catch (error) {
      logger.error(`❌ Erro ao processar ação na sessão ${this.id}:`, error);
      throw error;
    }
  }

  /**
   * Obter sugestão da IA
   */
  async getAISuggestion() {
    if (!this.aiEnabled || !this.gameAI) {
      return null;
    }

    try {
      return await this.gameAI.suggestAction(this.gameId, this.gameState);
    } catch (error) {
      logger.error(`❌ Erro ao obter sugestão da IA:`, error);
      return null;
    }
  }

  /**
   * Executar ação da IA automaticamente
   */
  async executeAIAction() {
    const suggestion = await this.getAISuggestion();
    
    if (suggestion) {
      return await this.processAction(suggestion.action, suggestion.data);
    }
    
    return null;
  }

  /**
   * Pausar sessão
   */
  pause() {
    this.isPaused = true;
    logger.info(`⏸️ Sessão ${this.id} pausada`);
  }

  /**
   * Retomar sessão
   */
  resume() {
    this.isPaused = false;
    this.lastActivity = Date.now();
    logger.info(`▶️ Sessão ${this.id} retomada`);
  }

  /**
   * Encerrar sessão
   */
  async end(reason = 'manual') {
    try {
      this.isActive = false;
      
      // Finalizar jogo
      if (this.gameInstance) {
        await this.gameInstance.finalize(this, reason);
      }

      // Salvar dados da IA
      if (this.aiEnabled && this.gameAI) {
        await this.gameAI.saveGameSession(this.gameId, {
          sessionId: this.id,
          userId: this.userId,
          duration: Date.now() - this.startTime,
          score: this.score,
          moves: this.moves,
          statistics: this.statistics,
          history: this.history.slice(-100) // Manter apenas últimas 100 ações
        });
      }

      logger.info(`🏁 Sessão ${this.id} encerrada (${reason})`);

    } catch (error) {
      logger.error(`❌ Erro ao encerrar sessão ${this.id}:`, error);
    }
  }

  /**
   * Atualizar estado do jogo
   */
  updateGameState(newState) {
    this.gameState = { ...this.gameState, ...newState };
    this.lastActivity = Date.now();
  }

  /**
   * Atualizar pontuação
   */
  updateScore(points) {
    this.score += points;
    if (this.score > this.statistics.peakScore) {
      this.statistics.peakScore = this.score;
    }
  }

  /**
   * Atualizar estatísticas
   */
  updateStatistics(action, result, responseTime) {
    this.statistics.actionsPerformed++;
    
    if (result.success) {
      this.statistics.correctMoves++;
    } else {
      this.statistics.incorrectMoves++;
    }
    
    // Calcular tempo médio de resposta
    const totalResponseTime = this.statistics.averageResponseTime * (this.statistics.actionsPerformed - 1);
    this.statistics.averageResponseTime = (totalResponseTime + responseTime) / this.statistics.actionsPerformed;
    
    this.moves++;
  }

  /**
   * Adicionar ao histórico
   */
  addToHistory(action, data, result) {
    this.history.push({
      timestamp: Date.now(),
      action,
      data,
      result,
      gameState: JSON.parse(JSON.stringify(this.gameState)),
      score: this.score
    });

    // Manter apenas últimas 1000 ações
    if (this.history.length > 1000) {
      this.history = this.history.slice(-1000);
    }
  }

  /**
   * Obter informações da sessão
   */
  getSessionInfo() {
    const duration = this.startTime ? Date.now() - this.startTime : 0;
    
    return {
      id: this.id,
      userId: this.userId,
      channelId: this.channelId,
      gameId: this.gameId,
      isActive: this.isActive,
      isPaused: this.isPaused,
      duration,
      score: this.score,
      moves: this.moves,
      aiEnabled: this.aiEnabled,
      statistics: this.statistics,
      gameState: this.gameState
    };
  }

  /**
   * Exportar dados da sessão
   */
  exportSessionData() {
    return {
      ...this.getSessionInfo(),
      history: this.history,
      gameMetadata: this.gameInstance.getMetadata()
    };
  }
}

export { GameSession };