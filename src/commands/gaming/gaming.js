/**
 * 🎮 Comando Gaming
 * Comando para gerenciar e jogar jogos
 */

import { SlashCommandBuilder, EmbedBuilder, ButtonBuilder, ActionRowBuilder, ButtonStyle, ComponentType } from 'discord.js';
import { logger } from '../../utils/logger.js';

let gamingManager = null;

// Importar gaming manager de forma assíncrona
(async () => {
  try {
    const { gamingManager: gm } = await import('../../gaming/GamingManager.js');
    gamingManager = gm;
  } catch (error) {
    logger.error('❌ Erro ao importar GamingManager:', error);
  }
})();

export default {
  name: 'gaming',
  description: 'Sistema de gaming com IA',
  
  data: new SlashCommandBuilder()
    .setName('gaming')
    .setDescription('Sistema de gaming com IA')
    .addSubcommand(subcommand =>
      subcommand
        .setName('list')
        .setDescription('Listar jogos disponíveis')
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('play')
        .setDescription('Iniciar um jogo')
        .addStringOption(option =>
          option
            .setName('game')
            .setDescription('ID do jogo para jogar')
            .setRequired(true)
        )
        .addStringOption(option =>
          option
            .setName('url')
            .setDescription('URL do jogo (para jogos browser)')
            .setRequired(false)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('action')
        .setDescription('Executar ação no jogo ativo')
        .addStringOption(option =>
          option
            .setName('action')
            .setDescription('Ação para executar')
            .setRequired(true)
            .addChoices(
              { name: '📸 Screenshot', value: 'screenshot' },
              { name: '🖱️ Clique', value: 'click' },
              { name: '⌨️ Tecla', value: 'key' },
              { name: '🔍 Analisar', value: 'analyze' },
              { name: '⏸️ Pausar', value: 'pause' },
              { name: '▶️ Resumir', value: 'resume' },
              { name: '🛑 Parar', value: 'stop' }
            )
        )
        .addStringOption(option =>
          option
            .setName('data')
            .setDescription('Dados adicionais (JSON)')
            .setRequired(false)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('status')
        .setDescription('Ver status das sessões de jogo')
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('ai')
        .setDescription('Ver estatísticas da IA')
        .addStringOption(option =>
          option
            .setName('game')
            .setDescription('ID do jogo específico')
            .setRequired(false)
        )
    ),

  async execute(interaction) {
    try {
      const subcommand = interaction.options.getSubcommand();

      if (!gamingManager) {
        return await interaction.reply({
          content: '❌ Sistema de gaming não está disponível.',
          ephemeral: true
        });
      }

      switch (subcommand) {
        case 'list':
          return await handleListGames(interaction);
        case 'play':
          return await handlePlayGame(interaction);
        case 'action':
          return await handleGameAction(interaction);
        case 'status':
          return await handleGameStatus(interaction);
        case 'ai':
          return await handleAIStats(interaction);
        default:
          return await interaction.reply({
            content: '❌ Subcomando não reconhecido.',
            ephemeral: true
          });
      }

    } catch (error) {
      logger.error('❌ Erro no comando gaming:', error);
      
      const errorMessage = error.message || 'Erro desconhecido';
      
      if (interaction.replied || interaction.deferred) {
        return await interaction.followUp({
          content: `❌ Erro: ${errorMessage}`,
          ephemeral: true
        });
      } else {
        return await interaction.reply({
          content: `❌ Erro: ${errorMessage}`,
          ephemeral: true
        });
      }
    }
  }
};

/**
 * Listar jogos disponíveis
 */
async function handleListGames(interaction) {
  try {
    const games = await gamingManager.getAvailableGames();
    
    if (games.length === 0) {
      return await interaction.reply({
        content: '📭 Nenhum jogo disponível no momento.',
        ephemeral: true
      });
    }

    const serverUrl = gamingManager.getGameServerUrl();
    
    const embed = new EmbedBuilder()
      .setTitle('🎮 Jogos Disponíveis')
      .setDescription([
        'Lista de jogos que podem ser executados pela IA',
        '',
        '🌐 **Portal de Jogos:**',
        `[Abrir Portal](${serverUrl})`,
        '',
        '💡 **Como usar:**',
        '• Use `/gaming play` para iniciar um jogo',
        '• A IA pode jogar automaticamente',
        '• Acesse o portal web para jogar manualmente'
      ].join('\n'))
      .setColor(0x00ff00)
      .setTimestamp();

    for (const game of games) {
      embed.addFields({
        name: `${game.name || game.gameId}`,
        value: [
          `**ID:** \`${game.gameId}\``,
          `**Tipo:** ${game.type}`,
          `**Descrição:** ${game.description || 'Sem descrição'}`,
          game.url ? `**URL:** ${game.url}` : ''
        ].filter(Boolean).join('\n'),
        inline: true
      });
    }

    // Adicionar botões para jogos populares
    const row = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setURL(serverUrl)
          .setLabel('🌐 Abrir Portal')
          .setStyle(ButtonStyle.Link),
        new ButtonBuilder()
          .setCustomId('gaming_browser_example')
          .setLabel('🕸️ Exemplo Browser')
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId('gaming_custom_url')
          .setLabel('🔗 URL Personalizada')
          .setStyle(ButtonStyle.Secondary)
      );

    await interaction.reply({
      embeds: [embed],
      components: [row],
      ephemeral: true
    });

  } catch (error) {
    logger.error('❌ Erro ao listar jogos:', error);
    throw error;
  }
}

/**
 * Iniciar jogo
 */
async function handlePlayGame(interaction) {
  try {
    const gameId = interaction.options.getString('game');
    const url = interaction.options.getString('url');
    const userId = interaction.user.id;

    await interaction.deferReply();

    // Verificar se usuário já tem sessão ativa
    const activeSessions = gamingManager.getActiveSessions();
    const userSession = activeSessions.find(s => s.userId === userId);
    
    if (userSession) {
      return await interaction.editReply({
        content: `⚠️ Você já tem uma sessão ativa no jogo **${userSession.gameId}**. Use \`/gaming action stop\` para parar primeiro.`
      });
    }

    // Configurações para o jogo
    const gameOptions = {};
    if (url) {
      gameOptions.url = url;
    }

    // Iniciar sessão
    const session = await gamingManager.startGameSession(userId, gameId, gameOptions);

    const embed = new EmbedBuilder()
      .setTitle('🎮 Jogo Iniciado!')
      .setDescription(`Sessão do jogo **${session.gameId}** iniciada com sucesso.`)
      .addFields(
        { name: '👤 Jogador', value: `<@${userId}>`, inline: true },
        { name: '🎯 Jogo', value: session.gameId, inline: true },
        { name: '⏰ Iniciado', value: `<t:${Math.floor(Date.now() / 1000)}:R>`, inline: true },
        { name: '🔧 Sessão ID', value: `\`${session.sessionId}\``, inline: false }
      )
      .setColor(0x00ff00)
      .setTimestamp();

    if (url) {
      embed.addFields({ name: '🔗 URL', value: url, inline: false });
    }

    // Botões de controle
    const row = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId(`gaming_screenshot_${session.sessionId}`)
          .setLabel('📸 Screenshot')
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId(`gaming_analyze_${session.sessionId}`)
          .setLabel('🔍 Analisar')
          .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId(`gaming_ai_suggest_${session.sessionId}`)
          .setLabel('🤖 IA Sugerir')
          .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
          .setCustomId(`gaming_stop_${session.sessionId}`)
          .setLabel('🛑 Parar')
          .setStyle(ButtonStyle.Danger)
      );

    await interaction.editReply({
      embeds: [embed],
      components: [row]
    });

  } catch (error) {
    logger.error('❌ Erro ao iniciar jogo:', error);
    await interaction.editReply({
      content: `❌ Erro ao iniciar jogo: ${error.message}`
    });
  }
}

