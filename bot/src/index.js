import { Client, Collection, GatewayIntentBits, ActivityType } from 'discord.js';
import { readdirSync } from 'fs';
import { fileURLToPath, pathToFileURL } from 'url';
import { dirname, join } from 'path';
import { botConfig, validateConfig } from './config.js';
import { wsClient } from './services/websocketClient.js';

// Configurar __dirname para ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Validar configurações
try {
  validateConfig();
} catch (error) {
  console.error('❌ Erro na configuração:', error.message);
  process.exit(1);
}

// Criar cliente Discord
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers
  ]
});

// Coleções para comandos e cooldowns
client.commands = new Collection();
client.cooldowns = new Collection();

// Expose WebSocket client globally
client.wsClient = wsClient;

// Função para carregar comandos
async function loadCommands() {
  const commandsPath = join(__dirname, 'commands');
  const commandFolders = readdirSync(commandsPath);

  for (const folder of commandFolders) {
    const folderPath = join(commandsPath, folder);
    const commandFiles = readdirSync(folderPath).filter(file => file.endsWith('.js'));

    for (const file of commandFiles) {
      const filePath = join(folderPath, file);
      const fileURL = pathToFileURL(filePath).href;
      
      try {
        const command = await import(fileURL);
        
        if ('data' in command && 'execute' in command) {
          client.commands.set(command.data.name, command);
          console.log(`✅ Comando carregado: ${command.data.name}`);
        } else {
          console.log(`⚠️ Comando ${file} está faltando "data" ou "execute"`);
        }
      } catch (error) {
        console.error(`❌ Erro ao carregar comando ${file}:`, error);
      }
    }
  }
}

// Função para carregar eventos
async function loadEvents() {
  const eventsPath = join(__dirname, 'events');
  const eventFiles = readdirSync(eventsPath).filter(file => file.endsWith('.js'));

  for (const file of eventFiles) {
    const filePath = join(eventsPath, file);
    const fileURL = pathToFileURL(filePath).href;
    
    try {
      const event = await import(fileURL);
      
      if (event.once) {
        client.once(event.name, (...args) => event.execute(...args));
      } else {
        client.on(event.name, (...args) => event.execute(...args));
      }
      
      console.log(`✅ Evento carregado: ${event.name}`);
    } catch (error) {
      console.error(`❌ Erro ao carregar evento ${file}:`, error);
    }
  }
}

// Função para conectar aos serviços
async function connectServices() {
  if (botConfig.features.useWebSocket) {
    try {
      console.log('🔌 Connecting to Backend Service via WebSocket...');
      await wsClient.connect();
      console.log('✅ Connected to Backend Service');
      
      // Setup WebSocket event handlers
      setupWebSocketHandlers();
      
    } catch (error) {
      console.error('❌ Failed to connect to Backend Service:', error);
      
      if (botConfig.features.enableFallback) {
        console.log('🔄 Falling back to direct database access...');
        await connectDatabase();
      } else {
        throw error;
      }
    }
  } else {
    console.log('🔌 Using direct database connection...');
    await connectDatabase();
  }
}

// Função para conectar ao banco de dados (fallback)
async function connectDatabase() {
  try {
    const { prisma } = await import('./database/client.js');
    await prisma.$connect();
    console.log('✅ Connected to PostgreSQL database');
    
    // Test connection
    await prisma.$queryRaw`SELECT 1`;
    console.log('✅ Database connection test successful');
    
    // Store prisma client globally for fallback use
    global.prisma = prisma;
  } catch (error) {
    console.error('❌ Error connecting to database:', error);
    throw error;
  }
}

