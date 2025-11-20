import { Client, GatewayIntentBits, Collection } from "discord.js";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";

// Carregar variáveis de ambiente primeiro
dotenv.config();

import config from "./config.js";
import { logger } from "./utils/logger.js";
import initDatabase, { disconnectDatabase } from "./database/client.js";
// Importações para AI server removidas - usando APIs externas
import fetch from "node-fetch";

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMessageReactions, // necessário para collectors de reações
    GatewayIntentBits.GuildVoiceStates, // necessário para detectar mudanças em canais de voz
    GatewayIntentBits.GuildMembers, // necessário para detectar novos membros (boas-vindas)
  ],
  partials: ['MESSAGE', 'CHANNEL', 'REACTION'], // permitir lidar com reações em mensagens parcialmente carregadas
});

client.commands = new Collection();

// --- APIs externas configuradas em ExternalLLMService.js e ExternalVoiceService.js ---

// --- Função para carregar comandos dinamicamente (Sistema Híbrido) ---
async function loadCommands() {
  try {
    const commandFolders = fs.readdirSync("./src/commands");
    
    for (const folder of commandFolders) {
      const commandFiles = fs
        .readdirSync(`./src/commands/${folder}`)
        .filter((f) => f.endsWith(".js"));
      
      for (const file of commandFiles) {
        try {
          const commandModule = await import(`./commands/${folder}/${file}`);
          const { default: command, data: slashData, execute: slashExecute } = commandModule;
          
          // 🔄 Sistema Híbrido: Suporte para ambos os tipos
          let prefixLoaded = false;
          let slashLoaded = false;
          
          // Comando tradicional com prefix
          if (command && command.name) {
            client.commands.set(command.name, {
              ...command,
              type: 'prefix',
              category: folder
            });
            logger.info(`📝 Prefix: m.${command.name} (${folder})`);
            prefixLoaded = true;
          }
          
          // Comando slash
          if (slashData && slashData.name && slashExecute) {
            const slashCommand = {
              data: slashData,
              execute: slashExecute,
              type: 'slash',
              category: folder
            };
            client.commands.set(slashData.name + '_slash', slashCommand);
            logger.info(`⚡ Slash: /${slashData.name} (${folder})`);
            slashLoaded = true;
          }
          
          // 🎯 Comando Híbrido (ambos os tipos)
          if (prefixLoaded && slashLoaded) {
            logger.success(`🔄 Híbrido: ${command.name} - Prefix + Slash disponíveis`);
          }
          
          // Aviso se não tem comandos válidos
          if (!prefixLoaded && !slashLoaded) {
            logger.warn(`⚠️ ${folder}/${file}: Nenhum comando válido encontrado`);
          }
          
        } catch (error) {
          logger.error(`Erro ao carregar comando ${folder}/${file}:`, error);
        }
      }
    }
    
    logger.success(`${client.commands.size} comandos carregados com sucesso!`);
  } catch (error) {
    logger.error("Erro ao carregar comandos:", error);
  }
}

// --- Função para carregar eventos ---
async function loadEvents() {
  try {
    const eventFiles = fs
      .readdirSync("./src/events")
      .filter((f) => f.endsWith(".js"));
    
    for (const file of eventFiles) {
      try {
        const { default: event } = await import(`./events/${file}`);
        const eventName = file.split(".")[0];
        
        // Mapear evento 'ready' para 'clientReady' (Discord.js v14.14+)
        const actualEventName = eventName === 'ready' ? 'clientReady' : eventName;
        
        client.on(actualEventName, (...args) => event(client, ...args));
        logger.info(`Evento carregado: ${eventName} -> ${actualEventName}`);
      } catch (error) {
        logger.error(`Erro ao carregar evento ${file}:`, error);
      }
    }
    
    logger.success("Eventos carregados com sucesso!");
  } catch (error) {
    logger.error("Erro ao carregar eventos:", error);
  }
}