/**
 * Executar ação no jogo
 */
async function handleGameAction(interaction) {
  try {
    const action = interaction.options.getString('action');
    const dataString = interaction.options.getString('data');
    const userId = interaction.user.id;

    await interaction.deferReply();

    // Encontrar sessão ativa do usuário
    const activeSessions = gamingManager.getActiveSessions();
    const userSession = activeSessions.find(s => s.userId === userId);
    
    if (!userSession) {
      return await interaction.editReply({
        content: '❌ Você não tem nenhuma sessão de jogo ativa. Use `/gaming play` para iniciar um jogo.'
      });
    }

    let actionData = {};
    if (dataString) {
      try {
        actionData = JSON.parse(dataString);
      } catch (e) {
        return await interaction.editReply({
          content: '❌ Dados inválidos. Deve ser um JSON válido.'
        });
      }
    }

    let result;

    // Ações especiais
    switch (action) {
      case 'pause':
        result = await gamingManager.pauseSession(userSession.sessionId);
        break;
      case 'resume':
        result = await gamingManager.resumeSession(userSession.sessionId);
        break;
      case 'stop':
        result = await gamingManager.endSession(userSession.sessionId, 'user_request');
        break;
      default:
        result = await gamingManager.processUserAction(userSession.sessionId, action, actionData);
    }

    // Criar resposta
    const embed = new EmbedBuilder()
      .setTitle(`🎮 Ação: ${action}`)
      .setColor(result.success ? 0x00ff00 : 0xff0000)
      .setTimestamp();

    if (result.success) {
      embed.setDescription(`✅ ${result.message || 'Ação executada com sucesso'}`);
      
      if (result.result && result.result.data) {
        embed.addFields({
          name: '📊 Resultado',
          value: `\`\`\`json\n${JSON.stringify(result.result.data, null, 2).slice(0, 1000)}\`\`\``,
          inline: false
        });
      }
      
      if (result.state) {
        embed.addFields(
          { name: '🎯 Pontuação', value: result.state.score.toString(), inline: true },
          { name: '⏱️ Ações', value: result.state.actions.toString(), inline: true },
          { name: '📈 Status', value: result.state.isRunning ? '▶️ Ativo' : '⏸️ Pausado', inline: true }
        );
      }
    } else {
      embed.setDescription(`❌ ${result.message || 'Falha ao executar ação'}`);
    }

    await interaction.editReply({ embeds: [embed] });

    // Se for screenshot, enviar imagem
    if (action === 'screenshot' && result.success && result.result?.data) {
      try {
        const screenshot = result.result.data;
        
        await interaction.followUp({
          content: '📸 **Screenshot capturado:**',
          files: [{
            attachment: screenshot,
            name: `screenshot-${Date.now()}.png`
          }]
        });
      } catch (error) {
        logger.error('❌ Erro ao enviar screenshot:', error);
      }
    }

  } catch (error) {
    logger.error('❌ Erro ao executar ação:', error);
    await interaction.editReply({
      content: `❌ Erro ao executar ação: ${error.message}`
    });
  }
}

