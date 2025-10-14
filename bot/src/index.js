import { Client, Collection, GatewayIntentBits, ActivityType } from 'discord.js';
import { readdirSync } from 'fs';
import { fileURLToPath, pathToFileURL } from 'url';
import { dirname, join } from 'path';
import { botConfig, validateConfig } from './config.js';
import { prisma } from './database/client.js';

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

// Função para conectar ao banco de dados
async function connectDatabase() {
  try {
    await prisma.$connect();
    console.log('✅ Conectado ao banco de dados PostgreSQL');
    
    // Testar a conexão
    await prisma.$queryRaw`SELECT 1`;
    console.log('✅ Teste de conexão com banco bem-sucedido');
  } catch (error) {
    console.error('❌ Erro ao conectar com o banco de dados:', error);
    process.exit(1);
  }
}

// Função para inicializar o bot
async function initializeBot() {
  console.log('🚀 Iniciando MaryBot...');
  
  try {
    // Conectar ao banco de dados
    await connectDatabase();
    
    // Carregar comandos e eventos
    await loadCommands();
    await loadEvents();
    
    // Fazer login
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
    await prisma.$disconnect();
    console.log('✅ Desconectado do banco de dados');
    
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
    await prisma.$disconnect();
    console.log('✅ Desconectado do banco de dados');
    
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