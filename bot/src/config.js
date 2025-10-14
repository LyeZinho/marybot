import { config } from 'dotenv';

// Carregar variáveis de ambiente
config();

// Configurações do bot
export const botConfig = {
  // Discord Configuration
  token: process.env.DISCORD_TOKEN,
  clientId: process.env.CLIENT_ID,
  guildId: process.env.GUILD_ID, // Para desenvolvimento (opcional)
  
  // WebSocket configuration
  backend: {
    url: process.env.BACKEND_SERVICE_URL || 'http://localhost:3002',
    serviceToken: process.env.SERVICE_TOKEN || 'bot-service-token',
    reconnectAttempts: 5,
    reconnectInterval: 5000
  },
  
  // API configuration (fallback)
  api: {
    url: process.env.API_SERVICE_URL || 'http://localhost:3001',
    timeout: 10000
  },
  
  // Feature flags
  features: {
    useWebSocket: process.env.USE_WEBSOCKET !== 'false', // Default to true
    enableFallback: process.env.ENABLE_FALLBACK !== 'false', // Default to true
    enableCache: process.env.ENABLE_CACHE === 'true' // Default to false
  },
  
  // Database Configuration (legacy - for fallback)
  databaseUrl: process.env.DATABASE_URL || 'postgresql://botuser:botpass@homelab.op:5400/marybot',
  
  // Bot Settings
  prefix: '!', // Para comandos legacy (opcional)
  embedColor: '#4ECDC4',
  errorColor: '#FF4444',
  successColor: '#00FF7F',
  warningColor: '#FFB347',
  
  // Economy Settings
  economy: {
    dailyBaseCoins: 50,
    dailyBaseXP: 25,
    dailyCooldown: 24 * 60 * 60 * 1000, // 24 horas em ms
    xpPerLevel: 100,
    maxStreak: 7,
    streakBonusMultiplier: 0.1, // 10% por dia de streak
    messageXpChance: 0.1, // 10% chance de ganhar XP por mensagem
    messageXpMin: 1,
    messageXpMax: 5
  },
  
  // Gacha Settings
  gacha: {
    singleCost: 50,
    multiCost: 450,
    multiCount: 10,
    rates: {
      5: 0.01, // 1%
      4: 0.05, // 5%
      3: 0.20, // 20%
      2: 0.30, // 30%
      1: 0.44  // 44%
    }
  },
  
  // Command Cooldowns (em segundos)
  cooldowns: {
    default: 3,
    daily: 86400, // 24 horas
    gacha: 5,
    profile: 10,
    leaderboard: 15,
    'anime-search': 5,
    waifu: 3,
    quote: 5
  },
  
  // API Settings
  apis: {
    anilist: {
      url: 'https://graphql.anilist.co',
      rateLimit: 90 // requests per minute
    },
    waifuPics: {
      url: 'https://api.waifu.pics',
      categories: ['waifu', 'neko', 'shinobu', 'megumin']
    }
  },
  
  // Levels and Ranks
  ranks: {
    1: { name: '🥉 Bronze Otaku', minLevel: 1 },
    2: { name: '🥈 Prata Otaku', minLevel: 10 },
    3: { name: '🥇 Ouro Otaku', minLevel: 20 },
    4: { name: '🏆 Platina Otaku', minLevel: 30 },
    5: { name: '💎 Diamante Otaku', minLevel: 50 }
  },
  
  // Easter Eggs
  easterEggs: {
    botMentionChance: 0.3,
    animeReactionChance: 0.1,
    waifuReactionChance: 0.2
  },
  
  // Development Settings
  development: {
    logLevel: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
    enableDevCommands: process.env.NODE_ENV !== 'production'
  }
};

// Validar configurações obrigatórias
export function validateConfig() {
  const required = ['token', 'clientId'];
  const missing = required.filter(key => !botConfig[key]);
  
  if (missing.length > 0) {
    throw new Error(`Configurações obrigatórias ausentes: ${missing.join(', ')}`);
  }
  
  console.log('✅ Bot configuration validated');
  console.log(`🔌 WebSocket mode: ${botConfig.features.useWebSocket ? 'Enabled' : 'Disabled'}`);
  console.log(`🔄 Fallback mode: ${botConfig.features.enableFallback ? 'Enabled' : 'Disabled'}`);
}

// Utilitário para obter rank baseado no nível
export function getRankByLevel(level) {
  const ranks = Object.values(botConfig.ranks);
  
  for (let i = ranks.length - 1; i >= 0; i--) {
    if (level >= ranks[i].minLevel) {
      return ranks[i];
    }
  }
  
  return ranks[0]; // Bronze por padrão
}

// Utilitário para calcular nível baseado no XP
export function getLevelFromXP(xp) {
  return Math.floor(xp / botConfig.economy.xpPerLevel) + 1;
}

// Utilitário para calcular XP necessário para o próximo nível
export function getXPForNextLevel(currentXP) {
  const currentLevel = getLevelFromXP(currentXP);
  const nextLevelXP = currentLevel * botConfig.economy.xpPerLevel;
  return nextLevelXP - currentXP;
}

export default botConfig;