import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import axios from 'axios';

export const data = new SlashCommandBuilder()
  .setName('waifu')
  .setDescription('Gera uma imagem aleatória de waifu/husbando')
  .addStringOption(option =>
    option.setName('categoria')
      .setDescription('Categoria da imagem')
      .setRequired(false)
      .addChoices(
        { name: 'Waifu', value: 'waifu' },
        { name: 'Neko', value: 'neko' },
        { name: 'Shinobu', value: 'shinobu' },
        { name: 'Megumin', value: 'megumin' },
        { name: 'Bully', value: 'bully' },
        { name: 'Cuddle', value: 'cuddle' },
        { name: 'Cry', value: 'cry' },
        { name: 'Hug', value: 'hug' },
        { name: 'Awoo', value: 'awoo' },
        { name: 'Kiss', value: 'kiss' },
        { name: 'Lick', value: 'lick' },
        { name: 'Pat', value: 'pat' },
        { name: 'Smug', value: 'smug' },
        { name: 'Bonk', value: 'bonk' },
        { name: 'Yeet', value: 'yeet' },
        { name: 'Blush', value: 'blush' },
        { name: 'Smile', value: 'smile' },
        { name: 'Wave', value: 'wave' },
        { name: 'Highfive', value: 'highfive' },
        { name: 'Handhold', value: 'handhold' },
        { name: 'Nom', value: 'nom' },
        { name: 'Bite', value: 'bite' },
        { name: 'Glomp', value: 'glomp' },
        { name: 'Slap', value: 'slap' },
        { name: 'Kill', value: 'kill' },
        { name: 'Kick', value: 'kick' },
        { name: 'Happy', value: 'happy' },
        { name: 'Wink', value: 'wink' },
        { name: 'Poke', value: 'poke' },
        { name: 'Dance', value: 'dance' }
      )
  );

export async function execute(interaction) {
  const categoria = interaction.options.getString('categoria') || 'waifu';
  
  await interaction.deferReply();

  try {
    // Usando a API waifu.pics
    const response = await axios.get(`https://api.waifu.pics/sfw/${categoria}`);
    
    const embed = new EmbedBuilder()
      .setTitle(`🎌 ${categoria.charAt(0).toUpperCase() + categoria.slice(1)} Aleatória`)
      .setImage(response.data.url)
      .setColor('#FF69B4')
      .setTimestamp()
      .setFooter({ 
        text: `Solicitado por ${interaction.user.username}`, 
        iconURL: interaction.user.displayAvatarURL() 
      });

    await interaction.editReply({ embeds: [embed] });

  } catch (error) {
    console.error('Erro ao buscar waifu:', error);
    
    let errorMessage = 'Ocorreu um erro ao buscar a imagem. Tente novamente mais tarde.';
    
    if (error.response?.status === 404) {
      errorMessage = `A categoria "${categoria}" não foi encontrada. Tente uma categoria diferente.`;
    }
    
    const embed = new EmbedBuilder()
      .setTitle('❌ Erro')
      .setDescription(errorMessage)
      .setColor('#FF4444');
    
    await interaction.editReply({ embeds: [embed] });
  }
}