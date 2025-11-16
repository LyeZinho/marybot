/**
 * 🎮 Sistema de Gaming da MaryBot
 * Gerencia jogos, IA de aprendizado e interações
 */

import { logger } from '../utils/logger.js';
import { BrowserGameEngine } from './browser/BrowserGameEngine.js';
import { GameAI } from './ai/GameAI.js';
import { GameSession } from './GameSession.js';
import fs from 'fs';
import path from 'path';

class GamingManager {
  constructor(client) {
    this.client = client;
    this.games = new Map();
    this.activeSessions = new Map();
    this.browserEngine = null;
    this.gameAI = null;
    this.isInitialized = false;
    
    // Configurações
    this.config = {
      maxConcurrentSessions: 5,
      sessionTimeout: 30 * 60 * 1000, // 30 minutos
      enableBrowserGames: true,
      enableLearning: true,
      aiUpdateInterval: 10000, // 10 segundos
    };
  }

  /**
   * Inicializar sistema de gaming
   */
  async initialize() {
    try {
      logger.info('🎮 Inicializando sistema de gaming...');

      // Inicializar motor de jogos no browser
      if (this.config.enableBrowserGames) {
        this.browserEngine = new BrowserGameEngine();
        await this.browserEngine.initialize();
        logger.info('🌐 Motor de jogos no browser inicializado');
      }

      // Inicializar IA de jogos
      if (this.config.enableLearning) {
        this.gameAI = new GameAI();
        await this.gameAI.initialize();
        logger.info('🤖 IA de jogos inicializada');
      }

      // Carregar jogos disponíveis
      await this.loadAvailableGames();

      // Configurar limpeza automática de sessões
      this.setupSessionCleanup();

      this.isInitialized = true;
      logger.success('✅ Sistema de gaming inicializado com sucesso!');

    } catch (error) {
      logger.error('❌ Erro ao inicializar sistema de gaming:', error);
      throw error;
    }
  }

  /**
   * Carregar jogos disponíveis
   */
  async loadAvailableGames() {
    const gamesDir = path.join(process.cwd(), 'src', 'gaming', 'games');
    
    if (!fs.existsSync(gamesDir)) {
      logger.warn('⚠️ Diretório de jogos não encontrado');
      return;
    }

    const gameFiles = fs.readdirSync(gamesDir).filter(file => file.endsWith('.js'));
    
    for (const gameFile of gameFiles) {
      try {
        const GameClass = await import(path.join(gamesDir, gameFile));
        const game = new GameClass.default();
        
        this.games.set(game.id, {
          class: GameClass.default,
          metadata: game.getMetadata(),
          instance: game
        });
        
        logger.info(`🎯 Jogo carregado: ${game.getMetadata().name}`);
      } catch (error) {
        logger.error(`❌ Erro ao carregar jogo ${gameFile}:`, error);
      }
    }

    logger.info(`🎮 ${this.games.size} jogo(s) carregado(s)`);
  }

  /**
   * Iniciar nova sessão de jogo
   */
  async startGameSession(userId, gameId, channelId, options = {}) {
    try {
      // Verificar limites
      if (this.activeSessions.size >= this.config.maxConcurrentSessions) {
        throw new Error('Limite máximo de sessões atingido. Tente novamente mais tarde.');
      }

      // Verificar se o jogo existe
      if (!this.games.has(gameId)) {
        throw new Error(`Jogo '${gameId}' não encontrado.`);
      }

      // Verificar se o usuário já tem uma sessão ativa
      const existingSession = Array.from(this.activeSessions.values())
        .find(session => session.userId === userId && session.isActive);

      if (existingSession) {
        throw new Error('Você já tem uma sessão de jogo ativa. Use `/game stop` para encerrar.');
      }

      // Criar nova sessão
      const gameData = this.games.get(gameId);
      const gameInstance = new gameData.class();
      
      const session = new GameSession({
        id: this.generateSessionId(),
        userId,
        channelId,
        gameId,
        gameInstance,
        gameAI: this.gameAI,
        browserEngine: this.browserEngine,
        options
      });

      // Inicializar sessão
      await session.initialize();
      
      // Armazenar sessão
      this.activeSessions.set(session.id, session);

      logger.info(`🎮 Sessão iniciada: ${session.id} para usuário ${userId}`);
      
      return session;

    } catch (error) {
      logger.error('❌ Erro ao iniciar sessão de jogo:', error);
      throw error;
    }
  }

