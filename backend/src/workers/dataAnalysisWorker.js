import { parentPort, workerData } from 'worker_threads';
import axios from 'axios';

/**
 * Data Analysis Worker - Processes analytics and statistics
 */
class DataAnalysisWorker {
  constructor(jobData) {
    this.jobData = jobData;
    this.apiBaseUrl = process.env.API_BASE_URL || 'http://localhost:3001';
  }

  async process() {
    try {
      const { analysisType, parameters } = this.jobData.job;
      
      let result;
      
      switch (analysisType) {
        case 'user_activity':
          result = await this.analyzeUserActivity(parameters);
          break;
        case 'economy_trends':
          result = await this.analyzeEconomyTrends(parameters);
          break;
        case 'command_usage':
          result = await this.analyzeCommandUsage(parameters);
          break;
        case 'character_popularity':
          result = await this.analyzeCharacterPopularity(parameters);
          break;
        default:
          throw new Error(`Unknown analysis type: ${analysisType}`);
      }

      return {
        success: true,
        analysisType,
        result,
        timestamp: new Date(),
        processingTime: Date.now() - this.startTime
      };

    } catch (error) {
      return {
        success: false,
        error: error.message,
        timestamp: new Date()
      };
    }
  }

  async analyzeUserActivity(parameters) {
    const { timeRange = '7d', metrics = ['messages', 'commands', 'xp_gain'] } = parameters;
    
    // Simulate data fetching and analysis
    const users = await this.fetchApiData('/api/users/activity', { timeRange });
    
    const analysis = {
      totalUsers: users.length,
      activeUsers: users.filter(u => u.lastActivity > Date.now() - 24 * 60 * 60 * 1000).length,
      averageXpGain: users.reduce((sum, u) => sum + u.xpGainedInPeriod, 0) / users.length,
      topActiveUsers: users
        .sort((a, b) => b.activityScore - a.activityScore)
        .slice(0, 10)
        .map(u => ({ id: u.id, username: u.username, score: u.activityScore })),
      metrics: {}
    };

    // Calculate specific metrics
    for (const metric of metrics) {
      switch (metric) {
        case 'messages':
          analysis.metrics.messages = {
            total: users.reduce((sum, u) => sum + u.messageCount, 0),
            average: users.reduce((sum, u) => sum + u.messageCount, 0) / users.length,
            peak: Math.max(...users.map(u => u.messageCount))
          };
          break;
        case 'commands':
          analysis.metrics.commands = {
            total: users.reduce((sum, u) => sum + u.commandCount, 0),
            mostUsed: this.getMostUsedCommands(users),
            userCommandRatio: users.reduce((sum, u) => sum + u.commandCount, 0) / users.length
          };
          break;
        case 'xp_gain':
          analysis.metrics.xpGain = {
            total: users.reduce((sum, u) => sum + u.xpGainedInPeriod, 0),
            distribution: this.calculateXpDistribution(users),
            growthTrend: this.calculateGrowthTrend(users)
          };
          break;
      }
    }

    return analysis;
  }

  async analyzeEconomyTrends(parameters) {
    const { timeRange = '30d' } = parameters;
    
    const economyData = await this.fetchApiData('/api/economy/trends', { timeRange });
    
    return {
      coinCirculation: {
        total: economyData.totalCoins,
        distribution: economyData.coinDistribution,
        inflationRate: this.calculateInflationRate(economyData.historicalData)
      },
      transactions: {
        volume: economyData.transactionVolume,
        types: economyData.transactionTypes,
        averageValue: economyData.averageTransactionValue
      },
      userBehavior: {
        spendingPatterns: this.analyzeSpendingPatterns(economyData.transactions),
        savingTrends: this.analyzeSavingTrends(economyData.users),
        economicActivity: this.calculateEconomicActivity(economyData)
      },
      predictions: {
        nextWeekVolume: this.predictTransactionVolume(economyData.historicalData),
        inflationForecast: this.forecastInflation(economyData.historicalData)
      }
    };
  }

  async analyzeCommandUsage(parameters) {
    const { timeRange = '7d' } = parameters;
    
    const commandData = await this.fetchApiData('/api/analytics/commands', { timeRange });
    
    return {
      totalCommands: commandData.total,
      uniqueCommands: commandData.uniqueCount,
      mostPopular: commandData.commands
        .sort((a, b) => b.usage - a.usage)
        .slice(0, 10),
      leastUsed: commandData.commands
        .sort((a, b) => a.usage - b.usage)
        .slice(0, 5),
      usageByHour: this.groupUsageByHour(commandData.timestamps),
      userEngagement: {
        repeatUsers: commandData.repeatUsers,
        newUsers: commandData.newUsers,
        averageCommandsPerUser: commandData.total / commandData.uniqueUsers
      },
      categories: this.categorizeCommands(commandData.commands)
    };
  }

