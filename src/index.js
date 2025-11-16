import { Client, GatewayIntentBits, Collection } from "discord.js";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";

// Carregar variáveis de ambiente primeiro
dotenv.config();

import config from "./config.js";
import { logger } from "./utils/logger.js";
import initDatabase, { disconnectDatabase } from "./database/client.js";
import { spawn } from "child_process";
import { fileURLToPath } from "url";
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

// --- Função para inicializar servidor AI ---
let aiServerProcess = null;

async function startAIServer() {
  try {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const aiServerPath = path.join(__dirname, "..", "ai_server", "server.js");
    
    logger.info("🤖 Iniciando servidor de AI...");
    logger.info(`📁 Caminho: ${aiServerPath}`);
    
    aiServerProcess = spawn('node', [aiServerPath], {
      stdio: ['inherit', 'pipe', 'pipe'],
      cwd: path.join(__dirname, '..', 'ai_server')
    });

    aiServerProcess.stdout.on('data', (data) => {
      logger.info(`[AI_SERVER] ${data.toString().trim()}`);
    });

    aiServerProcess.stderr.on('data', (data) => {
      logger.error(`[AI_SERVER_ERROR] ${data.toString().trim()}`);
    });

    aiServerProcess.on('error', (error) => {
      logger.error("Erro ao iniciar servidor AI:", error.message);
    });

    aiServerProcess.on('exit', (code, signal) => {
      if (code !== 0) {
        logger.warn(`Servidor AI encerrado com código ${code || signal}`);
      }
      aiServerProcess = null;
    });

    // Aguardar alguns segundos para o servidor inicializar
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Testar se o servidor está respondendo
    try {
      const response = await fetch('http://localhost:3001/health');
      if (response.ok) {
        const healthData = await response.json();
        logger.success("✅ Servidor AI inicializado com sucesso!");
        logger.info(`📊 Status: ${healthData.status}`);
      } else {
        logger.warn("⚠️ Servidor AI iniciado mas não está respondendo corretamente");
      }
    } catch (testError) {
      logger.warn("⚠️ Não foi possível verificar o status do servidor AI:", testError.message);
    }

  } catch (error) {
    logger.error("Falha ao iniciar servidor AI:", error.message || error);
  }
}

// --- Função para carregar comandos dinamicamente ---
async function loadCommands() {
  try {
    const commandFolders = fs.readdirSync("./src/commands");
    
    for (const folder of commandFolders) {
      const commandFiles = fs
        .readdirSync(`./src/commands/${folder}`)
        .filter((f) => f.endsWith(".js"));
      
      for (const file of commandFiles) {
        try {
          const { default: command } = await import(`./commands/${folder}/${file}`);
          
          if (!command.name) {
            logger.warn(`Comando em ${folder}/${file} não possui propriedade 'name'`);
            continue;
          }
          
          client.commands.set(command.name, command);
          logger.info(`Comando carregado: ${command.name} (${folder})`);
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
    
    // Inicializar servidor AI
    await startAIServer();
    
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
  
  // Encerrar servidor AI
  if (aiServerProcess) {
    logger.info("🤖 Encerrando servidor AI...");
    aiServerProcess.kill('SIGTERM');
  }
  
  await disconnectDatabase();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  logger.info("🛑 Recebido SIGTERM, encerrando bot...");
  
  // Encerrar servidor AI
  if (aiServerProcess) {
    logger.info("🤖 Encerrando servidor AI...");
    aiServerProcess.kill('SIGTERM');
  }
  
  await disconnectDatabase();
  process.exit(0);
});

// Inicializar o bot
init();