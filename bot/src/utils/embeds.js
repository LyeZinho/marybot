import { EmbedBuilder } from 'discord.js';

/**
 * Cria um embed básico com configurações padrão
 * @param {Object} options - Opções do embed
 * @returns {EmbedBuilder}
 */
export function createBasicEmbed(options = {}) {
  const embed = new EmbedBuilder()
    .setColor(options.color || '#4ECDC4')
    .setTimestamp();

  if (options.title) embed.setTitle(options.title);
  if (options.description) embed.setDescription(options.description);
  if (options.thumbnail) embed.setThumbnail(options.thumbnail);
  if (options.image) embed.setImage(options.image);
  if (options.footer) embed.setFooter(options.footer);
  if (options.author) embed.setAuthor(options.author);
  if (options.fields) embed.addFields(options.fields);

  return embed;
}

/**
 * Cria um embed de sucesso
 * @param {string} title - Título do embed
 * @param {string} description - Descrição do embed
 * @returns {EmbedBuilder}
 */
export function createSuccessEmbed(title, description) {
  return createBasicEmbed({
    title: `✅ ${title}`,
    description,
    color: '#00FF7F'
  });
}

/**
 * Cria um embed de erro
 * @param {string} title - Título do embed
 * @param {string} description - Descrição do embed
 * @returns {EmbedBuilder}
 */
export function createErrorEmbed(title, description) {
  return createBasicEmbed({
    title: `❌ ${title}`,
    description,
    color: '#FF4444'
  });
}

/**
 * Cria um embed de aviso
 * @param {string} title - Título do embed
 * @param {string} description - Descrição do embed
 * @returns {EmbedBuilder}
 */
export function createWarningEmbed(title, description) {
  return createBasicEmbed({
    title: `⚠️ ${title}`,
    description,
    color: '#FFB347'
  });
}

/**
 * Cria um embed de informação
 * @param {string} title - Título do embed
 * @param {string} description - Descrição do embed
 * @returns {EmbedBuilder}
 */
export function createInfoEmbed(title, description) {
  return createBasicEmbed({
    title: `ℹ️ ${title}`,
    description,
    color: '#0099FF'
  });
}

/**
 * Cria um embed de loading
 * @param {string} message - Mensagem de loading
 * @returns {EmbedBuilder}
 */
export function createLoadingEmbed(message = 'Carregando...') {
  return createBasicEmbed({
    title: '⏳ Aguarde',
    description: message,
    color: '#FFD93D'
  });
}

/**
 * Cria um embed para perfil de usuário
 * @param {Object} user - Dados do usuário
 * @param {Object} discordUser - Usuário do Discord
 * @returns {EmbedBuilder}
 */
export function createProfileEmbed(user, discordUser) {
  const level = Math.floor(user.xp / 100) + 1;
  const xpForNextLevel = (level * 100) - user.xp;
  
  let rank = '🥉 Bronze Otaku';
  if (level >= 50) rank = '💎 Diamante Otaku';
  else if (level >= 30) rank = '🥇 Ouro Otaku';
  else if (level >= 20) rank = '🥈 Prata Otaku';
  else if (level >= 10) rank = '🥉 Bronze Otaku';

  return createBasicEmbed({
    title: `📊 Perfil de ${discordUser.username}`,
    thumbnail: discordUser.displayAvatarURL({ dynamic: true }),
    color: '#4ECDC4',
    fields: [
      { name: '🏅 Rank', value: rank, inline: true },
      { name: '📈 Nível', value: level.toString(), inline: true },
      { name: '✨ XP', value: `${user.xp} XP`, inline: true },
      { name: '💰 Moedas', value: `${user.coins} 🪙`, inline: true },
      { name: '📊 Progresso', value: `${100 - xpForNextLevel} / 100 XP`, inline: true }
    ],
    footer: {
      text: `Perfil criado em ${user.createdAt.toLocaleDateString('pt-BR')}`
    }
  });
}

/**
 * Cria um embed para resultados de gacha
 * @param {Array} results - Resultados do gacha
 * @param {Object} options - Opções adicionais
 * @returns {EmbedBuilder}
 */
export function createGachaEmbed(results, options = {}) {
  const rarityEmojis = { 1: '⭐', 2: '⭐⭐', 3: '⭐⭐⭐', 4: '⭐⭐⭐⭐', 5: '⭐⭐⭐⭐⭐' };
  const rarityColors = { 1: '⚪', 2: '🟢', 3: '🔵', 4: '🟣', 5: '🟡' };
  
  let description = '';
  results.forEach((char) => {
    const stars = rarityEmojis[char.rarity] || '⭐';
    const color = rarityColors[char.rarity] || '⚪';
    description += `${color} **${char.name}** ${stars}\n*${char.anime}*\n\n`;
  });

  const hasRare = results.some(char => char.rarity >= 4);
  
  return createBasicEmbed({
    title: `🎲 Resultado do Gacha${options.isMulti ? ' (10x)' : ''}`,
    description,
    color: hasRare ? '#FFD700' : '#FF69B4',
    fields: [
      { name: '💰 Custo', value: `${options.cost || 50} 🪙`, inline: true },
      { name: '✨ XP Ganho', value: `+${options.xpGain || 0} XP`, inline: true },
      { name: '🎴 Personagens', value: `${results.length} obtido(s)`, inline: true }
    ],
    footer: options.footer
  });
}