// Comando m.board - Sistema de quests diárias por servidor
// Exibe board de quests, permite aceitar quests e ver progresso

import { questManager } from "../../game/questManager.js";
import { ensureUser, ensureGuild } from "../../database/utils.js";
import config from "../../config.js";

export default {
  name: "board",
  aliases: ["quest", "quests", "missoes"],
  description: "Sistema de quests diárias por servidor",
  category: "game",
  usage: "board [view|take|progress|claim|ranking] [argumentos]",
  cooldown: 3000,

  async execute(client, message, args) {
    try {
      const subcommand = args[0]?.toLowerCase() || "view";
      const userId = message.author.id;
      const guildId = message.guild?.id;

      if (!guildId) {
        return message.reply({
          embeds: [{
            color: config.colors.error,
            title: "❌ Erro",
            description: "Este comando só pode ser usado em servidores!"
          }]
        });
      }

      // Garantir que o usuário e servidor existem
      await ensureUser(userId, message.author.username);
      await ensureGuild(guildId, message.guild.name);

      // Garantir que o sistema de quests está inicializado
      if (!questManager.isInitialized) {
        await questManager.initialize();
      }

      switch (subcommand) {
        case "view":
        case "ver":
          await handleViewBoard(message, guildId);
          break;
        case "take":
        case "aceitar":
          await handleTakeQuest(message, userId, guildId, args.slice(1));
          break;
        case "progress":
        case "progresso":
          await handleProgress(message, userId, guildId);
          break;
        case "claim":
        case "reivindicar":
          await handleClaimReward(message, userId, guildId, args.slice(1));
          break;
        case "ranking":
        case "rank":
          await handleRanking(message, guildId, args.slice(1));
          break;
        default:
          await showBoardHelp(message);
          break;
      }
    } catch (error) {
      console.error("Erro no comando board:", error);
      
      const embed = {
        color: config.colors.error,
        title: "❌ Erro",
        description: "Ocorreu um erro ao processar sua solicitação. Tente novamente em alguns instantes."
      };

      await message.reply({ embeds: [embed] });
    }
  }
};

/**
 * Mostra o board de quests diárias do servidor
 */
async function handleViewBoard(message, guildId) {
  try {
    const board = await questManager.getDailyBoard(guildId);
    const questsData = board.questsData;

    if (!questsData || questsData.length === 0) {
      const embed = {
        color: config.colors.warning,
        title: "📋 Board de Quests",
        description: "Nenhuma quest disponível hoje. Tente novamente mais tarde!",
        timestamp: new Date().toISOString()
      };

      return await message.reply({ embeds: [embed] });
    }

    // Criar embed do board
    const embed = {
      color: config.colors.primary,
      title: "📋 Board de Quests Diárias",
      description: `**Servidor:** ${message.guild.name}\n**Data:** ${board.date.toLocaleDateString('pt-BR')}\n\n**Quests Disponíveis:**`,
      fields: [],
      timestamp: new Date().toISOString()
    };

    // Adicionar quests ao embed
    for (let i = 0; i < questsData.length; i++) {
      const quest = questsData[i];
      const difficultyEmoji = getDifficultyEmoji(quest.difficulty);
      const categoryEmoji = getCategoryEmoji(quest.category);
      
      embed.fields.push({
        name: `${i + 1}. ${categoryEmoji} ${quest.name} ${difficultyEmoji}`,
        value: `${quest.description}\n**Objetivo:** ${quest.targetValue} ${getTargetTypeText(quest.type, quest.targetType)}\n**Recompensas:** ${formatRewards(quest.rewards)}\n**ID:** \`${quest.instanceId}\``,
        inline: false
      });
    }

    embed.footer = { text: "Use m.board take <ID> para aceitar uma quest!" };

    await message.reply({ embeds: [embed] });
  } catch (error) {
    console.error("Erro ao mostrar board:", error);
    throw error;
  }
}

/**
 * Aceita uma quest do board
 */
