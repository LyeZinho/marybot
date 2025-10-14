import { Events } from 'discord.js';

export const name = Events.ClientReady;
export const once = true;

export function execute(client) {
  console.log(`🤖 ${client.user.tag} está online!`);
  console.log(`📊 Conectado a ${client.guilds.cache.size} servidor(es)`);
  console.log(`👥 Servindo ${client.users.cache.size} usuário(s)`);
  
  // Definir status do bot
  client.user.setActivity('animes e gerenciando a comunidade! 🎌', { 
    type: 'WATCHING' 
  });
  
  console.log('✅ Bot iniciado com sucesso!');
}