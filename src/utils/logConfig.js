/**
 * @file logConfig.js
 * @description Configurações avançadas para o sistema de logging
 */

// Configurações de logging por módulo
export const LOG_CONFIG = {
  // Níveis de log por módulo
  modules: {
    AI: process.env.LOG_AI || 'INFO',
    Database: process.env.LOG_DB || 'INFO', 
    Social: process.env.LOG_SOCIAL || 'INFO',
    Commands: process.env.LOG_COMMANDS || 'INFO',
    Events: process.env.LOG_EVENTS || 'INFO',
    Performance: process.env.LOG_PERFORMANCE || 'WARN',
    Connection: process.env.LOG_CONNECTION || 'INFO',
    Bot: process.env.LOG_BOT || 'INFO'
  },
  
  // Configurações de performance
  performance: {
    // Limite em ms para considerar uma operação lenta
    slowThreshold: parseInt(process.env.SLOW_THRESHOLD) || 1000,
    // Limite em ms para considerar uma operação muito lenta
    verySlowThreshold: parseInt(process.env.VERY_SLOW_THRESHOLD) || 5000,
    // Habilitar logs de performance
    enabled: process.env.LOG_PERFORMANCE_ENABLED === 'true'
  },
  
  // Configurações de debug
  debug: {
    // Habilitar debug da IA
    ai: process.env.DEBUG_AI === 'true',
    // Habilitar debug do banco de dados
    database: process.env.DEBUG_DB === 'true',
    // Habilitar debug de comandos
    commands: process.env.DEBUG_COMMANDS === 'true',
    // Habilitar debug de eventos
    events: process.env.DEBUG_EVENTS === 'true'
  },
  
  // Filtros de contexto
  filters: {
    // Servidores específicos para log detalhado (IDs)
    guilds: process.env.DEBUG_GUILDS ? process.env.DEBUG_GUILDS.split(',') : [],
    // Usuários específicos para log detalhado (IDs)
    users: process.env.DEBUG_USERS ? process.env.DEBUG_USERS.split(',') : [],
    // Comandos específicos para log detalhado
    commands: process.env.DEBUG_COMMANDS_LIST ? process.env.DEBUG_COMMANDS_LIST.split(',') : []
  },
  
  // Configurações de formatação
  format: {
    // Tamanho máximo de strings em logs
    maxStringLength: parseInt(process.env.LOG_MAX_STRING) || 200,
    // Incluir stack trace completo em erros
    fullStackTrace: process.env.LOG_FULL_STACK === 'true',
    // Incluir contexto completo em todos os logs
    fullContext: process.env.LOG_FULL_CONTEXT === 'true'
  }
};

// Função para verificar se deve logar baseado no contexto
export function shouldLog(level, module, context = {}) {
  // Verificar nível do módulo
  const moduleLevel = LOG_CONFIG.modules[module] || 'INFO';
  const levels = { DEBUG: 0, INFO: 1, WARN: 2, ERROR: 3, FATAL: 4 };
  
  if (levels[level] < levels[moduleLevel]) {
    return false;
  }
  
  // Verificar filtros específicos
  if (LOG_CONFIG.filters.guilds.length > 0 && context.guild) {
    return LOG_CONFIG.filters.guilds.includes(context.guild);
  }
  
  if (LOG_CONFIG.filters.users.length > 0 && context.user) {
    return LOG_CONFIG.filters.users.includes(context.user);
  }
  
  if (LOG_CONFIG.filters.commands.length > 0 && context.command) {
    return LOG_CONFIG.filters.commands.includes(context.command);
  }
  
  return true;
}

// Função para formatar contexto baseado nas configurações
export function formatLogContext(context, module) {
  if (!context) return {};
  
  // Se debug está habilitado para o módulo, retornar contexto completo
  if (LOG_CONFIG.debug[module.toLowerCase()] || LOG_CONFIG.format.fullContext) {
    return context;
  }
  
  // Senão, retornar contexto simplificado
  return {
    module: context.module,
    function: context.function,
    command: context.command,
    user: context.user,
    guild: context.guild
  };
}

// Função para verificar se deve logar performance
export function shouldLogPerformance(duration, operation = '') {
  if (!LOG_CONFIG.performance.enabled) return false;
  
  // Sempre logar operações muito lentas
  if (duration >= LOG_CONFIG.performance.verySlowThreshold) return true;
  
  // Logar operações lentas apenas se configurado
  if (duration >= LOG_CONFIG.performance.slowThreshold) return true;
  
  return false;
}

export default LOG_CONFIG;