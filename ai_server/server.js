// Servidor de AI para MaryBot
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import bodyParser from 'body-parser';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createLogger } from './utils/logger.js';
import { setupRateLimit } from './utils/rateLimit.js';

// Importar rotas
import conversationRoutes from './routes/conversation.js';
import analysisRoutes from './routes/analysis.js';
import generationRoutes from './routes/generation.js';
import healthRoutes from './routes/health.js';
import nsfwRoutes from './routes/nsfw.js';

// Configuração de paths
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Carregar variáveis de ambiente
dotenv.config({ path: join(__dirname, '.env') });

const app = express();
const PORT = process.env.AI_SERVER_PORT || 3001;
const logger = createLogger('AI_SERVER');

// Middlewares de segurança
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false
}));

app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
  credentials: true
}));

app.use(compression());
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiting
setupRateLimit(app);

// Middleware de logging
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`, {
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    body: req.method === 'POST' ? req.body : undefined
  });
  next();
});

// Rotas da API
app.use('/api/health', healthRoutes);
app.use('/api/conversation', conversationRoutes);
app.use('/api/analysis', analysisRoutes);
app.use('/api/generation', generationRoutes);
app.use('/api/nsfw', nsfwRoutes);

// Rota raiz
app.get('/', (req, res) => {
  res.json({
    message: 'MaryBot AI Server',
    version: '1.0.0',
    status: 'running',
    endpoints: [
      '/api/health',
      '/api/conversation',
      '/api/analysis', 
      '/api/generation'
    ]
  });
});

// Middleware de erro global
app.use((error, req, res, next) => {
  logger.error('Erro não tratado:', error);
  
  res.status(error.status || 500).json({
    error: true,
    message: process.env.NODE_ENV === 'production' 
      ? 'Erro interno do servidor'
      : error.message,
    ...(process.env.NODE_ENV !== 'production' && { stack: error.stack })
  });
});

// Middleware para rotas não encontradas
app.use('*', (req, res) => {
  res.status(404).json({
    error: true,
    message: 'Endpoint não encontrado',
    path: req.originalUrl
  });
});

// Inicializar servidor
const server = app.listen(PORT, () => {
  logger.info(`🚀 Servidor de AI rodando na porta ${PORT}`);
  logger.info(`📊 Ambiente: ${process.env.NODE_ENV || 'development'}`);
  logger.info(`🤖 Modelo GPT-2 carregado do Hugging Face`);
}).on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    logger.error(`❌ Porta ${PORT} já está em uso!`);
    logger.info('💡 Tente uma das opções:');
    logger.info(`   1. Finalizar processo: netstat -ano | findstr :${PORT}, depois taskkill /PID <PID> /F`);
    logger.info(`   2. Usar porta diferente: set AI_SERVER_PORT=3002 && node server.js`);
    logger.info(`   3. Aguardar alguns segundos e tentar novamente`);
    process.exit(1);
  } else {
    logger.error('Erro ao iniciar servidor:', error);
    process.exit(1);
  }
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('Recebido SIGTERM, fechando servidor...');
  server.close(() => {
    logger.info('Servidor fechado com sucesso');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  logger.info('Recebido SIGINT, fechando servidor...');
  server.close(() => {
    logger.info('Servidor fechado com sucesso');
    process.exit(0);
  });
});

export default app;