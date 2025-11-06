// Sistema de gerenciamento de quests diárias
// Gerencia criação, tracking e recompensas de quests por servidor

import { getPrisma } from "../database/client.js";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs/promises";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class QuestManager {
  constructor() {
    this.questTemplates = new Map();
    this.activeBoards = new Map(); // Cache dos boards ativos
    this.isInitialized = false;
  }

  /**
   * Inicializa o sistema de quests
   */
  async initialize() {
    try {
      await this.loadQuestTemplates();
      await this.ensureDailyBoards();
      this.isInitialized = true;
      console.log("✅ Sistema de quests inicializado com sucesso!");
    } catch (error) {
      console.error("❌ Erro ao inicializar sistema de quests:", error);
      throw error;
    }
  }

  /**
   * Carrega templates de quests do arquivo JSON
   */
  async loadQuestTemplates() {
    try {
      const questsPath = path.join(__dirname, "../data/quests.json");
      const questsData = await fs.readFile(questsPath, "utf8");
      const parsed = JSON.parse(questsData);
      
      // Indexar quests por categoria
      for (const quest of parsed.questTemplates) {
        this.questTemplates.set(quest.questId, quest);
      }
      
      console.log(`📋 Carregados ${this.questTemplates.size} templates de quest`);
    } catch (error) {
      console.error("❌ Erro ao carregar templates de quest:", error);
      throw error;
    }
  }

  /**
   * Garante que existe um board diário para todos os servidores
   */
  async ensureDailyBoards() {
    const prisma = getPrisma();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    try {
      // Buscar todos os servidores que já têm configurações
      const guilds = await prisma.guild.findMany({
        select: { id: true }
      });

      for (const guild of guilds) {
        await this.ensureDailyBoardForGuild(guild.id, today);
      }
    } catch (error) {
      console.error("❌ Erro ao garantir boards diários:", error);
    }
  }

  /**
   * Garante board diário para um servidor específico
   */
  async ensureDailyBoardForGuild(guildId, date = null) {
    const prisma = getPrisma();
    const targetDate = date || new Date();
    targetDate.setHours(0, 0, 0, 0);

    try {
      // Verificar se já existe board para hoje
      let board = await prisma.dailyQuestBoard.findUnique({
        where: {
          guildId_date: {
            guildId,
            date: targetDate
          }
        }
      });

      if (!board) {
        // Gerar quests diárias
        const dailyQuests = this.generateDailyQuests();
        
        board = await prisma.dailyQuestBoard.create({
          data: {
            guildId,
            date: targetDate,
            questsData: dailyQuests
          }
        });

        console.log(`📋 Board diário criado para servidor ${guildId}`);
      }

      // Cachear board
      this.activeBoards.set(`${guildId}_${targetDate.getTime()}`, board);
      return board;
    } catch (error) {
      console.error("❌ Erro ao criar board diário:", error);
      throw error;
    }
  }

  /**
   * Gera quests diárias aleatórias
   */
  generateDailyQuests() {
    const questCategories = [
      { category: "COMBAT", count: 2 },
      { category: "EXPLORATION", count: 2 },
      { category: "COLLECTION", count: 1 },
      { category: "DAILY", count: 1 }
    ];

    const dailyQuests = [];

    for (const { category, count } of questCategories) {
      const categoryQuests = Array.from(this.questTemplates.values())
        .filter(q => q.category === category);
      
      const shuffled = categoryQuests.sort(() => 0.5 - Math.random());
      const selected = shuffled.slice(0, count);
      
      for (const quest of selected) {
        dailyQuests.push({
          ...quest,
          instanceId: `${quest.questId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          targetValue: this.randomizeQuestTarget(quest)
        });
      }
    }

    return dailyQuests;
  }

  /**
   * Randomiza objetivos das quests para variedade
   */
  randomizeQuestTarget(quest) {
    const variations = {
      KILL_MOBS: [3, 5, 8, 10, 12],
      EXPLORE_ROOMS: [5, 8, 12, 15, 20],
      COLLECT_ITEMS: [3, 5, 7, 10],
      EARN_COINS: [50, 100, 150, 200],
      WIN_BATTLES: [2, 3, 5, 7],
      FIND_TREASURE: [1, 2, 3],
      USE_COMMANDS: [5, 10, 15, 20]
    };

    const options = variations[quest.type] || [quest.targetValue];
    return options[Math.floor(Math.random() * options.length)];
  }

  /**
   * Pega board diário de um servidor
   */
  async getDailyBoard(guildId, date = null) {
    const targetDate = date || new Date();
    targetDate.setHours(0, 0, 0, 0);
    
    const cacheKey = `${guildId}_${targetDate.getTime()}`;
    
    // Verificar cache primeiro
    if (this.activeBoards.has(cacheKey)) {
      return this.activeBoards.get(cacheKey);
    }

    // Buscar no banco ou criar
    return await this.ensureDailyBoardForGuild(guildId, targetDate);
  }

  /**
   * Pega quest ativa de um usuário
   */
  async getUserQuest(userId, questInstanceId, guildId) {
    const prisma = getPrisma();
    
    try {
      return await prisma.userQuest.findFirst({
        where: {
          userId,
          guildId,
          quest: {
            questId: questInstanceId
          }
        },
        include: {
          quest: true,
          board: true
        }
      });
    } catch (error) {
      console.error("❌ Erro ao buscar quest do usuário:", error);
      return null;
    }
  }

  /**
   * Inicia uma quest para um usuário
   */
  async startQuest(userId, questInstanceId, guildId) {
    const prisma = getPrisma();
    
    try {
      // Buscar board diário
      const board = await this.getDailyBoard(guildId);
      const questData = board.questsData.find(q => q.instanceId === questInstanceId);
      
      if (!questData) {
        throw new Error("Quest não encontrada no board diário");
      }

      // Verificar se já está fazendo esta quest
      const existing = await this.getUserQuest(userId, questData.questId, guildId);
      if (existing && !existing.isCompleted) {
        throw new Error("Você já está fazendo esta quest!");
      }

      // Buscar ou criar quest template no banco
      let quest = await prisma.quest.findUnique({
        where: { questId: questData.questId }
      });

      if (!quest) {
        quest = await prisma.quest.create({
          data: {
            questId: questData.questId,
            name: questData.name,
            description: questData.description,
            category: questData.category,
            type: questData.type,
            targetType: questData.targetType,
            targetValue: questData.targetValue,
            requirements: questData.requirements || {},
            rewards: questData.rewards,
            difficulty: questData.difficulty
          }
        });
      }

      // Criar user quest
      const userQuest = await prisma.userQuest.create({
        data: {
          userId,
          questId: quest.id,
          guildId,
          boardId: board.id,
          progress: 0
        },
        include: {
          quest: true
        }
      });

      return userQuest;
    } catch (error) {
      console.error("❌ Erro ao iniciar quest:", error);
      throw error;
    }
  }

  /**
   * Atualiza progresso de uma quest
   */
  async updateQuestProgress(userId, guildId, actionType, actionData = {}) {
    const prisma = getPrisma();
    
    try {
      // Buscar todas as quests ativas do usuário
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

      const updates = [];

      for (const userQuest of activeQuests) {
        const quest = userQuest.quest;
        let progressGain = 0;

        // Calcular progresso baseado no tipo de ação
        switch (quest.type) {
          case "KILL_MOBS":
            if (actionType === "mob_killed") {
              progressGain = 1;
            }
            break;
          
          case "EXPLORE_ROOMS":
            if (actionType === "room_explored") {
              progressGain = 1;
            }
            break;
          
          case "COLLECT_ITEMS":
            if (actionType === "item_collected") {
              progressGain = actionData.quantity || 1;
            }
            break;
          
          case "EARN_COINS":
            if (actionType === "coins_earned") {
              progressGain = actionData.amount || 0;
            }
            break;
          
          case "WIN_BATTLES":
            if (actionType === "battle_won") {
              progressGain = 1;
            }
            break;
          
          case "FIND_TREASURE":
            if (actionType === "treasure_found") {
              progressGain = 1;
            }
            break;
          
          case "USE_COMMANDS":
            if (actionType === "command_used") {
              progressGain = 1;
            }
            break;
        }

        if (progressGain > 0) {
          const newProgress = Math.min(userQuest.progress + progressGain, quest.targetValue);
          const isCompleted = newProgress >= quest.targetValue;

          await prisma.userQuest.update({
            where: { id: userQuest.id },
            data: {
              progress: newProgress,
              isCompleted,
              completedAt: isCompleted ? new Date() : null
            }
          });

          if (isCompleted) {
            updates.push({
              quest: quest,
              userQuest: { ...userQuest, progress: newProgress, isCompleted }
            });
          }
        }
      }

      return updates;
    } catch (error) {
      console.error("❌ Erro ao atualizar progresso:", error);
      return [];
    }
  }

  /**
   * Reivindica recompensas de uma quest
   */
  async claimQuestReward(userId, userQuestId, guildId) {
    const prisma = getPrisma();
    
    try {
      const userQuest = await prisma.userQuest.findUnique({
        where: { id: userQuestId },
        include: { quest: true, user: true }
      });

      if (!userQuest || !userQuest.isCompleted || userQuest.isRewardClaimed) {
        throw new Error("Quest não pode ser reivindicada");
      }

      const rewards = userQuest.quest.rewards;
      
      // Aplicar recompensas
      const userUpdates = {};
      if (rewards.coins) userUpdates.coins = { increment: rewards.coins };
      if (rewards.xp) userUpdates.xp = { increment: rewards.xp };

      await prisma.$transaction([
        // Atualizar usuário com recompensas
        prisma.user.update({
          where: { id: userId },
          data: userUpdates
        }),

        // Marcar quest como reivindicada
        prisma.userQuest.update({
          where: { id: userQuestId },
          data: {
            isRewardClaimed: true,
            claimedAt: new Date()
          }
        }),

        // Registrar conclusão
        prisma.questCompletion.create({
          data: {
            userId,
            questId: userQuest.quest.id,
            guildId,
            rewardXp: rewards.xp || 0,
            rewardCoins: rewards.coins || 0,
            rewardItems: rewards.items || null
          }
        }),

        // Atualizar ranking
        prisma.questRanking.upsert({
          where: {
            guildId_userId: { guildId, userId }
          },
          create: {
            guildId,
            userId,
            username: userQuest.user.username,
            dailyCompleted: 1,
            weeklyCompleted: 1,
            totalCompleted: 1,
            totalXp: rewards.xp || 0,
            totalCoins: rewards.coins || 0
          },
          update: {
            dailyCompleted: { increment: 1 },
            weeklyCompleted: { increment: 1 },
            totalCompleted: { increment: 1 },
            totalXp: { increment: rewards.xp || 0 },
            totalCoins: { increment: rewards.coins || 0 },
            lastUpdated: new Date()
          }
        })
      ]);

      return {
        success: true,
        rewards: rewards,
        userQuest: userQuest
      };
    } catch (error) {
      console.error("❌ Erro ao reivindicar recompensa:", error);
      throw error;
    }
  }

  /**
   * Pega ranking de quests de um servidor
   */
  async getQuestRanking(guildId, period = "total") {
    const prisma = getPrisma();
    
    try {
      const orderBy = period === "daily" ? { dailyCompleted: "desc" } :
                     period === "weekly" ? { weeklyCompleted: "desc" } :
                     { totalCompleted: "desc" };

      return await prisma.questRanking.findMany({
        where: { guildId },
        orderBy: [orderBy, { totalXp: "desc" }],
        take: 10
      });
    } catch (error) {
      console.error("❌ Erro ao buscar ranking:", error);
      return [];
    }
  }

  /**
   * Reseta contadores diários (executado diariamente)
   */
  async resetDailyCounters() {
    const prisma = getPrisma();
    
    try {
      await prisma.questRanking.updateMany({
        data: { dailyCompleted: 0 }
      });
      
      console.log("✅ Contadores diários resetados");
    } catch (error) {
      console.error("❌ Erro ao resetar contadores:", error);
    }
  }

  /**
   * Reseta contadores semanais (executado semanalmente)
   */
  async resetWeeklyCounters() {
    const prisma = getPrisma();
    
    try {
      await prisma.questRanking.updateMany({
        data: { weeklyCompleted: 0 }
      });
      
      console.log("✅ Contadores semanais resetados");
    } catch (error) {
      console.error("❌ Erro ao resetar contadores:", error);
    }
  }
}

// Instância global do gerenciador de quests
export const questManager = new QuestManager();