/**
 * 🤖 IA de Jogos Avançada
 * Sistema expandido de aprendizado com experiências e estratégias
 */

import { logger } from '../../utils/logger.js';
import fs from 'fs';
import path from 'path';

class GameAI {
  constructor() {
    this.models = new Map(); // gameId -> model data
    this.experiences = new Map(); // Experiências detalhadas por jogo
    this.strategies = new Map(); // Estratégias desenvolvidas
    this.patterns = new Map(); // Padrões identificados
    this.gameHistory = new Map(); // Histórico completo de jogos
    this.playerAnalysis = new Map(); // Análise de comportamento de jogadores
    
    this.isReady = false;
    this.learningEnabled = true;
    
    // Diretórios para armazenar dados
    this.dataDir = path.join(process.cwd(), 'data', 'gaming', 'ai');
    this.experienceDir = path.join(this.dataDir, 'experiences');
    this.strategyDir = path.join(this.dataDir, 'strategies');
    this.patternDir = path.join(this.dataDir, 'patterns');
    
    this.ensureDirectories();

    // Configurações expandidas de aprendizado
    this.config = {
      minActionsForPrediction: 10,
      maxHistorySize: 10000,
      learningRate: 0.01,
      explorationRate: 0.1,
      decayRate: 0.995,
      adaptationRate: 0.05,
      patternThreshold: 5,
      experienceWindow: 100, // Janela de experiências recentes
      strategyCooldown: 10,  // Jogos antes de adaptar estratégia
      saveInterval: 300000   // 5 minutos
    };

    this.setupAutoSave();
  }