// --- Inicialização do bot ---
async function init() {
  try {
    logger.info("🚀 Inicializando MaryBot...");
    
    // Verificar se o token existe
    const token = process.env.DISCORD_TOKEN;
    if (!token) {
      logger.error("Token do Discord não encontrado! Verifique o arquivo .env");
      process.exit(1);
    }
    
    // Inicializar banco de dados
    await initDatabase();
    
    // Inicializar sistema de mobs
    try {
      const { mobManager } = await import("./game/mobManager.js");
      await mobManager.loadMobData();
      logger.success("✅ Sistema de mobs inicializado com sucesso!");
    } catch (error) {
      logger.warn("⚠️ Erro ao inicializar sistema de mobs:", error.message);
    }

    // Inicializar sistema de itens
    try {
      const { itemManager } = await import("./game/itemManager.js");
      await itemManager.loadItemData();
      logger.success("✅ Sistema de itens inicializado com sucesso!");
    } catch (error) {
      logger.warn("⚠️ Erro ao inicializar sistema de itens:", error.message);
    }

    // Inicializar sistema de quests
    try {
      const { questManager } = await import("./game/questManager.js");
      await questManager.initialize();
      logger.success("✅ Sistema de quests inicializado com sucesso!");
    } catch (error) {
      logger.warn("⚠️ Erro ao inicializar sistema de quests:", error.message);
    }

    // Inicializar sistema de crafting
    try {
      const { craftingManager } = await import("./game/craftingManager.js");
      await craftingManager.initialize();
      logger.success("✅ Sistema de crafting inicializado com sucesso!");
    } catch (error) {
      logger.warn("⚠️ Erro ao inicializar sistema de crafting:", error.message);
    }

    // Inicializar sistema de threads temporárias
    try {
      const { threadManager } = await import("./game/threadManager.js");
      await threadManager.initialize(client);
      logger.success("✅ Sistema de salas temporárias inicializado com sucesso!");
    } catch (error) {
      logger.warn("⚠️ Erro ao inicializar sistema de threads:", error.message);
    }

    // Inicializar sistema de canais de voz extensíveis
    try {
      const { voiceManager } = await import("./game/voiceManager.js");
      await voiceManager.initialize(client);
      logger.success("✅ Sistema de canais de voz extensíveis inicializado com sucesso!");
    } catch (error) {
      logger.warn("⚠️ Erro ao inicializar sistema de voz:", error.message);
    }

    // Inicializar sistema de gaming
    try {
      const { gamingManager } = await import("./gaming/GamingManager.js");
      await gamingManager.initialize();
      logger.success("✅ Sistema de gaming inicializado com sucesso!");
    } catch (error) {
      logger.warn("⚠️ Erro ao inicializar sistema de gaming:", error.message);
    }
    
    // APIs externas LLM e Voice já configuradas nos respectivos serviços
    
    // Carregar comandos e eventos
    await loadCommands();
    await loadEvents();
    
    // Fazer login
    await client.login(token);
    
  } catch (error) {
    logger.error("Erro durante a inicialização:", error.message || error);
    console.error("Stack trace:", error.stack);
    process.exit(1);
  }
}

// --- Tratamento de erros globais ---
process.on("unhandledRejection", (error) => {
  logger.error("Unhandled promise rejection:", error);
});

process.on("uncaughtException", (error) => {
  logger.error("Uncaught exception:", error);
  process.exit(1);
});

// Graceful shutdown
process.on("SIGINT", async () => {
  logger.info("🛑 Recebido SIGINT, encerrando bot...");
  
  // APIs externas não precisam de encerramento manual
  
  await disconnectDatabase();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  logger.info("🛑 Recebido SIGTERM, encerrando bot...");
  
  // APIs externas não precisam de encerramento manual
  
  await disconnectDatabase();
  process.exit(0);
});

// Inicializar o bot
init();