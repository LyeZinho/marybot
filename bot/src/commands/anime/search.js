import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { searchAnime } from '../../utils/animeApi.js';

export const data = new SlashCommandBuilder()
  .setName('anime-search')
  .setDescription('Busca informações sobre um anime')
  .addStringOption(option =>
    option.setName('nome')
      .setDescription('Nome do anime para buscar')
      .setRequired(true)
  );

export async function execute(interaction) {
  const animeName = interaction.options.getString('nome');
  
  await interaction.deferReply();

  try {
    const animeData = await searchAnime(animeName);
    
    if (!animeData) {
      const embed = new EmbedBuilder()
        .setTitle('❌ Anime não encontrado')
        .setDescription(`Não foi possível encontrar informações sobre "${animeName}"`)
        .setColor('#FF4444');
      
      return await interaction.editReply({ embeds: [embed] });
    }

    const embed = new EmbedBuilder()
      .setTitle(animeData.title.romaji || animeData.title.english)
      .setDescription(animeData.description ? 
        animeData.description.replace(/<[^>]*>/g, '').substring(0, 300) + '...' : 
        'Sem descrição disponível'
      )
      .setColor('#4ECDC4')
      .addFields(
        { name: '📅 Ano', value: animeData.seasonYear?.toString() || 'N/A', inline: true },
        { name: '📺 Episódios', value: animeData.episodes?.toString() || 'N/A', inline: true },
        { name: '⭐ Score', value: animeData.averageScore ? `${animeData.averageScore}/100` : 'N/A', inline: true },
        { name: '🎭 Gêneros', value: animeData.genres?.join(', ') || 'N/A', inline: false },
        { name: '🏢 Estúdio', value: animeData.studios?.nodes?.[0]?.name || 'N/A', inline: true },
        { name: '📊 Status', value: animeData.status || 'N/A', inline: true }
      )
      .setThumbnail(animeData.coverImage?.large)
      .setTimestamp()
      .setFooter({ 
        text: `Solicitado por ${interaction.user.username}`, 
        iconURL: interaction.user.displayAvatarURL() 
      });

    if (animeData.bannerImage) {
      embed.setImage(animeData.bannerImage);
    }

    await interaction.editReply({ embeds: [embed] });

  } catch (error) {
    console.error('Erro ao buscar anime:', error);
    
    const embed = new EmbedBuilder()
      .setTitle('❌ Erro na busca')
      .setDescription('Ocorreu um erro ao buscar informações do anime. Tente novamente mais tarde.')
      .setColor('#FF4444');
    
    await interaction.editReply({ embeds: [embed] });
  }
}