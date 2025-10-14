import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';

export const data = new SlashCommandBuilder()
  .setName('ping')
  .setDescription('Responde com Pong! e mostra a latência do bot');

export async function execute(interaction) {
  const sent = await interaction.reply({ 
    content: 'Calculando ping...', 
    fetchReply: true 
  });
  
  const embed = new EmbedBuilder()
    .setTitle('🏓 Pong!')
    .setColor('#0099FF')
    .addFields(
      { 
        name: 'Latência do Bot', 
        value: `${sent.createdTimestamp - interaction.createdTimestamp}ms`, 
        inline: true 
      },
      { 
        name: 'Latência da API', 
        value: `${Math.round(interaction.client.ws.ping)}ms`, 
        inline: true 
      }
    )
    .setTimestamp();

  await interaction.editReply({ 
    content: '', 
    embeds: [embed] 
  });
}