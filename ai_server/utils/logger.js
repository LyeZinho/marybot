import winston from 'winston';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync, mkdirSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Criar diretório de logs se não existir
const logsDir = join(dirname(__dirname), 'logs');
if (!existsSync(logsDir)) {
  mkdirSync(logsDir, { recursive: true });
}

// Configuração de formatação
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.colorize({ all: true }),
  winston.format.printf(({ timestamp, level, message, service, ...meta }) => {
    let log = `${timestamp} [${service || 'AI_SERVER'}] ${level}: ${message}`;
    
    if (Object.keys(meta).length > 0) {
      log += ` ${JSON.stringify(meta, null, 2)}`;
    }
    
    return log;
  })
);

// Criar logger
export function createLogger(service = 'AI_SERVER') {
  return winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: logFormat,
    defaultMeta: { service },
    transports: [
      // Console transport
      new winston.transports.Console({
        format: winston.format.combine(
          winston.format.colorize(),
          logFormat
        )
      }),
      
      // File transport para todos os logs
      new winston.transports.File({
        filename: join(logsDir, 'ai_server.log'),
        format: winston.format.combine(
          winston.format.uncolorize(),
          logFormat
        ),
        maxsize: 5242880, // 5MB
        maxFiles: 5
      }),
      
      // File transport apenas para erros
      new winston.transports.File({
        filename: join(logsDir, 'ai_server_errors.log'),
        level: 'error',
        format: winston.format.combine(
          winston.format.uncolorize(),
          logFormat
        ),
        maxsize: 5242880, // 5MB
        maxFiles: 5
      })
    ]
  });
}

// Logger padrão para uso geral
export const logger = createLogger();

export default { createLogger, logger };