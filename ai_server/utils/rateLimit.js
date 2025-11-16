import { RateLimiterMemory } from 'rate-limiter-flexible';
import { logger } from './logger.js';

// Configuração do rate limiter
const rateLimiter = new RateLimiterMemory({
  keyField: 'ip',
  points: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100, // Número de requests
  duration: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 900, // Por período em segundos (15 min)
});

// Rate limiter específico para rotas de AI (mais restritivo)
const aiRateLimiter = new RateLimiterMemory({
  keyField: 'ip',
  points: 20, // Apenas 20 requests de AI por período
  duration: 900, // 15 minutos
});

export function setupRateLimit(app) {
  // Rate limiting geral
  app.use(async (req, res, next) => {
    try {
      await rateLimiter.consume(req.ip);
      next();
    } catch (rejRes) {
      logger.warn(`Rate limit excedido para IP: ${req.ip}`, {
        path: req.path,
        remainingPoints: rejRes.remainingPoints,
        msBeforeNext: rejRes.msBeforeNext
      });
      
      res.status(429).json({
        error: true,
        message: 'Muitas requisições. Tente novamente em alguns minutos.',
        retryAfter: Math.round(rejRes.msBeforeNext / 1000) || 1
      });
    }
  });
}

// Middleware específico para rotas de AI
export async function aiRateLimit(req, res, next) {
  try {
    await aiRateLimiter.consume(req.ip);
    next();
  } catch (rejRes) {
    logger.warn(`Rate limit de AI excedido para IP: ${req.ip}`, {
      path: req.path,
      remainingPoints: rejRes.remainingPoints,
      msBeforeNext: rejRes.msBeforeNext
    });
    
    res.status(429).json({
      error: true,
      message: 'Limite de requisições de AI excedido. Tente novamente em alguns minutos.',
      retryAfter: Math.round(rejRes.msBeforeNext / 1000) || 1
    });
  }
}

export { rateLimiter, aiRateLimiter };