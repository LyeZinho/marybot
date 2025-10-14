import { REST, Routes } from 'discord.js';
import { readdirSync } from 'fs';
import { fileURLToPath, pathToFileURL } from 'url';
import { dirname, join } from 'path';
import { botConfig, validateConfig } from './config.js';

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

const commands = [];

// Carregar comandos
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
          commands.push(command.data.toJSON());
          console.log(`✅ Comando carregado para deploy: ${command.data.name}`);
        } else {
          console.log(`⚠️ Comando ${file} está faltando "data" ou "execute"`);
        }
      } catch (error) {
        console.error(`❌ Erro ao carregar comando ${file}:`, error);
      }
    }
  }
}

// Deploy dos comandos
async function deployCommands() {
  const rest = new REST().setToken(botConfig.token);

  try {
    console.log(`🚀 Iniciando refresh de ${commands.length} comandos slash...`);

    let data;
    
    if (botConfig.guildId) {
      // Deploy para guild específica (desenvolvimento)
      data = await rest.put(
        Routes.applicationGuildCommands(botConfig.clientId, botConfig.guildId),
        { body: commands },
      );
      console.log(`✅ ${data.length} comandos registrados com sucesso na guild ${botConfig.guildId}!`);
    } else {
      // Deploy global (produção)
      data = await rest.put(
        Routes.applicationCommands(botConfig.clientId),
        { body: commands },
      );
      console.log(`✅ ${data.length} comandos registrados globalmente com sucesso!`);
      console.log('⚠️ Comandos globais podem levar até 1 hora para aparecer em todos os servidores.');
    }

    // Listar comandos registrados
    console.log('\n📋 Comandos registrados:');
    data.forEach(command => {
      console.log(`   • /${command.name} - ${command.description}`);
    });

  } catch (error) {
    console.error('❌ Erro ao registrar comandos:', error);
    process.exit(1);
  }
}

// Função principal
async function main() {
  console.log('📦 Carregando comandos para deploy...');
  await loadCommands();
  
  console.log(`\n🎯 Fazendo deploy de comandos para: ${botConfig.guildId ? `Guild ${botConfig.guildId}` : 'Global'}`);
  await deployCommands();
  
  console.log('\n🎉 Deploy concluído com sucesso!');
}

// Executar
main().catch(console.error);