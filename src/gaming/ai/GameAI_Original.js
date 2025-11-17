/**
 * 🤖 IA de Jogos
 * Sistema de aprendizado para jogos
 */

import { logger } from '../../utils/logger.js';
import fs from 'fs';
import path from 'path';

class GameAI {
  constructor() {
    this.models = new Map(); // gameId -> model data
    this.isReady = false;
    this.learningEnabled = true;
    
    // Diretório para armazenar dados de IA
    this.dataDir = path.join(process.cwd(), 'data', 'gaming', 'ai');
    this.ensureDataDirectory();

    // Configurações de aprendizado
    this.config = {
      minActionsForPrediction: 10,
      maxHistorySize: 10000,
      learningRate: 0.01,
      explorationRate: 0.1,
      decayRate: 0.995,
      saveInterval: 300000 // 5 minutos
    };

    this.setupAutoSave();
  }

  /**
   * Inicializar IA
   */
  async initialize() {
    try {
      logger.info('🤖 Inicializando IA de jogos...');

      // Carregar modelos existentes
      await this.loadExistingModels();

      this.isReady = true;
      logger.success('✅ IA de jogos inicializada');

    } catch (error) {
      logger.error('❌ Erro ao inicializar IA:', error);
      throw error;
    }
  }

  /**
   * Carregar modelo para um jogo específico
   */
  async loadGameModel(gameId) {
    if (this.models.has(gameId)) {
      return this.models.get(gameId);
    }

    const modelPath = path.join(this.dataDir, `${gameId}.json`);
    
    let modelData = {
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

    // Carregar dados existentes se disponível
    if (fs.existsSync(modelPath)) {
      try {
        const savedData = JSON.parse(fs.readFileSync(modelPath, 'utf8'));
        
        // Converter Maps serializadas de volta
        modelData = {
          ...savedData,
          actions: new Map(savedData.actions || []),
          stateActionValues: new Map(savedData.stateActionValues || []),
          createdAt: savedData.createdAt || Date.now(),
          lastUpdated: savedData.lastUpdated || Date.now()
        };

        logger.info(`🤖 Modelo carregado para ${gameId}: ${modelData.totalGames} jogos, ${modelData.totalActions} ações`);
        
      } catch (error) {
        logger.error(`❌ Erro ao carregar modelo para ${gameId}:`, error);
      }
    }

    this.models.set(gameId, modelData);
    return modelData;
  }

  /**
   * Treinar com base em ação executada
   */
  async trainFromAction(gameId, actionData) {
    if (!this.learningEnabled) return;

    try {
      const model = await this.loadGameModel(gameId);
      const { state, action, result, score } = actionData;

      // Criar chave única para o estado
      const stateKey = this.generateStateKey(state);
      const actionKey = `${stateKey}:${action}`;

      // Atualizar contadores de ações
      const actionCount = model.actions.get(actionKey) || 0;
      model.actions.set(actionKey, actionCount + 1);

      // Calcular valor da ação baseado no resultado
      const actionValue = this.calculateActionValue(result, score);
      
      // Atualizar valores estado-ação usando Q-learning
      const currentValue = model.stateActionValues.get(actionKey) || 0;
      const newValue = currentValue + this.config.learningRate * (actionValue - currentValue);
      model.stateActionValues.set(actionKey, newValue);

      // Atualizar estatísticas
      model.totalActions++;
      model.lastUpdated = Date.now();

      // Adicionar ao histórico de aprendizado
      model.learningHistory.push({
        timestamp: Date.now(),
        stateKey,
        action,
        result: result.success,
        score,
        actionValue,
        newValue
      });

      // Manter apenas últimos registros
      if (model.learningHistory.length > 1000) {
        model.learningHistory = model.learningHistory.slice(-1000);
      }

      // Detectar padrões
      this.detectPatterns(model, actionData);

    } catch (error) {
      logger.error(`❌ Erro no treinamento para ${gameId}:`, error);
    }
  }

  /**
   * Sugerir próxima ação
   */
  async suggestAction(gameId, currentState) {
    try {
      const model = await this.loadGameModel(gameId);
      
      if (model.totalActions < this.config.minActionsForPrediction) {
        return this.getRandomAction(gameId);
      }

      const stateKey = this.generateStateKey(currentState);
      
      // Obter todas as ações possíveis para este estado
      const possibleActions = this.getPossibleActionsForState(model, stateKey);
      
      if (possibleActions.length === 0) {
        return this.getRandomAction(gameId);
      }

      // Escolher ação usando epsilon-greedy
      const shouldExplore = Math.random() < this.config.explorationRate;
      
      if (shouldExplore) {
        // Explorar: escolher ação aleatória
        const randomAction = possibleActions[Math.floor(Math.random() * possibleActions.length)];
        return {
          action: randomAction.action,
          data: randomAction.data || {},
          confidence: 0.1,
          strategy: 'exploration'
        };
      } else {
        // Explotar: escolher melhor ação conhecida
        const bestAction = this.getBestAction(model, stateKey, possibleActions);
        return {
          action: bestAction.action,
          data: bestAction.data || {},
          confidence: bestAction.confidence,
          strategy: 'exploitation'
        };
      }

    } catch (error) {
      logger.error(`❌ Erro ao sugerir ação para ${gameId}:`, error);
      return this.getRandomAction(gameId);
    }
  }

  /**
   * Salvar sessão de jogo
   */
  async saveGameSession(gameId, sessionData) {
    try {
      const model = await this.loadGameModel(gameId);
      
      // Atualizar estatísticas do modelo
      model.totalGames++;
      
      // Atualizar pontuação média
      const totalScore = model.averageScore * (model.totalGames - 1) + sessionData.score;
      model.averageScore = totalScore / model.totalGames;
      
      // Atualizar melhor pontuação
      if (sessionData.score > model.bestScore) {
        model.bestScore = sessionData.score;
      }

      // Analisar sessão para aprendizado
      this.analyzeSession(model, sessionData);

      // Decair taxa de exploração
      this.config.explorationRate *= this.config.decayRate;
      this.config.explorationRate = Math.max(0.01, this.config.explorationRate);

      logger.info(`🤖 Sessão salva para ${gameId}: Score ${sessionData.score}, Média ${model.averageScore.toFixed(2)}`);

    } catch (error) {
      logger.error(`❌ Erro ao salvar sessão para ${gameId}:`, error);
    }
  }

  /**
   * Gerar chave única para estado
   */
  generateStateKey(state) {
    // Criar uma representação string do estado para usar como chave
    const relevantProps = Object.keys(state).sort();
    const stateString = relevantProps.map(key => `${key}:${state[key]}`).join('|');
    return Buffer.from(stateString).toString('base64').substring(0, 32);
  }

  /**
   * Calcular valor da ação
   */
  calculateActionValue(result, score) {
    let value = 0;
    
    // Valor baseado no sucesso da ação
    if (result.success) {
      value += 1;
    } else {
      value -= 0.5;
    }
    
    // Valor baseado na mudança de pontuação
    if (result.scoreChange) {
      value += result.scoreChange * 0.1;
    }
    
    // Valor baseado na pontuação total
    value += score * 0.001;
    
    return Math.max(-1, Math.min(1, value)); // Normalizar entre -1 e 1
  }

  /**
   * Obter ações possíveis para um estado
   */
  getPossibleActionsForState(model, stateKey) {
    const actions = [];
    
    for (const [actionKey, count] of model.actions) {
      if (actionKey.startsWith(stateKey + ':')) {
        const action = actionKey.substring(stateKey.length + 1);
        const value = model.stateActionValues.get(actionKey) || 0;
        
        actions.push({
          action,
          count,
          value,
          actionKey
        });
      }
    }
    
    return actions.sort((a, b) => b.value - a.value);
  }

  /**
   * Obter melhor ação
   */
  getBestAction(model, stateKey, possibleActions) {
    if (possibleActions.length === 0) {
      return { action: 'wait', confidence: 0.1 };
    }
    
    const bestAction = possibleActions[0];
    const confidence = Math.min(0.9, bestAction.count / 100); // Confidence baseada na experiência
    
    return {
      action: bestAction.action,
      confidence
    };
  }

  /**
   * Obter ação aleatória
   */
  getRandomAction(gameId) {
    const commonActions = ['up', 'down', 'left', 'right', 'click', 'wait', 'interact'];
    const randomAction = commonActions[Math.floor(Math.random() * commonActions.length)];
    
    return {
      action: randomAction,
      data: {},
      confidence: 0.1,
      strategy: 'random'
    };
  }

  /**
   * Detectar padrões
   */
  detectPatterns(model, actionData) {
    // Implementação simples de detecção de padrões
    const recentActions = model.learningHistory.slice(-10);
    
    if (recentActions.length >= 5) {
      const successfulActions = recentActions.filter(h => h.result).map(h => h.action);
      const failedActions = recentActions.filter(h => !h.result).map(h => h.action);
      
      // Detectar ações que levam ao sucesso
      const successPattern = this.findMostCommon(successfulActions);
      if (successPattern.count >= 3) {
        model.patterns.push({
          type: 'success_action',
          action: successPattern.item,
          confidence: successPattern.count / successfulActions.length,
          detectedAt: Date.now()
        });
      }
    }
  }

  /**
   * Analisar sessão
   */
  analyzeSession(model, sessionData) {
    // Analisar padrões na sessão
    const actions = sessionData.history?.map(h => h.action) || [];
    const scores = sessionData.history?.map(h => h.score) || [];
    
    if (actions.length > 0) {
      // Encontrar sequências que levaram a pontuação alta
      const goodSequences = this.findGoodSequences(sessionData.history);
      
      for (const sequence of goodSequences) {
        model.strategies.push({
          sequence: sequence.actions,
          avgScore: sequence.avgScore,
          confidence: sequence.frequency,
          discoveredAt: Date.now()
        });
      }
    }
    
    // Manter apenas melhores estratégias
    model.strategies = model.strategies
      .sort((a, b) => b.avgScore - a.avgScore)
      .slice(0, 50);
  }

  /**
   * Encontrar elemento mais comum
   */
  findMostCommon(arr) {
    const counts = {};
    let maxCount = 0;
    let mostCommon = null;
    
    for (const item of arr) {
      counts[item] = (counts[item] || 0) + 1;
      if (counts[item] > maxCount) {
        maxCount = counts[item];
        mostCommon = item;
      }
    }
    
    return { item: mostCommon, count: maxCount };
  }

  /**
   * Encontrar sequências boas
   */
  findGoodSequences(history) {
    const sequences = [];
    const sequenceLength = 3;
    
    for (let i = 0; i <= history.length - sequenceLength; i++) {
      const sequence = history.slice(i, i + sequenceLength);
      const actions = sequence.map(h => h.action);
      const scores = sequence.map(h => h.score);
      const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
      
      if (avgScore > 0) {
        sequences.push({
          actions,
          avgScore,
          frequency: 1
        });
      }
    }
    
    return sequences;
  }

  /**
   * Garantir diretório de dados
   */
  ensureDataDirectory() {
    if (!fs.existsSync(this.dataDir)) {
      fs.mkdirSync(this.dataDir, { recursive: true });
    }
  }

  /**
   * Carregar modelos existentes
   */
  async loadExistingModels() {
    try {
      const files = fs.readdirSync(this.dataDir).filter(f => f.endsWith('.json'));
      
      for (const file of files) {
        const gameId = file.replace('.json', '');
        await this.loadGameModel(gameId);
      }
      
      logger.info(`🤖 ${files.length} modelo(s) de IA carregado(s)`);
      
    } catch (error) {
      logger.warn('⚠️ Nenhum modelo existente encontrado');
    }
  }

  /**
   * Salvar todos os dados
   */
  async saveData() {
    try {
      for (const [gameId, model] of this.models) {
        const modelPath = path.join(this.dataDir, `${gameId}.json`);
        
        // Converter Maps para arrays para serialização
        const serializable = {
          ...model,
          actions: Array.from(model.actions.entries()),
          stateActionValues: Array.from(model.stateActionValues.entries())
        };
        
        fs.writeFileSync(modelPath, JSON.stringify(serializable, null, 2));
      }
      
      logger.info(`💾 ${this.models.size} modelo(s) salvos`);
      
    } catch (error) {
      logger.error('❌ Erro ao salvar dados da IA:', error);
    }
  }

  /**
   * Configurar salvamento automático
   */
  setupAutoSave() {
    setInterval(() => {
      if (this.isReady) {
        this.saveData().catch(error => {
          logger.error('Erro no salvamento automático:', error);
        });
      }
    }, this.config.saveInterval);
  }

  /**
   * Obter estatísticas da IA
   */
  getStats() {
    const stats = {
      isReady: this.isReady,
      totalModels: this.models.size,
      learningEnabled: this.learningEnabled,
      explorationRate: this.config.explorationRate,
      models: {}
    };
    
    for (const [gameId, model] of this.models) {
      stats.models[gameId] = {
        totalGames: model.totalGames,
        totalActions: model.totalActions,
        averageScore: model.averageScore,
        bestScore: model.bestScore,
        patterns: model.patterns.length,
        strategies: model.strategies.length
      };
    }
    
    return stats;
  }
}

export { GameAI };