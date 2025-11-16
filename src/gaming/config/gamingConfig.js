/**
 * ⚙️ Configuração do Sistema de Gaming
 */

export const gamingConfig = {
  // Configurações gerais
  enabled: true,
  maxConcurrentSessions: 5,
  maxSessionsPerUser: 1,
  sessionTimeout: 1800000, // 30 minutos
  cleanupInterval: 300000, // 5 minutos

  // Configurações da IA
  ai: {
    enabled: true,
    learningEnabled: true,
    minActionsForPrediction: 10,
    maxHistorySize: 10000,
    learningRate: 0.01,
    explorationRate: 0.1,
    decayRate: 0.995,
    saveInterval: 300000 // 5 minutos
  },

  // Configurações do Browser Engine
  browser: {
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--no-first-run',
      '--disable-extensions',
      '--disable-plugins',
      '--disable-images', // Para economizar recursos
      '--disable-javascript', // Para alguns jogos simples
    ],
    defaultViewport: {
      width: 1280,
      height: 720
    },
    timeout: 30000
  },

  // Jogos disponíveis
  availableGames: {
    'browser_example': {
      type: 'browser',
      name: 'Exemplo Browser',
      description: 'Jogo de exemplo para demonstrar automação de browser',
      defaultUrl: 'https://example.com/game',
      config: {
        maxPlayers: 1,
        timeLimit: 300000, // 5 minutos
        scoreLimit: null
      }
    },
    
    '2048': {
      type: 'browser',
      name: '2048',
      description: 'Clássico jogo de quebra-cabeça numérico',
      defaultUrl: 'https://play2048.co/',
      config: {
        maxPlayers: 1,
        timeLimit: 600000, // 10 minutos
        scoreLimit: 2048
      }
    },
    
    'snake': {
      type: 'browser',
      name: 'Snake',
      description: 'Clássico jogo da cobrinha',
      defaultUrl: 'https://www.google.com/fbx?fbx=snake_arcade',
      config: {
        maxPlayers: 1,
        timeLimit: 300000, // 5 minutos
        scoreLimit: null
      }
    },
    
    'tetris': {
      type: 'browser',
      name: 'Tetris',
      description: 'Clássico jogo de blocos Tetris',
      defaultUrl: 'https://tetris.com/play-tetris',
      config: {
        maxPlayers: 1,
        timeLimit: 600000, // 10 minutos
        scoreLimit: null
      }
    },
    
    'pacman': {
      type: 'browser',
      name: 'Pac-Man',
      description: 'Clássico jogo Pac-Man',
      defaultUrl: 'https://www.google.com/fbx?fbx=pac_man',
      config: {
        maxPlayers: 1,
        timeLimit: 900000, // 15 minutos
        scoreLimit: null
      }
    }
  },

  // Ações comuns disponíveis
  commonActions: {
    // Ações de navegação
    'up': { type: 'key', key: 'ArrowUp' },
    'down': { type: 'key', key: 'ArrowDown' },
    'left': { type: 'key', key: 'ArrowLeft' },
    'right': { type: 'key', key: 'ArrowRight' },
    
    // Ações WASD
    'w': { type: 'key', key: 'KeyW' },
    'a': { type: 'key', key: 'KeyA' },
    's': { type: 'key', key: 'KeyS' },
    'd': { type: 'key', key: 'KeyD' },
    
    // Ações de controle
    'space': { type: 'key', key: 'Space' },
    'enter': { type: 'key', key: 'Enter' },
    'escape': { type: 'key', key: 'Escape' },
    
    // Ações de mouse
    'click': { type: 'click' },
    'rightclick': { type: 'click', button: 'right' },
    
    // Ações especiais
    'wait': { type: 'wait', duration: 1000 },
    'screenshot': { type: 'screenshot' },
    'analyze': { type: 'analyze' }
  },

  // Configurações de logging
  logging: {
    enabled: true,
    level: 'info',
    maxLogSize: 1000, // Máximo de logs por sessão
    saveActions: true,
    saveScreenshots: false // Para economizar espaço
  },

  // Diretórios
  paths: {
    data: './data/gaming',
    ai: './data/gaming/ai',
    sessions: './data/gaming/sessions',
    screenshots: './data/gaming/screenshots',
    logs: './data/gaming/logs'
  },

  // Configurações de segurança
  security: {
    allowedDomains: [
      'play2048.co',
      'tetris.com',
      'google.com',
      'example.com',
      'localhost'
    ],
    blockSocialMedia: true,
    blockAds: true,
    maxScreenshots: 50, // Por sessão
    maxActions: 1000 // Por sessão
  },

  // Configurações de performance
  performance: {
    enableResourceBlocking: true,
    blockImages: false, // Algumas vezes necessário para jogos
    blockCSS: false,
    blockFonts: true,
    blockMedia: true,
    maxCPUUsage: 80, // Porcentagem
    maxMemoryUsage: 500, // MB
    screenshotQuality: 80 // 0-100
  }
};

export default gamingConfig;