async function handleTakeQuest(message, userId, guildId, args) {
  try {
    const questId = args[0];
    
    if (!questId) {
      return message.reply({
        embeds: [{
          color: config.colors.warning,
          title: "⚠️ ID necessário",
          description: "Você precisa especificar o ID da quest!\nUso: `m.board take <ID>`"
        }]
      });
    }
    
    const userQuest = await questManager.startQuest(userId, questId, guildId);
    
    const embed = {
      color: config.colors.success,
      title: "✅ Quest Aceita!",
      description: `Você aceitou a quest **${userQuest.quest.name}**!`,
      fields: [
        { name: "📝 Descrição", value: userQuest.quest.description, inline: false },
        { name: "🎯 Objetivo", value: `${userQuest.quest.targetValue} ${getTargetTypeText(userQuest.quest.type, userQuest.quest.targetType)}`, inline: true },
        { name: "💰 Recompensas", value: formatRewards(userQuest.quest.rewards), inline: true },
        { name: "📊 Progresso", value: `${userQuest.progress}/${userQuest.quest.targetValue}`, inline: true }
      ],
      footer: { text: "Use m.board progress para acompanhar seu progresso!" },
      timestamp: new Date().toISOString()
    };

    await message.reply({ embeds: [embed] });
  } catch (error) {
    if (error.message.includes("já está fazendo")) {
      const embed = {
        color: config.colors.warning,
        title: "⚠️ Quest já aceita",
        description: "Você já está fazendo esta quest! Use `m.board progress` para ver seu progresso.",
        timestamp: new Date().toISOString()
      };

      await message.reply({ embeds: [embed] });
    } else {
      throw error;
    }
  }
}

/**
 * Mostra progresso das quests ativas do usuário
 */
async function handleProgress(message, userId, guildId) {
  try {
    const { getPrisma } = await import("../../database/client.js");
    const prisma = getPrisma();

    const activeQuests = await prisma.userQuest.findMany({
      where: {
        userId,
        guildId,
        isCompleted: false
      },
      include: {
        quest: true
      }
    });

    const completedQuests = await prisma.userQuest.findMany({
      where: {
        userId,
        guildId,
        isCompleted: true,
        isRewardClaimed: false
      },
      include: {
        quest: true
      }
    });

    const embed = {
      color: config.colors.primary,
      title: "📊 Seu Progresso em Quests",
      description: `**Quests Ativas:** ${activeQuests.length}\n**Quests Concluídas (não reivindicadas):** ${completedQuests.length}`,
      fields: [],
      timestamp: new Date().toISOString()
    };

    if (activeQuests.length > 0) {
      const activeText = activeQuests.map(uq => {
        const progress = (uq.progress / uq.quest.targetValue * 100).toFixed(1);
        return `**${uq.quest.name}**\n${uq.progress}/${uq.quest.targetValue} (${progress}%)`;
      }).join('\n\n');

      embed.fields.push({
        name: "🔄 Quests em Andamento",
        value: activeText,
        inline: false
      });
    }

    if (completedQuests.length > 0) {
      const completedText = completedQuests.map(uq => {
        return `**${uq.quest.name}** ✅\n**Recompensas:** ${formatRewards(uq.quest.rewards)}\n**ID:** \`${uq.id}\``;
      }).join('\n\n');

      embed.fields.push({
        name: "🎉 Quests Concluídas",
        value: completedText,
        inline: false
      });
    }

    if (activeQuests.length === 0 && completedQuests.length === 0) {
      embed.description = "Você não tem quests ativas no momento.\nUse `m.board view` para ver as quests disponíveis!";
    }

    await message.reply({ embeds: [embed] });
  } catch (error) {
    console.error("Erro ao mostrar progresso:", error);
    throw error;
  }
}

/**
 * Reivindica recompensa de quest concluída
 */
async function handleClaimReward(message, userId, guildId, args) {
  try {
    const questId = args[0];
    
    if (!questId) {
      return message.reply({
        embeds: [{
          color: config.colors.warning,
          title: "⚠️ ID necessário",
          description: "Você precisa especificar o ID da quest!\nUso: `m.board claim <ID>`"
        }]
      });
    }
    
    const result = await questManager.claimQuestReward(userId, parseInt(questId), guildId);
    
    const embed = {
      color: config.colors.success,
      title: "🎉 Recompensa Reivindicada!",
      description: `Parabéns! Você concluiu a quest **${result.userQuest.quest.name}**!`,
      fields: [{
        name: "💰 Recompensas Recebidas",
        value: formatRewards(result.rewards),
        inline: false
      }],
      footer: { text: "Continue explorando para mais aventuras!" },
      timestamp: new Date().toISOString()
    };

    await message.reply({ embeds: [embed] });
  } catch (error) {
    if (error.message.includes("não pode ser reivindicada")) {
      const embed = {
        color: config.colors.warning,
        title: "⚠️ Recompensa indisponível",
        description: "Esta quest não pode ser reivindicada. Verifique se você concluiu a quest e ainda não reivindicou a recompensa.",
        timestamp: new Date().toISOString()
      };

      await message.reply({ embeds: [embed] });
    } else {
      throw error;
    }
  }
}

