import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder } from 'discord.js';

export const data = new SlashCommandBuilder()
  .setName('help')
  .setDescription('Mostra todos os comandos disponíveis');

export async function execute(interaction) {
  const embed = new EmbedBuilder()
    .setTitle('🤖 Ajuda - Clube dos Animes')
    .setDescription('Selecione uma categoria abaixo para ver os comandos disponíveis!')
    .setColor('#FF6B6B')
    .setThumbnail(interaction.client.user.displayAvatarURL())
    .addFields(
      { name: '🔧 Core', value: 'Comandos básicos do bot', inline: true },
      { name: '🎌 Anime', value: 'Comandos relacionados a animes', inline: true },
      { name: '🎮 Games', value: 'Minigames e diversão', inline: true },
      { name: '💰 Economia', value: 'Sistema de moedas e perfil', inline: true }
    )
    .setTimestamp()
    .setFooter({ 
      text: `Solicitado por ${interaction.user.username}`, 
      iconURL: interaction.user.displayAvatarURL() 
    });

  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId('help_category')
    .setPlaceholder('Escolha uma categoria')
    .addOptions([
      {
        label: '🔧 Core',
        description: 'Comandos básicos do bot',
        value: 'core',
        emoji: '🔧'
      },
      {
        label: '🎌 Anime',
        description: 'Comandos relacionados a animes',
        value: 'anime',
        emoji: '🎌'
      },
      {
        label: '🎮 Games',
        description: 'Minigames e diversão',
        value: 'games',
        emoji: '🎮'
      },
      {
        label: '💰 Economia',
        description: 'Sistema de moedas e perfil',
        value: 'economy',
        emoji: '💰'
      }
    ]);

  const row = new ActionRowBuilder().addComponents(selectMenu);

  await interaction.reply({ 
    embeds: [embed], 
    components: [row] 
  });
}