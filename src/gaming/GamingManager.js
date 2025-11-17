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
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class GamingManager {
  constructor(client) {
    this.client = client;
    this.games = new Map();
    this.activeSessions = new Map();
    this.browserEngine = null;
    this.gameAI = null;
    this.gameServerProcess = null;
    this.gameServerPort = 3002;
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

      // Inicializar servidor de jogos
      await this.startGameServer();

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
    // Carregar jogos JS (se existirem)
    const jsGamesDir = path.join(process.cwd(), 'src', 'gaming', 'games');
    
    if (fs.existsSync(jsGamesDir)) {
      const gameFiles = fs.readdirSync(jsGamesDir).filter(file => file.endsWith('.js'));
      
      for (const gameFile of gameFiles) {
        try {
          const GameClass = await import(path.join(jsGamesDir, gameFile));
          const game = new GameClass.default();
          
          this.games.set(game.id, {
            class: GameClass.default,
            metadata: game.getMetadata(),
            instance: game,
            type: 'javascript'
          });
          
          logger.info(`🎯 Jogo JS carregado: ${game.getMetadata().name}`);
        } catch (error) {
          logger.error(`❌ Erro ao carregar jogo ${gameFile}:`, error);
        }
      }
    }

    // Carregar jogos HTML
    const htmlGamesDir = path.join(process.cwd(), 'games');
    
    if (fs.existsSync(htmlGamesDir)) {
      const gameDirs = fs.readdirSync(htmlGamesDir, { withFileTypes: true })
        .filter(dirent => dirent.isDirectory())
        .map(dirent => dirent.name);
      
      for (const gameDir of gameDirs) {
        const indexPath = path.join(htmlGamesDir, gameDir, 'index.html');
        
        if (fs.existsSync(indexPath)) {
          const gameId = gameDir;
          const gameUrl = this.getGameServerUrl(`/${gameDir}/index.html`);
          
          this.games.set(gameId, {
            id: gameId,
            name: this.formatGameName(gameId),
            type: 'html',
            url: gameUrl,
            path: indexPath,
            description: this.getGameDescription(gameId),
            metadata: {
              name: this.formatGameName(gameId),
              description: this.getGameDescription(gameId),
              type: 'html',
              category: 'web-game',
              requiresBrowser: true
            }
          });
          
          logger.info(`🌐 Jogo HTML carregado: ${this.formatGameName(gameId)}`);
        }
      }
    }

    logger.info(`🎮 ${this.games.size} jogo(s) carregado(s)`);
  }

  /**
   * 🎯 Formatar nome do jogo
   */
  formatGameName(gameId) {
    const names = {
      'tic-tac-toe': 'Jogo da Velha',
      'snake': 'Snake Game',
      'chess': 'Xadrez',
      'connect4': 'Conecta 4',
      '2048': '2048'
    };
    return names[gameId] || gameId.charAt(0).toUpperCase() + gameId.slice(1);
  }

  /**
   * 🎯 Obter descrição do jogo
   */
  getGameDescription(gameId) {
    const descriptions = {
      'tic-tac-toe': 'Clássico jogo da velha com IA estratégica usando algoritmo minimax',
      'snake': 'Jogo da cobrinha com IA usando algoritmos de pathfinding A*',
      'chess': 'Xadrez completo com IA avançada usando minimax e alpha-beta pruning',
      'connect4': 'Conecta 4 com IA usando expectiminimax e avaliação heurística',
      '2048': 'Puzzle numérico com IA otimizada usando expectiminimax'
    };
    return descriptions[gameId] || 'Jogo interativo com IA para treinamento';
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
    return Array.from(this.games.values()).map(game => {
      // Para jogos HTML, retornar estrutura compatível
      if (game.type === 'html') {
        return {
          gameId: game.id,
          name: game.name,
          type: game.type,
          url: game.url,
          description: game.description,
          metadata: game.metadata
        };
      }
      
      // Para jogos JS, retornar metadata
      return game.metadata;
    });
  }

  /**
   * 📊 Obter estatísticas da IA
   */
  async getAIStats() {
    if (!this.gameAI) {
      return {
        models: {},
        totalActions: 0,
        completedSessions: 0,
        averageAccuracy: 0
      };
    }
    
    return await this.gameAI.getStatistics();
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

      // Encerrar servidor de jogos
      await this.stopGameServer();

      this.isInitialized = false;
      logger.success('✅ Sistema de gaming encerrado com sucesso!');

    } catch (error) {
      logger.error('❌ Erro ao encerrar sistema de gaming:', error);
    }
  }

  /**
   * 🌐 Iniciar servidor de jogos
   */
  async startGameServer() {
    try {
      if (this.gameServerProcess) {
        logger.warn('⚠️ Servidor de jogos já está rodando');
        return;
      }

      const gameServerPath = path.join(__dirname, '../../games/gameServer.js');
      
      if (!fs.existsSync(gameServerPath)) {
        logger.warn('⚠️ Servidor de jogos não encontrado:', gameServerPath);
        return;
      }

      // Iniciar processo do servidor
      this.gameServerProcess = spawn('node', [gameServerPath], {
        stdio: ['ignore', 'pipe', 'pipe'],
        cwd: path.dirname(gameServerPath)
      });

      // Monitorar output
      this.gameServerProcess.stdout.on('data', (data) => {
        logger.info('🌐 Game Server:', data.toString().trim());
      });

      this.gameServerProcess.stderr.on('data', (data) => {
        logger.error('🌐 Game Server Error:', data.toString().trim());
      });

      // Monitorar encerramento
      this.gameServerProcess.on('close', (code) => {
        logger.info(`🌐 Servidor de jogos encerrado com código: ${code}`);
        this.gameServerProcess = null;
      });

      this.gameServerProcess.on('error', (error) => {
        logger.error('❌ Erro no servidor de jogos:', error);
        this.gameServerProcess = null;
      });

      // Aguardar inicialização
      await this.waitForServerReady();
      logger.success(`✅ Servidor de jogos iniciado na porta ${this.gameServerPort}`);

    } catch (error) {
      logger.error('❌ Erro ao iniciar servidor de jogos:', error);
      throw error;
    }
  }

  /**
   * 🛑 Parar servidor de jogos
   */
  async stopGameServer() {
    try {
      if (!this.gameServerProcess) {
        return;
      }

      logger.info('🛑 Encerrando servidor de jogos...');
      
      // Enviar sinal de encerramento
      this.gameServerProcess.kill('SIGTERM');
      
      // Aguardar encerramento
      await new Promise((resolve) => {
        this.gameServerProcess.on('close', resolve);
        
        // Forçar encerramento após 5 segundos
        setTimeout(() => {
          if (this.gameServerProcess) {
            this.gameServerProcess.kill('SIGKILL');
          }
          resolve();
        }, 5000);
      });

      this.gameServerProcess = null;
      logger.success('✅ Servidor de jogos encerrado');

    } catch (error) {
      logger.error('❌ Erro ao encerrar servidor de jogos:', error);
    }
  }

  /**
   * ⏳ Aguardar servidor ficar pronto
   */
  async waitForServerReady(maxAttempts = 30, interval = 1000) {
    const http = await import('http');
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        await new Promise((resolve, reject) => {
          const req = http.request(`http://localhost:${this.gameServerPort}`, resolve);
          req.on('error', reject);
          req.end();
        });
        
        return true; // Servidor está pronto
      } catch (error) {
        if (attempt === maxAttempts) {
          throw new Error(`Servidor não ficou pronto após ${maxAttempts} tentativas`);
        }
        
        // Aguardar antes da próxima tentativa
        await new Promise(resolve => setTimeout(resolve, interval));
      }
    }
  }

  /**
   * 🌐 Obter URL do servidor de jogos
   */
  getGameServerUrl(gamePath = '') {
    return `http://localhost:${this.gameServerPort}${gamePath}`;
  }










}

// Criar instância singleton
export const gamingManager = new GamingManager();

export { GamingManager };