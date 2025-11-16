/**
 * 📊 Sistema de Estatísticas de IA
 * Monitora performance e uso da IA do bot
 */

class AIStatsManager {
  constructor() {
    this.stats = new Map(); // guildId -> stats
    this.globalStats = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageResponseTime: 0,
      totalResponseTime: 0,
      lastReset: new Date()
    };
  }

  /**
   * Registrar uso da IA
   */
  recordAIUsage(guildId, data) {
    const guildStats = this.getGuildStats(guildId);
    
    // Atualizar estatísticas do servidor
    guildStats.totalRequests++;
    
    if (data.success) {
      guildStats.successfulRequests++;
      guildStats.totalResponseTime += data.responseTime || 0;
      guildStats.averageResponseTime = guildStats.totalResponseTime / guildStats.successfulRequests;
      
      // Registrar tipo de pergunta
      if (data.questionType) {
        guildStats.questionTypes[data.questionType] = (guildStats.questionTypes[data.questionType] || 0) + 1;
      }
      
      // Registrar uso de contexto
      if (data.contextUsed) {
        guildStats.contextUsageCount++;
      }
    } else {
      guildStats.failedRequests++;
    }
    
    guildStats.lastUsed = new Date();
    
    // Atualizar estatísticas globais
    this.updateGlobalStats(data);
  }

  /**
   * Obter estatísticas do servidor
   */
  getGuildStats(guildId) {
    if (!this.stats.has(guildId)) {
      this.stats.set(guildId, {
        totalRequests: 0,
        successfulRequests: 0,
        failedRequests: 0,
        averageResponseTime: 0,
        totalResponseTime: 0,
        contextUsageCount: 0,
        questionTypes: {},
        firstUsed: new Date(),
        lastUsed: new Date()
      });
    }
    
    return this.stats.get(guildId);
  }

  /**
   * Atualizar estatísticas globais
   */
  updateGlobalStats(data) {
    this.globalStats.totalRequests++;
    
    if (data.success) {
      this.globalStats.successfulRequests++;
      this.globalStats.totalResponseTime += data.responseTime || 0;
      this.globalStats.averageResponseTime = 
        this.globalStats.totalResponseTime / this.globalStats.successfulRequests;
    } else {
      this.globalStats.failedRequests++;
    }
  }

  /**
   * Obter resumo das estatísticas
   */
  getStatsSummary(guildId = null) {
    if (guildId) {
      const stats = this.getGuildStats(guildId);
      const successRate = stats.totalRequests > 0 ? 
        (stats.successfulRequests / stats.totalRequests * 100).toFixed(1) : 0;
      
      return {
        ...stats,
        successRate: successRate,
        contextUsageRate: stats.successfulRequests > 0 ? 
          (stats.contextUsageCount / stats.successfulRequests * 100).toFixed(1) : 0
      };
    } else {
      const successRate = this.globalStats.totalRequests > 0 ? 
        (this.globalStats.successfulRequests / this.globalStats.totalRequests * 100).toFixed(1) : 0;
      
      return {
        ...this.globalStats,
        successRate: successRate
      };
    }
  }

  /**
   * Resetar estatísticas
   */
  resetStats(guildId = null) {
    if (guildId) {
      this.stats.delete(guildId);
    } else {
      this.stats.clear();
      this.globalStats = {
        totalRequests: 0,
        successfulRequests: 0,
        failedRequests: 0,
        averageResponseTime: 0,
        totalResponseTime: 0,
        lastReset: new Date()
      };
    }
  }

  /**
   * Obter top tipos de pergunta
   */
  getTopQuestionTypes(guildId, limit = 5) {
    const stats = this.getGuildStats(guildId);
    return Object.entries(stats.questionTypes)
      .sort(([,a], [,b]) => b - a)
      .slice(0, limit)
      .map(([type, count]) => ({ type, count }));
  }
}

// Instância singleton
export const aiStatsManager = new AIStatsManager();

export default AIStatsManager;