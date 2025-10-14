import { Events, Collection } from 'discord.js';

export const name = Events.InteractionCreate;

export async function execute(interaction) {
  // Handle slash commands
  if (interaction.isChatInputCommand()) {
    const command = interaction.client.commands.get(interaction.commandName);

    if (!command) {
      console.error(`❌ Comando ${interaction.commandName} não encontrado.`);
      return;
    }

    // Rate limiting básico
    const { cooldowns } = interaction.client;

    if (!cooldowns.has(command.data.name)) {
      cooldowns.set(command.data.name, new Collection());
    }

    const now = Date.now();
    const timestamps = cooldowns.get(command.data.name);
    const defaultCooldownDuration = 3;
    const cooldownAmount = (command.cooldown ?? defaultCooldownDuration) * 1000;

    if (timestamps.has(interaction.user.id)) {
      const expirationTime = timestamps.get(interaction.user.id) + cooldownAmount;

      if (now < expirationTime) {
        const expiredTimestamp = Math.round(expirationTime / 1000);
        return interaction.reply({ 
          content: `⏳ Você precisa esperar <t:${expiredTimestamp}:R> antes de usar \`/${command.data.name}\` novamente.`, 
          ephemeral: true 
        });
      }
    }

    timestamps.set(interaction.user.id, now);
    setTimeout(() => timestamps.delete(interaction.user.id), cooldownAmount);

    try {
      await command.execute(interaction);
      console.log(`✅ ${interaction.user.tag} executou /${interaction.commandName}`);
    } catch (error) {
      console.error(`❌ Erro ao executar ${interaction.commandName}:`, error);
      
      const errorMessage = {
        content: '❌ Houve um erro ao executar este comando!',
        ephemeral: true
      };

      if (interaction.replied || interaction.deferred) {
        await interaction.followUp(errorMessage);
      } else {
        await interaction.reply(errorMessage);
      }
    }
  }
  
  // Handle select menus (para o comando help)
  else if (interaction.isStringSelectMenu()) {
    if (interaction.customId === 'help_category') {
      const category = interaction.values[0];
      
      const categoryCommands = {
        core: [
          { name: '/ping', description: 'Mostra a latência do bot' },
          { name: '/help', description: 'Mostra esta mensagem de ajuda' }
        ],
        anime: [
          { name: '/anime-search', description: 'Busca informações sobre um anime' },
          { name: '/waifu', description: 'Gera uma imagem aleatória de waifu/husbando' },
          { name: '/quote', description: 'Mostra uma citação famosa de anime' }
        ],
        games: [
          { name: '/gacha', description: 'Invoca personagens aleatórios' },
          { name: '/quiz', description: 'Quiz de conhecimento sobre animes (em breve)' },
          { name: '/battle', description: 'Batalha com outros usuários (em breve)' }
        ],
        economy: [
          { name: '/profile', description: 'Mostra o perfil de um usuário' },
          { name: '/daily', description: 'Recebe recompensa diária' },
          { name: '/leaderboard', description: 'Mostra o ranking da comunidade' },
          { name: '/inventory', description: 'Mostra sua coleção (em breve)' }
        ]
      };

      const commands = categoryCommands[category] || [];
      const categoryNames = {
        core: '🔧 Comandos Core',
        anime: '🎌 Comandos de Anime', 
        games: '🎮 Minigames',
        economy: '💰 Sistema de Economia'
      };

      const embed = {
        title: categoryNames[category],
        description: commands.map(cmd => `**${cmd.name}**\n${cmd.description}`).join('\n\n'),
        color: 0xFF6B6B,
        timestamp: new Date(),
        footer: {
          text: `Solicitado por ${interaction.user.username}`,
          icon_url: interaction.user.displayAvatarURL()
        }
      };

      await interaction.update({ embeds: [embed], components: [] });
    }
  }
}