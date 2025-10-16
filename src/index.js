import { Client, GatewayIntentBits, Collection } from "discord.js";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";

// Carregar variáveis de ambiente primeiro
dotenv.config();

import config from "./config.js";
import { logger } from "./utils/logger.js";
import initDatabase, { disconnectDatabase } from "./database/client.js";

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

client.commands = new Collection();

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
  await disconnectDatabase();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  logger.info("🛑 Recebido SIGTERM, encerrando bot...");
  await disconnectDatabase();
  process.exit(0);
});

// Inicializar o bot
init();