  /**
   * Encerrar sessão de jogo
   */
  async endGameSession(sessionId, reason = 'manual') {
    try {
      const session = this.activeSessions.get(sessionId);
      
      if (!session) {
        throw new Error('Sessão não encontrada');
      }

      // Encerrar sessão
      await session.end(reason);
      
      // Remover da lista
      this.activeSessions.delete(sessionId);

      logger.info(`🎮 Sessão encerrada: ${sessionId} (${reason})`);

    } catch (error) {
      logger.error('❌ Erro ao encerrar sessão:', error);
      throw error;
    }
  }

  /**
   * Obter sessão ativa do usuário
   */
  getUserActiveSession(userId) {
    return Array.from(this.activeSessions.values())
      .find(session => session.userId === userId && session.isActive);
  }

  /**
   * Processar ação do usuário
   */
  async processUserAction(userId, action, data = {}) {
    try {
      const session = this.getUserActiveSession(userId);
      
      if (!session) {
        throw new Error('Nenhuma sessão de jogo ativa encontrada');
      }

      return await session.processAction(action, data);

    } catch (error) {
      logger.error('❌ Erro ao processar ação:', error);
      throw error;
    }
  }

  /**
   * Obter lista de jogos disponíveis
   */
  getAvailableGames() {
    return Array.from(this.games.values()).map(game => game.metadata);
  }

  /**
   * Obter estatísticas do sistema
   */
  getSystemStats() {
    return {
      totalGames: this.games.size,
      activeSessions: this.activeSessions.size,
      maxSessions: this.config.maxConcurrentSessions,
      browserEngineStatus: this.browserEngine?.isReady || false,
      aiStatus: this.gameAI?.isReady || false,
      isInitialized: this.isInitialized
    };
  }

  /**
   * Configurar limpeza automática de sessões
   */
  setupSessionCleanup() {
    setInterval(() => {
      const now = Date.now();
      const sessionsToClean = [];

      for (const [sessionId, session] of this.activeSessions) {
        if (now - session.lastActivity > this.config.sessionTimeout) {
          sessionsToClean.push(sessionId);
        }
      }

      // Limpar sessões expiradas
      for (const sessionId of sessionsToClean) {
        this.endGameSession(sessionId, 'timeout')
          .catch(error => logger.error('Erro na limpeza de sessão:', error));
      }

      if (sessionsToClean.length > 0) {
        logger.info(`🧹 ${sessionsToClean.length} sessão(ões) expirada(s) removida(s)`);
      }
    }, 60000); // Verificar a cada minuto
  }

  /**
   * Gerar ID único para sessão
   */
  generateSessionId() {
    return `game_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Encerrar sistema de gaming
   */
  async shutdown() {
    try {
      logger.info('🎮 Encerrando sistema de gaming...');

      // Encerrar todas as sessões ativas
      const sessionIds = Array.from(this.activeSessions.keys());
      for (const sessionId of sessionIds) {
        await this.endGameSession(sessionId, 'shutdown');
      }

      // Encerrar motor do browser
      if (this.browserEngine) {
        await this.browserEngine.shutdown();
      }

      // Salvar dados da IA
      if (this.gameAI) {
        await this.gameAI.saveData();
      }

      this.isInitialized = false;
      logger.success('✅ Sistema de gaming encerrado com sucesso!');

    } catch (error) {
      logger.error('❌ Erro ao encerrar sistema de gaming:', error);
    }
  }
}

// Criar instância singleton
export const gamingManager = new GamingManager();

export { GamingManager };