  /**
   * 📁 Garantir que diretórios existam
   */
  ensureDirectories() {
    const dirs = [this.dataDir, this.experienceDir, this.strategyDir, this.patternDir];
    dirs.forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    });
  }

  /**
   * 🚀 Inicializar IA
   */
  async initialize() {
    try {
      logger.info('🤖 Inicializando IA avançada de jogos...');

      // Carregar todos os dados salvos
      await this.loadExistingModels();
      await this.loadExperiences();
      await this.loadStrategies();
      await this.loadPatterns();
      await this.loadGameHistory();

      this.isReady = true;
      
      const totalExp = this.getTotalExperiences();
      const totalStrat = this.strategies.size;
      const totalPatt = this.getTotalPatterns();
      
      logger.success(`✅ IA inicializada - ${this.models.size} modelo(s), ${totalExp} experiência(s), ${totalStrat} estratégia(s), ${totalPatt} padrão(ões)`);

    } catch (error) {
      logger.error('❌ Erro ao inicializar IA:', error);
      throw error;
    }
  }

  /**
   * 📊 Carregar experiências salvas
   */
  async loadExperiences() {
    try {
      const files = fs.readdirSync(this.experienceDir);
      
      for (const file of files) {
        if (file.endsWith('.json')) {
          const gameId = file.replace('.json', '');
          const filePath = path.join(this.experienceDir, file);
          const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
          
          this.experiences.set(gameId, {
            moves: data.moves || [],
            outcomes: data.outcomes || [],
            patterns: data.patterns || [],
            adaptations: data.adaptations || [],
            playerBehavior: data.playerBehavior || [],
            contextualData: data.contextualData || {}
          });
        }
      }
      
      logger.info(`📊 Experiências de ${this.experiences.size} jogo(s) carregadas`);
    } catch (error) {
      logger.warn('⚠️ Erro ao carregar experiências:', error.message);
    }
  }

  /**
   * 🎯 Carregar estratégias salvas
   */
  async loadStrategies() {
    try {
      const files = fs.readdirSync(this.strategyDir);
      
      for (const file of files) {
        if (file.endsWith('.json')) {
          const gameId = file.replace('.json', '');
          const filePath = path.join(this.strategyDir, file);
          const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
          
          this.strategies.set(gameId, {
            primary: data.primary || 'balanced',
            alternatives: data.alternatives || [],
            effectiveness: data.effectiveness || {},
            adaptations: data.adaptations || [],
            winConditions: data.winConditions || [],
            defensePatterns: data.defensePatterns || [],
            offensePatterns: data.offensePatterns || [],
            contextualStrategies: data.contextualStrategies || {},
            lastUpdated: data.lastUpdated || Date.now()
          });
        }
      }
      
      logger.info(`🎯 Estratégias de ${this.strategies.size} jogo(s) carregadas`);
    } catch (error) {
      logger.warn('⚠️ Erro ao carregar estratégias:', error.message);
    }
  }

  /**
   * 🧩 Carregar padrões identificados
   */
  async loadPatterns() {
    try {
      const files = fs.readdirSync(this.patternDir);
      
      for (const file of files) {
        if (file.endsWith('.json')) {
          const gameId = file.replace('.json', '');
          const filePath = path.join(this.patternDir, file);
          const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
          
          this.patterns.set(gameId, {
            winningSequences: data.winningSequences || [],
            losingSequences: data.losingSequences || [],
            opponentPatterns: data.opponentPatterns || [],
            situationalPatterns: data.situationalPatterns || [],
            emergentBehaviors: data.emergentBehaviors || [],
            confidence: data.confidence || {}
          });
        }
      }
      
      logger.info(`🧩 Padrões de ${this.patterns.size} jogo(s) carregados`);
    } catch (error) {
      logger.warn('⚠️ Erro ao carregar padrões:', error.message);
    }
  }

  /**
   * 📈 Carregar histórico de jogos
   */
  async loadGameHistory() {
    try {
      const historyFile = path.join(this.dataDir, 'game_history.json');
      if (fs.existsSync(historyFile)) {
        const data = JSON.parse(fs.readFileSync(historyFile, 'utf8'));
        this.gameHistory = new Map(Object.entries(data));
        logger.info(`📈 Histórico de ${this.gameHistory.size} jogo(s) carregado`);
      }
    } catch (error) {
      logger.warn('⚠️ Erro ao carregar histórico:', error.message);
    }
  }

  /**
   * 🎓 Registrar experiência detalhada
   */
  async recordExperience(gameId, experienceData) {
    try {
      if (!this.experiences.has(gameId)) {
        this.experiences.set(gameId, {
          moves: [],
          outcomes: [],
          patterns: [],
          adaptations: [],
          playerBehavior: [],
          contextualData: {}
        });
      }

      const gameExp = this.experiences.get(gameId);
      
      // Registrar movimento com contexto completo
      const move = {
        timestamp: Date.now(),
        gameState: experienceData.state,
        action: experienceData.action,
        expectedOutcome: experienceData.expectedOutcome,
        actualOutcome: experienceData.actualOutcome,
        context: experienceData.context || {},
        playerMove: experienceData.playerMove,
        difficulty: experienceData.difficulty || 'medium',
        strategyUsed: experienceData.strategy,
        confidence: experienceData.confidence || 0.5
      };

      gameExp.moves.push(move);

      // Manter janela de experiências
      if (gameExp.moves.length > this.config.experienceWindow) {
        gameExp.moves = gameExp.moves.slice(-this.config.experienceWindow);
      }

      // Analisar padrões emergentes
      this.analyzeEmergentPatterns(gameId, move);

      // Adaptar estratégia se necessário
      this.considerStrategyAdaptation(gameId, move);

      logger.debug(`🎓 Experiência registrada para ${gameId}: ${experienceData.action}`);

    } catch (error) {
      logger.error(`❌ Erro ao registrar experiência para ${gameId}:`, error);
    }
  }

  /**
   * 🧠 Sugerir ação baseada em experiências
   */
  async suggestActionWithExperience(gameId, currentState) {
    try {
      const model = await this.loadGameModel(gameId);
      const strategy = this.strategies.get(gameId);
      const patterns = this.patterns.get(gameId);
      const experiences = this.experiences.get(gameId);

      // Análise contextual do estado atual
      const context = this.analyzeGameContext(gameId, currentState);
      
      // Buscar experiências similares
      const similarExperiences = this.findSimilarExperiences(gameId, currentState);
      
      // Aplicar estratégia adaptativa
      const strategicAction = this.applyStrategy(gameId, currentState, context);
      
      // Verificar padrões conhecidos
      const patternAction = this.checkPatterns(gameId, currentState, patterns);
      
      // Combinar todas as fontes de conhecimento
      const finalAction = this.combineKnowledgeSources({
        strategic: strategicAction,
        pattern: patternAction,
        experience: similarExperiences,
        exploration: this.getExploratoryAction(gameId, currentState)
      });

      // Registrar predição para aprendizado futuro
      this.recordPrediction(gameId, currentState, finalAction);

      return finalAction;

    } catch (error) {
      logger.error(`❌ Erro ao sugerir ação com experiência para ${gameId}:`, error);
      return this.getRandomAction(gameId);
    }
  }

  /**
   * 🔍 Analisar contexto do jogo
   */
  analyzeGameContext(gameId, state) {
    return {
      gamePhase: this.identifyGamePhase(gameId, state),
      pressure: this.calculatePressure(state),
      opportunities: this.identifyOpportunities(state),
      threats: this.identifyThreats(state),
      playerPattern: this.analyzePlayerPattern(gameId, state),
      strategicValue: this.calculateStrategicValue(state)
    };
  }

  /**
   * 🎯 Aplicar estratégia adaptativa
   */
  applyStrategy(gameId, state, context) {
    const strategy = this.strategies.get(gameId);
    
    if (!strategy) {
      return this.getRandomAction(gameId);
    }

    // Selecionar estratégia baseada no contexto
    let chosenStrategy = strategy.primary;
    
    // Adaptar baseado na fase do jogo
    if (context.gamePhase === 'opening') {
      chosenStrategy = strategy.contextualStrategies.opening || strategy.primary;
    } else if (context.gamePhase === 'endgame') {
      chosenStrategy = strategy.contextualStrategies.endgame || strategy.primary;
    }

    // Adaptar baseado na pressão
    if (context.pressure > 0.7) {
      chosenStrategy = strategy.contextualStrategies.highPressure || chosenStrategy;
    }

    return this.executeStrategy(gameId, state, chosenStrategy, context);
  }

  /**
   * 🧩 Verificar padrões conhecidos
   */
  checkPatterns(gameId, state, patterns) {
    if (!patterns) return null;

    // Verificar padrões de vitória
    for (const winPattern of patterns.winningSequences) {
      if (this.matchesPattern(state, winPattern)) {
        return {
          action: winPattern.nextMove,
          confidence: winPattern.confidence || 0.8,
          source: 'winning_pattern'
        };
      }
    }

    // Verificar padrões de defesa
    for (const defensePattern of patterns.situationalPatterns) {
      if (this.matchesPattern(state, defensePattern)) {
        return {
          action: defensePattern.response,
          confidence: defensePattern.confidence || 0.7,
          source: 'defense_pattern'
        };
      }
    }

    return null;
  }

  /**
   * 🔗 Combinar fontes de conhecimento
   */
  combineKnowledgeSources(sources) {
    const candidates = [];

    // Adicionar candidatos de cada fonte
    if (sources.strategic) {
      candidates.push({ ...sources.strategic, weight: 0.4 });
    }
    
    if (sources.pattern) {
      candidates.push({ ...sources.pattern, weight: 0.3 });
    }
    
    if (sources.experience && sources.experience.length > 0) {
      const bestExp = sources.experience[0];
      candidates.push({ 
        action: bestExp.action, 
        confidence: bestExp.confidence,
        weight: 0.25,
        source: 'experience'
      });
    }
    
    if (sources.exploration) {
      candidates.push({ ...sources.exploration, weight: 0.05 });
    }

    // Selecionar melhor candidato baseado em peso e confiança
    if (candidates.length === 0) {
      return this.getRandomAction();
    }

    const bestCandidate = candidates.reduce((best, current) => {
      const currentScore = (current.confidence || 0.5) * current.weight;
      const bestScore = (best.confidence || 0.5) * best.weight;
      return currentScore > bestScore ? current : best;
    });

    return {
      action: bestCandidate.action,
      confidence: bestCandidate.confidence,
      source: bestCandidate.source,
      strategy: 'combined_knowledge'
    };
  }

  /**
   * 💾 Salvar todas as experiências
   */
  async saveAllData() {
    try {
      // Salvar modelos
      for (const [gameId, model] of this.models) {
        const modelPath = path.join(this.dataDir, `model_${gameId}.json`);
        const modelData = {
          ...model,
          actions: Array.from(model.actions.entries()),
          stateActionValues: Array.from(model.stateActionValues.entries())
        };
        fs.writeFileSync(modelPath, JSON.stringify(modelData, null, 2));
      }

      // Salvar experiências
      for (const [gameId, exp] of this.experiences) {
        const expPath = path.join(this.experienceDir, `${gameId}.json`);
        fs.writeFileSync(expPath, JSON.stringify(exp, null, 2));
      }

      // Salvar estratégias
      for (const [gameId, strategy] of this.strategies) {
        const stratPath = path.join(this.strategyDir, `${gameId}.json`);
        fs.writeFileSync(stratPath, JSON.stringify(strategy, null, 2));
      }

      // Salvar padrões
      for (const [gameId, patterns] of this.patterns) {
        const patternPath = path.join(this.patternDir, `${gameId}.json`);
        fs.writeFileSync(patternPath, JSON.stringify(patterns, null, 2));
      }

      // Salvar histórico
      const historyPath = path.join(this.dataDir, 'game_history.json');
      const historyData = Object.fromEntries(this.gameHistory);
      fs.writeFileSync(historyPath, JSON.stringify(historyData, null, 2));

      logger.success('💾 Todos os dados da IA salvos com sucesso');

    } catch (error) {
      logger.error('❌ Erro ao salvar dados da IA:', error);
    }
  }

  /**
   * 📊 Obter estatísticas avançadas
   */
  async getStatistics() {
    return {
      models: Object.fromEntries(
        Array.from(this.models.entries()).map(([gameId, model]) => [
          gameId, {
            totalGames: model.totalGames || 0,
            totalActions: model.totalActions || 0,
            averageScore: model.averageScore || 0,
            bestScore: model.bestScore || 0,
            lastUpdated: model.lastUpdated
          }
        ])
      ),
      experiences: this.getTotalExperiences(),
      strategies: this.strategies.size,
      patterns: this.getTotalPatterns(),
      gameHistory: this.gameHistory.size,
      learningRate: this.config.learningRate,
      explorationRate: this.config.explorationRate
    };
  }

  /**
   * 📈 Helpers para estatísticas
   */
  getTotalExperiences() {
    return Array.from(this.experiences.values())
      .reduce((total, exp) => total + (exp.moves?.length || 0), 0);
  }

  getTotalPatterns() {
    return Array.from(this.patterns.values())
      .reduce((total, patterns) => 
        total + (patterns.winningSequences?.length || 0) +
                (patterns.situationalPatterns?.length || 0), 0);
  }

  // Métodos auxiliares simplificados (implementação básica)
  identifyGamePhase(gameId, state) { return 'middle'; }
  calculatePressure(state) { return 0.5; }
  identifyOpportunities(state) { return []; }
  identifyThreats(state) { return []; }
  analyzePlayerPattern(gameId, state) { return {}; }
  calculateStrategicValue(state) { return 0.5; }
  executeStrategy(gameId, state, strategy, context) { 
    return { action: 'default', confidence: 0.5, source: 'strategy' }; 
  }
  matchesPattern(state, pattern) { return false; }
  getExploratoryAction(gameId, state) { 
    return { action: 'explore', confidence: 0.1, source: 'exploration' }; 
  }
  getRandomAction(gameId) { 
    return { action: 'random', confidence: 0.1, source: 'random' }; 
  }
  findSimilarExperiences(gameId, state) { return []; }
  analyzeEmergentPatterns(gameId, move) {}
  considerStrategyAdaptation(gameId, move) {}
  recordPrediction(gameId, state, action) {}

  // Manter compatibilidade com métodos existentes
  async loadExistingModels() { await this.loadModels(); }
  async loadModels() {
    // Implementação do método original mantida para compatibilidade
  }

  setupAutoSave() {
    setInterval(() => {
      this.saveAllData().catch(error => 
        logger.error('❌ Erro no auto-save:', error)
      );
    }, this.config.saveInterval);
  }

  async loadGameModel(gameId) {
    if (this.models.has(gameId)) {
      return this.models.get(gameId);
    }

    const modelData = {
      gameId,
      actions: new Map(),
      stateActionValues: new Map(),
      totalGames: 0,
      totalActions: 0,
      averageScore: 0,
      bestScore: 0,
      learningHistory: [],
      strategies: [],
      patterns: [],
      createdAt: Date.now(),
      lastUpdated: Date.now()
    };

    this.models.set(gameId, modelData);
    return modelData;
  }
}

export { GameAI };