// Comando administrativo para gerenciar configurações de logging
import { logger } from "../../utils/logger.js";
import { LOG_CONFIG } from "../../utils/logConfig.js";

export default {
  name: "logs",
  description: "Gerencia configurações de logging em tempo real",
  category: "admin",
  usage: "logs [view|level|debug|performance|test]",
  cooldown: 3000,
  ownerOnly: true,
  
  async execute(client, message, args) {
    const subcommand = args[0]?.toLowerCase();
    
    try {
      switch (subcommand) {
        case 'view':
        case 'status':
          await this.showLogStatus(message);
          break;
          
        case 'level':
          await this.setLogLevel(message, args.slice(1));
          break;
          
        case 'debug':
          await this.toggleDebug(message, args.slice(1));
          break;
          
        case 'test':
          await this.testLogs(message);
          break;
          
        default:
          await this.showHelp(message);
      }
      
    } catch (error) {
      logger.error("Erro no comando logs", error, {
        module: 'Admin',
        command: 'logs',
        user: message.author.username
      });
      
      await message.reply({
        content: "❌ Erro interno no comando de logs. Verifique os logs do console."
      });
    }
  },
  
  async showLogStatus(message) {
    const embed = {
      title: "📊 Status do Sistema de Logging",
      color: 0x0099ff,
      fields: [
        {
          name: "🎯 Níveis por Módulo",
          value: Object.entries(LOG_CONFIG.modules)
            .map(([module, level]) => `\`${module.padEnd(12)}\`: ${level}`)
            .join('\n'),
          inline: false
        },
        {
          name: "🐛 Debug Habilitado",
          value: Object.entries(LOG_CONFIG.debug)
            .map(([module, enabled]) => `\`${module.padEnd(12)}\`: ${enabled ? '✅' : '❌'}`)
            .join('\n'),
          inline: true
        },
        {
          name: "⚡ Performance",
          value: [
            `Habilitado: ${LOG_CONFIG.performance.enabled ? '✅' : '❌'}`,
            `Limite lento: ${LOG_CONFIG.performance.slowThreshold}ms`,
            `Limite muito lento: ${LOG_CONFIG.performance.verySlowThreshold}ms`
          ].join('\n'),
          inline: true
        }
      ],
      timestamp: new Date().toISOString()
    };
    
    await message.reply({ embeds: [embed] });
  },
  
  async setLogLevel(message, args) {
    if (args.length < 2) {
      return await message.reply({
        content: "❌ Uso: `logs level <module> <level>`\n" +
                "Módulos: `" + Object.keys(LOG_CONFIG.modules).join('`, `') + "`\n" +
                "Níveis: `DEBUG`, `INFO`, `WARN`, `ERROR`, `FATAL`"
      });
    }
    
    const module = args[0];
    const level = args[1].toUpperCase();
    
    if (!LOG_CONFIG.modules.hasOwnProperty(module)) {
      return await message.reply({
        content: `❌ Módulo inválido. Módulos disponíveis: \`${Object.keys(LOG_CONFIG.modules).join('`, `')}\``
      });
    }
    
    if (!['DEBUG', 'INFO', 'WARN', 'ERROR', 'FATAL'].includes(level)) {
      return await message.reply({
        content: "❌ Nível inválido. Níveis disponíveis: `DEBUG`, `INFO`, `WARN`, `ERROR`, `FATAL`"
      });
    }
    
    const oldLevel = LOG_CONFIG.modules[module];
    LOG_CONFIG.modules[module] = level;
    
    logger.info(`Log level alterado para módulo ${module}`, {
      module: 'Admin',
      command: 'logs',
      user: message.author.username
    });
    
    await message.reply({
      content: `✅ Nível de log do módulo \`${module}\` alterado de \`${oldLevel}\` para \`${level}\``
    });
  },
  
  async toggleDebug(message, args) {
    if (args.length < 1) {
      return await message.reply({
        content: "❌ Uso: `logs debug <module> [on|off]`\n" +
                "Módulos: `" + Object.keys(LOG_CONFIG.debug).join('`, `') + "`"
      });
    }
    
    const module = args[0].toLowerCase();
    const action = args[1]?.toLowerCase();
    
    if (!LOG_CONFIG.debug.hasOwnProperty(module)) {
      return await message.reply({
        content: `❌ Módulo inválido. Módulos disponíveis: \`${Object.keys(LOG_CONFIG.debug).join('`, `')}\``
      });
    }
    
    let newValue;
    if (action === 'on' || action === 'true') {
      newValue = true;
    } else if (action === 'off' || action === 'false') {
      newValue = false;
    } else {
      newValue = !LOG_CONFIG.debug[module]; // Toggle
    }
    
    const oldValue = LOG_CONFIG.debug[module];
    LOG_CONFIG.debug[module] = newValue;
    
    logger.info(`Debug ${newValue ? 'habilitado' : 'desabilitado'} para módulo ${module}`, {
      module: 'Admin',
      command: 'logs',
      user: message.author.username
    });
    
    await message.reply({
      content: `${newValue ? '✅ Debug habilitado' : '❌ Debug desabilitado'} para o módulo \`${module}\``
    });
  },
  
  async testLogs(message) {
    await message.reply("🧪 Testando todos os níveis de log...");
    
    const testContext = {
      module: 'LogTest',
      function: 'testLogs',
      user: message.author.username,
      guild: message.guild?.name
    };
    
    // Testar todos os níveis
    logger.debug("Teste de log DEBUG", testContext, { test: true });
    logger.info("Teste de log INFO", testContext);
    logger.warn("Teste de log WARN", testContext, "Detalhes do warning");
    logger.error("Teste de log ERROR", new Error("Erro de teste"), testContext);
    
    // Testar logs específicos
    logger.ai("Teste do sistema de IA", testContext);
    logger.database("Teste do sistema de banco", testContext);
    logger.social("Teste do assistente social", testContext);
    logger.performance("operacao-teste", 1500, testContext);
    logger.connection("TestService", "connected", null, testContext);
    
    logger.separator("TESTE DE LOGGING CONCLUÍDO");
    
    setTimeout(async () => {
      await message.reply("✅ Teste de logs concluído! Verifique o console para ver os resultados.");
    }, 1000);
  },
  
  async showHelp(message) {
    const embed = {
      title: "📋 Comando de Gerenciamento de Logs",
      color: 0x00ff00,
      description: "Gerencie as configurações de logging do bot em tempo real.",
      fields: [
        {
          name: "📊 `logs view`",
          value: "Mostra o status atual de todas as configurações de log",
          inline: false
        },
        {
          name: "🎯 `logs level <module> <level>`",
          value: "Altera o nível de log de um módulo específico\n" +
                 "**Módulos:** " + Object.keys(LOG_CONFIG.modules).join(', ') + "\n" +
                 "**Níveis:** DEBUG, INFO, WARN, ERROR, FATAL",
          inline: false
        },
        {
          name: "🐛 `logs debug <module> [on|off]`",
          value: "Habilita/desabilita debug para um módulo específico\n" +
                 "**Módulos:** " + Object.keys(LOG_CONFIG.debug).join(', '),
          inline: false
        },
        {
          name: "🧪 `logs test`",
          value: "Executa um teste de todos os tipos de log para verificação",
          inline: false
        }
      ],
      footer: {
        text: "💡 As alterações são aplicadas imediatamente e persistem até o restart"
      },
      timestamp: new Date().toISOString()
    };
    
    await message.reply({ embeds: [embed] });
  }
};