/**
 * Mostra ranking de quests do servidor
 */
async function handleRanking(message, guildId, args) {
  try {
    const period = args[0] || "total";
    const ranking = await questManager.getQuestRanking(guildId, period);

    const periodNames = {
      daily: "Diário",
      weekly: "Semanal", 
      total: "Total"
    };

    const embed = {
      color: config.colors.primary,
      title: `🏆 Ranking de Quests - ${periodNames[period]}`,
      description: `Top 10 jogadores em quests ${periodNames[period].toLowerCase()}`,
      fields: [],
      timestamp: new Date().toISOString()
    };

    if (ranking.length === 0) {
      embed.description = "Nenhum dado de ranking disponível ainda.\nComplete algumas quests para aparecer no ranking!";
    } else {
      const rankingText = ranking.map((entry, index) => {
        const medal = index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : `${index + 1}.`;
        const questCount = period === "daily" ? entry.dailyCompleted :
                          period === "weekly" ? entry.weeklyCompleted :
                          entry.totalCompleted;
        
        return `${medal} **${entry.username}**\n${questCount} quests • ${entry.totalXp} XP • ${entry.totalCoins} moedas`;
      }).join('\n\n');

      embed.fields.push({
        name: `📊 Ranking ${periodNames[period]}`,
        value: rankingText,
        inline: false
      });
    }

    await message.reply({ embeds: [embed] });
  } catch (error) {
    console.error("Erro ao mostrar ranking:", error);
    throw error;
  }
}

/**
 * Mostra ajuda do comando board
 */
async function showBoardHelp(message) {
  const embed = {
    color: config.colors.primary,
    title: "📋 Sistema de Quests - Ajuda",
    description: "Sistema de quests diárias por servidor",
    fields: [
      {
        name: "📋 Comandos Disponíveis",
        value: `\`m.board\` ou \`m.board view\` - Ver board de quests\n\`m.board take <ID>\` - Aceitar uma quest\n\`m.board progress\` - Ver seu progresso\n\`m.board claim <ID>\` - Reivindicar recompensa\n\`m.board ranking [daily|weekly|total]\` - Ver ranking`,
        inline: false
      },
      {
        name: "💡 Como Funciona",
        value: "• Novas quests são geradas diariamente\n• Complete objetivos para ganhar XP e moedas\n• Reivindicque recompensas ao completar quests\n• Compete com outros jogadores no ranking",
        inline: false
      }
    ],
    footer: { text: "Use m.board view para começar!" },
    timestamp: new Date().toISOString()
  };

  await message.reply({ embeds: [embed] });
}

// Funções utilitárias
function getDifficultyEmoji(difficulty) {
  const emojis = {
    EASY: "🟢",
    MEDIUM: "🟡", 
    HARD: "🔴",
    LEGENDARY: "🟣"
  };
  return emojis[difficulty] || "⚪";
}

function getCategoryEmoji(category) {
  const emojis = {
    COMBAT: "⚔️",
    EXPLORATION: "🗺️",
    COLLECTION: "📦",
    DAILY: "📅"
  };
  return emojis[category] || "❓";
}

function getTargetTypeText(type, targetType) {
  const typeTexts = {
    KILL_MOBS: `${targetType === "any" ? "monstros" : targetType}`,
    EXPLORE_ROOMS: "salas",
    COLLECT_ITEMS: `${targetType === "any" ? "itens" : targetType}`,
    EARN_COINS: "moedas",
    WIN_BATTLES: "batalhas",
    FIND_TREASURE: "tesouros",
    USE_COMMANDS: "comandos"
  };
  return typeTexts[type] || "objetivos";
}

function formatRewards(rewards) {
  const parts = [];
  if (rewards.xp) parts.push(`${rewards.xp} XP`);
  if (rewards.coins) parts.push(`${rewards.coins} moedas`);
  if (rewards.items && rewards.items.length > 0) {
    parts.push(`Itens: ${rewards.items.join(", ")}`);
  }
  return parts.join(" • ") || "Nenhuma";
}