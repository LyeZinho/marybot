// Sistema de logging com cores e timestamps
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m'
};

function getTimestamp() {
  return new Date().toLocaleString('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
}

function formatMessage(level, message, ...args) {
  const timestamp = getTimestamp();
  const formattedArgs = args.length > 0 ? ' ' + args.map(arg => {
    if (typeof arg === 'object') {
      if (arg === null) return 'null';
      if (arg instanceof Error) return `${arg.name}: ${arg.message}`;
      try {
        const stringified = JSON.stringify(arg, null, 2);
        return stringified === '{}' ? '[Empty Object]' : stringified;
      } catch (e) {
        return '[Circular/Unserializable Object]';
      }
    }
    return String(arg);
  }).join(' ') : '';
  
  return `[${timestamp}] [${level}] ${message}${formattedArgs}`;
}

export const logger = {
  info: (message, ...args) => {
    console.log(
      colors.cyan + formatMessage('INFO', message, ...args) + colors.reset
    );
  },

  success: (message, ...args) => {
    console.log(
      colors.green + formatMessage('SUCCESS', message, ...args) + colors.reset
    );
  },

  warn: (message, ...args) => {
    console.warn(
      colors.yellow + formatMessage('WARN', message, ...args) + colors.reset
    );
  },

  error: (message, ...args) => {
    console.error(
      colors.red + formatMessage('ERROR', message, ...args) + colors.reset
    );
  },

  debug: (message, ...args) => {
    if (process.env.NODE_ENV === 'development') {
      console.log(
        colors.magenta + formatMessage('DEBUG', message, ...args) + colors.reset
      );
    }
  },

  command: (user, command, guild = null) => {
    const guildInfo = guild ? ` em ${guild}` : ' em DM';
    console.log(
      colors.blue + formatMessage('CMD', `${user} executou: ${command}${guildInfo}`) + colors.reset
    );
  }
};