/**
 * Ver status das sessões
 */
async function handleGameStatus(interaction) {
  try {
    const activeSessions = gamingManager.getActiveSessions();
    const completedSessions = gamingManager.getCompletedSessions();

    const embed = new EmbedBuilder()
      .setTitle('🎮 Status do Sistema de Gaming')
      .setColor(0x0099ff)
      .setTimestamp();

    // Sessões ativas
    if (activeSessions.length > 0) {
      const activeList = activeSessions.map(session => 
        `**${session.gameId}** - <@${session.userId}> (${session.sessionId.slice(0, 8)}...)`
      ).join('\n');
      
      embed.addFields({
        name: `🟢 Sessões Ativas (${activeSessions.length})`,
        value: activeList,
        inline: false
      });
    } else {
      embed.addFields({
        name: '🟢 Sessões Ativas',
        value: 'Nenhuma sessão ativa',
        inline: false
      });
    }

    // Estatísticas gerais
    const stats = gamingManager.getStats();
    embed.addFields(
      { name: '📊 Total de Sessões', value: stats.totalSessions.toString(), inline: true },
      { name: '🎯 Sessões Concluídas', value: completedSessions.length.toString(), inline: true },
      { name: '🤖 IA Ativa', value: stats.aiEnabled ? '✅' : '❌', inline: true }
    );

    await interaction.reply({
      embeds: [embed],
      ephemeral: true
    });

  } catch (error) {
    logger.error('❌ Erro ao obter status:', error);
    throw error;
  }
}

/**
 * Ver estatísticas da IA
 */
async function handleAIStats(interaction) {
  try {
    const gameId = interaction.options.getString('game');
    const aiStats = await gamingManager.getAIStats(gameId);

    const embed = new EmbedBuilder()
      .setTitle('🤖 Estatísticas da IA')
      .setColor(0x9932cc)
      .setTimestamp();

    if (gameId) {
      // Estatísticas específicas do jogo
      const gameStats = aiStats.models[gameId];
      
      if (gameStats) {
        embed.setDescription(`Estatísticas para o jogo **${gameId}**`);
        embed.addFields(
          { name: '🎮 Total de Jogos', value: gameStats.totalGames.toString(), inline: true },
          { name: '🎯 Total de Ações', value: gameStats.totalActions.toString(), inline: true },
          { name: '📈 Pontuação Média', value: gameStats.averageScore.toFixed(2), inline: true },
          { name: '🏆 Melhor Pontuação', value: gameStats.bestScore.toString(), inline: true },
          { name: '🧠 Padrões Detectados', value: gameStats.patterns.toString(), inline: true },
          { name: '📋 Estratégias', value: gameStats.strategies.toString(), inline: true }
        );
      } else {
        embed.setDescription(`Nenhum dado encontrado para o jogo **${gameId}**`);
      }
    } else {
      // Estatísticas gerais
      embed.setDescription('Estatísticas gerais da IA de gaming');
      embed.addFields(
        { name: '🔧 Status', value: aiStats.isReady ? '✅ Ativo' : '❌ Inativo', inline: true },
        { name: '📊 Total de Modelos', value: aiStats.totalModels.toString(), inline: true },
        { name: '🧠 Aprendizado', value: aiStats.learningEnabled ? '✅ Ativo' : '❌ Desabilitado', inline: true },
        { name: '🔍 Taxa de Exploração', value: `${(aiStats.explorationRate * 100).toFixed(1)}%`, inline: true }
      );

      // Lista de jogos com IA treinada
      if (aiStats.totalModels > 0) {
        const gamesList = Object.entries(aiStats.models)
          .map(([gameId, stats]) => `**${gameId}**: ${stats.totalGames} jogos, ${stats.totalActions} ações`)
          .join('\n');
        
        embed.addFields({
          name: '🎮 Jogos com IA Treinada',
          value: gamesList || 'Nenhum',
          inline: false
        });
      }
    }

    await interaction.reply({
      embeds: [embed],
      ephemeral: true
    });

  } catch (error) {
    logger.error('❌ Erro ao obter estatísticas da IA:', error);
    throw error;
  }
}