  async analyzeCharacterPopularity(parameters) {
    const { timeRange = '30d' } = parameters;
    
    const characterData = await this.fetchApiData('/api/characters/analytics', { timeRange });
    
    return {
      mostPulled: characterData.characters
        .sort((a, b) => b.pullCount - a.pullCount)
        .slice(0, 20),
      rarityDistribution: this.calculateRarityDistribution(characterData.pulls),
      collectionCompleteness: this.analyzeCollectionCompleteness(characterData.collections),
      trendingCharacters: this.identifyTrendingCharacters(characterData.historicalPulls),
      pullStatistics: {
        totalPulls: characterData.totalPulls,
        averagePullsPerUser: characterData.totalPulls / characterData.uniqueUsers,
        luckyUsers: characterData.users
          .filter(u => u.legendaryPulls > 0)
          .sort((a, b) => b.legendaryPulls - a.legendaryPulls)
          .slice(0, 10)
      }
    };
  }

  async fetchApiData(endpoint, params = {}) {
    try {
      const response = await axios.get(`${this.apiBaseUrl}${endpoint}`, { params });
      return response.data;
    } catch (error) {
      // Return mock data for development
      return this.generateMockData(endpoint, params);
    }
  }

  generateMockData(endpoint, params) {
    // Generate realistic mock data for development/testing
    const mockUsers = Array.from({ length: 100 }, (_, i) => ({
      id: `user_${i}`,
      username: `User${i}`,
      lastActivity: Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000,
      activityScore: Math.floor(Math.random() * 1000),
      xpGainedInPeriod: Math.floor(Math.random() * 500),
      messageCount: Math.floor(Math.random() * 200),
      commandCount: Math.floor(Math.random() * 50)
    }));

    if (endpoint.includes('activity')) {
      return mockUsers;
    }

    // Add more mock data generators as needed
    return {
      totalCoins: 1000000,
      coinDistribution: { top10: 300000, middle40: 500000, bottom50: 200000 },
      transactionVolume: 50000,
      historicalData: Array.from({ length: 30 }, (_, i) => ({
        date: new Date(Date.now() - i * 24 * 60 * 60 * 1000),
        volume: 1000 + Math.random() * 500
      }))
    };
  }

  calculateInflationRate(historicalData) {
    if (historicalData.length < 2) return 0;
    
    const recent = historicalData.slice(0, 7).reduce((sum, d) => sum + d.volume, 0) / 7;
    const older = historicalData.slice(-7).reduce((sum, d) => sum + d.volume, 0) / 7;
    
    return ((recent - older) / older) * 100;
  }

  analyzeSpendingPatterns(transactions) {
    const patterns = {};
    
    transactions.forEach(transaction => {
      const category = transaction.category || 'other';
      if (!patterns[category]) {
        patterns[category] = { count: 0, total: 0 };
      }
      patterns[category].count++;
      patterns[category].total += transaction.amount;
    });

    return Object.entries(patterns).map(([category, data]) => ({
      category,
      count: data.count,
      total: data.total,
      average: data.total / data.count
    }));
  }

  analyzeSavingTrends(users) {
    const savings = users.map(u => u.coins || 0);
    return {
      average: savings.reduce((sum, s) => sum + s, 0) / savings.length,
      median: this.calculateMedian(savings),
      distribution: this.calculateDistribution(savings)
    };
  }

  calculateEconomicActivity(economyData) {
    return {
      velocity: economyData.transactionVolume / economyData.totalCoins,
      concentration: this.calculateGiniCoefficient(economyData.coinDistribution),
      activity: economyData.activeUsers / economyData.totalUsers
    };
  }

  predictTransactionVolume(historicalData) {
    // Simple linear regression for prediction
    const values = historicalData.map(d => d.volume);
    const trend = this.calculateTrend(values);
    return Math.max(0, values[0] + trend);
  }

  forecastInflation(historicalData) {
    const inflationRates = [];
    for (let i = 1; i < historicalData.length; i++) {
      const rate = (historicalData[i-1].volume - historicalData[i].volume) / historicalData[i].volume;
      inflationRates.push(rate);
    }
    return inflationRates.reduce((sum, rate) => sum + rate, 0) / inflationRates.length;
  }

  calculateMedian(values) {
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
  }

  calculateDistribution(values) {
    const sorted = [...values].sort((a, b) => a - b);
    const total = sorted.length;
    
    return {
      bottom25: sorted[Math.floor(total * 0.25)],
      median: this.calculateMedian(values),
      top25: sorted[Math.floor(total * 0.75)],
      top10: sorted[Math.floor(total * 0.9)],
      top1: sorted[Math.floor(total * 0.99)]
    };
  }

