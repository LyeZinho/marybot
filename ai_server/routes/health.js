import express from 'express';
import { getGPT2Service } from '../services/gpt2Service.js';
import { logger } from '../utils/logger.js';

const router = express.Router();

// Status geral do servidor
router.get('/', async (req, res) => {
  try {
    const gpt2 = getGPT2Service();
    const modelInfo = gpt2.getModelInfo();
    
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      server: {
        name: 'MaryBot AI Server',
        version: '1.0.0',
        uptime: process.uptime(),
        environment: process.env.NODE_ENV || 'development'
      },
      model: {
        name: 'GPT-2',
        status: modelInfo.isInitialized ? 'ready' : 'initializing',
        hasLocalModel: modelInfo.hasLocalModel,
        huggingFaceConnected: modelInfo.huggingFaceConnected,
        modelPath: modelInfo.modelPath
      },
      memory: {
        used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
        external: Math.round(process.memoryUsage().external / 1024 / 1024)
      },
      system: {
        platform: process.platform,
        nodeVersion: process.version,
        pid: process.pid
      }
    };

    res.json(health);

  } catch (error) {
    logger.error('Erro no health check:', error);
    
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error.message
    });
  }
});

// Status detalhado do modelo
router.get('/model', async (req, res) => {
  try {
    const gpt2 = getGPT2Service();
    const modelInfo = gpt2.getModelInfo();
    
    res.json({
      success: true,
      data: modelInfo
    });

  } catch (error) {
    logger.error('Erro ao obter informações do modelo:', error);
    res.status(500).json({
      error: true,
      message: error.message
    });
  }
});

// Teste rápido do modelo
router.post('/test', async (req, res) => {
  try {
    const { testPrompt = 'Olá, como você está?' } = req.body;
    
    const gpt2 = getGPT2Service();
    const startTime = Date.now();
    
    const result = await gpt2.generateText({
      prompt: testPrompt,
      maxLength: 50,
      temperature: 0.7
    });
    
    const responseTime = Date.now() - startTime;
    
    res.json({
      success: true,
      test: {
        prompt: testPrompt,
        response: result.generatedText,
        responseTimeMs: responseTime,
        status: 'passed'
      }
    });

  } catch (error) {
    logger.error('Erro no teste do modelo:', error);
    res.status(500).json({
      success: false,
      test: {
        status: 'failed',
        error: error.message
      }
    });
  }
});

// Métricas básicas
router.get('/metrics', (req, res) => {
  const metrics = {
    timestamp: new Date().toISOString(),
    uptime: {
      seconds: process.uptime(),
      human: formatUptime(process.uptime())
    },
    memory: {
      rss: formatBytes(process.memoryUsage().rss),
      heapTotal: formatBytes(process.memoryUsage().heapTotal),
      heapUsed: formatBytes(process.memoryUsage().heapUsed),
      external: formatBytes(process.memoryUsage().external)
    },
    cpu: {
      usage: process.cpuUsage()
    },
    system: {
      loadavg: process.platform !== 'win32' ? require('os').loadavg() : [0, 0, 0],
      totalmem: formatBytes(require('os').totalmem()),
      freemem: formatBytes(require('os').freemem())
    }
  };

  res.json(metrics);
});

// Logs recentes (últimas 50 linhas)
router.get('/logs', (req, res) => {
  try {
    // Esta seria uma implementação mais complexa para ler logs
    // Por simplicidade, retornamos informação básica
    res.json({
      message: 'Endpoint de logs disponível',
      note: 'Implementação completa requer leitura de arquivos de log',
      logFile: './logs/ai_server.log'
    });
  } catch (error) {
    res.status(500).json({
      error: true,
      message: error.message
    });
  }
});

// Função auxiliar para formatar tempo de atividade
function formatUptime(seconds) {
  const days = Math.floor(seconds / (24 * 60 * 60));
  const hours = Math.floor((seconds % (24 * 60 * 60)) / (60 * 60));
  const minutes = Math.floor((seconds % (60 * 60)) / 60);
  const secs = Math.floor(seconds % 60);
  
  return `${days}d ${hours}h ${minutes}m ${secs}s`;
}

// Função auxiliar para formatar bytes
function formatBytes(bytes) {
  const sizes = ['B', 'KB', 'MB', 'GB'];
  if (bytes === 0) return '0 B';
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
}

export default router;