// Setup WebSocket event handlers
function setupWebSocketHandlers() {
  // Handle backend notifications
  wsClient.on('backend_notification', (data) => {
    handleBackendNotification(data);
  });

  // Handle level up events
  wsClient.on('user_level_up', (data) => {
    handleLevelUpNotification(data);
  });

  // Handle connection events
  wsClient.on('disconnected', (reason) => {
    console.warn(`⚠️ WebSocket disconnected: ${reason}`);
    if (botConfig.features.enableFallback) {
      console.log('🔄 Switching to fallback mode...');
    }
  });

  wsClient.on('reconnect_failed', () => {
    console.error('💀 Failed to reconnect to Backend Service');
    if (botConfig.features.enableFallback) {
      console.log('🔄 Continuing in fallback mode...');
    }
  });
}

// Handle backend notifications
async function handleBackendNotification(data) {
  const { event, data: eventData } = data;
  
  try {
    switch (event) {
      case 'level_up':
        await sendLevelUpMessage(eventData);
        break;
      case 'achievement_unlock':
        await sendAchievementMessage(eventData);
        break;
      case 'event_announcement':
        await sendEventAnnouncement(eventData);
        break;
      default:
        console.log(`📢 Unhandled notification: ${event}`);
    }
  } catch (error) {
    console.error('❌ Error handling backend notification:', error);
  }
}

// Handle level up notifications
async function handleLevelUpNotification(data) {
  const { userId, newLevel, coinsReward } = data;
  
  try {
    // Find user in cache or fetch from guild
    const user = client.users.cache.get(userId);
    if (!user) return;

    // Send DM or find a suitable channel
    const guild = client.guilds.cache.first(); // Or find specific guild
    if (!guild) return;

    const member = guild.members.cache.get(userId);
    if (!member) return;

    // Find a general channel to send the message
    const channel = guild.channels.cache.find(ch => 
      ch.name.includes('geral') || 
      ch.name.includes('general') || 
      ch.name.includes('chat')
    ) || guild.systemChannel;

    if (channel && channel.isTextBased()) {
      const { EmbedBuilder } = await import('discord.js');
      
      const embed = new EmbedBuilder()
        .setTitle('🎉 Level Up!')
        .setDescription(`Parabéns ${member}! Você alcançou o nível **${newLevel}**!`)
        .addFields(
          { name: '💰 Recompensa', value: `${coinsReward} moedas`, inline: true },
          { name: '⭐ Novo Nível', value: newLevel.toString(), inline: true }
        )
        .setColor(botConfig.successColor)
        .setTimestamp();

      await channel.send({ embeds: [embed] });
    }
  } catch (error) {
    console.error('❌ Error sending level up notification:', error);
  }
}

// Função para inicializar o bot
async function initializeBot() {
  console.log('🚀 Iniciando MaryBot...');
  
  try {
    // Connect to services (WebSocket or fallback to database)
    await connectServices();
    
    // Load commands and events
    await loadCommands();
    await loadEvents();
    
    // Login to Discord
    await client.login(botConfig.token);
    
  } catch (error) {
    console.error('❌ Erro ao inicializar o bot:', error);
    process.exit(1);
  }
}

// Manipuladores de erro global
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Recebido SIGINT, desligando graciosamente...');
  
  try {
    // Disconnect WebSocket client
    if (wsClient.isReady()) {
      wsClient.disconnect();
      console.log('✅ WebSocket client disconnected');
    }
    
    // Disconnect database if using fallback
    if (global.prisma) {
      await global.prisma.$disconnect();
      console.log('✅ Desconectado do banco de dados');
    }
    
    client.destroy();
    console.log('✅ Cliente Discord desconectado');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Erro durante o shutdown:', error);
    process.exit(1);
  }
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 Recebido SIGTERM, desligando graciosamente...');
  
  try {
    // Disconnect WebSocket client
    if (wsClient.isReady()) {
      wsClient.disconnect();
      console.log('✅ WebSocket client disconnected');
    }
    
    // Disconnect database if using fallback
    if (global.prisma) {
      await global.prisma.$disconnect();
      console.log('✅ Desconectado do banco de dados');
    }
    
    client.destroy();
    console.log('✅ Cliente Discord desconectado');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Erro durante o shutdown:', error);
    process.exit(1);
  }
});

// Inicializar o bot
initializeBot();