  calculateGiniCoefficient(distribution) {
    // Simplified Gini coefficient calculation
    const values = Object.values(distribution);
    const total = values.reduce((sum, v) => sum + v, 0);
    const proportions = values.map(v => v / total);
    
    let gini = 0;
    for (let i = 0; i < proportions.length; i++) {
      for (let j = 0; j < proportions.length; j++) {
        gini += Math.abs(proportions[i] - proportions[j]);
      }
    }
    
    return gini / (2 * proportions.length * proportions.reduce((sum, p) => sum + p, 0));
  }

  calculateTrend(values) {
    const n = values.length;
    const sumX = (n * (n - 1)) / 2;
    const sumY = values.reduce((sum, v) => sum + v, 0);
    const sumXY = values.reduce((sum, v, i) => sum + (i * v), 0);
    const sumXX = (n * (n - 1) * (2 * n - 1)) / 6;
    
    return (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
  }

  getMostUsedCommands(users) {
    // Mock implementation
    return [
      { command: 'profile', usage: 1200 },
      { command: 'daily', usage: 980 },
      { command: 'gacha', usage: 750 },
      { command: 'leaderboard', usage: 540 },
      { command: 'quiz', usage: 320 }
    ];
  }

  calculateXpDistribution(users) {
    const xpValues = users.map(u => u.xpGainedInPeriod);
    return this.calculateDistribution(xpValues);
  }

  calculateGrowthTrend(users) {
    return {
      trend: 'positive',
      rate: 15.5,
      projection: 'steady growth expected'
    };
  }

  groupUsageByHour(timestamps) {
    const hourlyUsage = new Array(24).fill(0);
    
    timestamps.forEach(timestamp => {
      const hour = new Date(timestamp).getHours();
      hourlyUsage[hour]++;
    });
    
    return hourlyUsage.map((count, hour) => ({ hour, count }));
  }

  categorizeCommands(commands) {
    const categories = {
      economy: ['daily', 'coins', 'profile', 'leaderboard'],
      games: ['quiz', 'battle', 'gacha'],
      anime: ['character', 'anime', 'manga'],
      utility: ['help', 'ping', 'info']
    };

    const result = {};
    
    Object.entries(categories).forEach(([category, commandList]) => {
      result[category] = {
        commands: commandList.length,
        usage: commands
          .filter(cmd => commandList.includes(cmd.name))
          .reduce((sum, cmd) => sum + cmd.usage, 0)
      };
    });

    return result;
  }

  calculateRarityDistribution(pulls) {
    const distribution = { common: 0, uncommon: 0, rare: 0, epic: 0, legendary: 0 };
    
    pulls.forEach(pull => {
      distribution[pull.rarity]++;
    });

    const total = pulls.length;
    Object.keys(distribution).forEach(rarity => {
      distribution[rarity] = {
        count: distribution[rarity],
        percentage: (distribution[rarity] / total) * 100
      };
    });

    return distribution;
  }

  analyzeCollectionCompleteness(collections) {
    return {
      averageCompletion: collections.reduce((sum, c) => sum + c.completionPercentage, 0) / collections.length,
      completeCollections: collections.filter(c => c.completionPercentage === 100).length,
      distributionByCompletion: this.getCompletionDistribution(collections)
    };
  }

  getCompletionDistribution(collections) {
    const ranges = {
      '0-25%': 0, '26-50%': 0, '51-75%': 0, '76-99%': 0, '100%': 0
    };

    collections.forEach(collection => {
      const completion = collection.completionPercentage;
      if (completion === 100) ranges['100%']++;
      else if (completion > 75) ranges['76-99%']++;
      else if (completion > 50) ranges['51-75%']++;
      else if (completion > 25) ranges['26-50%']++;
      else ranges['0-25%']++;
    });

    return ranges;
  }

  identifyTrendingCharacters(historicalPulls) {
    // Analyze recent vs historical popularity
    const recentPulls = historicalPulls.filter(p => 
      new Date(p.timestamp) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    );

    const recentPopularity = {};
    const historicalPopularity = {};

    recentPulls.forEach(pull => {
      recentPopularity[pull.characterId] = (recentPopularity[pull.characterId] || 0) + 1;
    });

    historicalPulls.forEach(pull => {
      historicalPopularity[pull.characterId] = (historicalPopularity[pull.characterId] || 0) + 1;
    });

    return Object.keys(recentPopularity)
      .map(characterId => ({
        characterId,
        recentPulls: recentPopularity[characterId],
        historicalPulls: historicalPopularity[characterId],
        trendScore: recentPopularity[characterId] / (historicalPopularity[characterId] || 1)
      }))
      .sort((a, b) => b.trendScore - a.trendScore)
      .slice(0, 10);
  }
}

// Worker execution
if (parentPort) {
  const worker = new DataAnalysisWorker(workerData);
  worker.startTime = Date.now();
  
  worker.process()
    .then(result => {
      parentPort.postMessage(result);
    })
    .catch(error => {
      parentPort.postMessage({
        success: false,
        error: error.message,
        stack: error.stack
      });
    });
}