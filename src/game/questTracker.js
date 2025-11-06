// Sistema de hooks para tracking de quests
// Integra as ações do jogo com o progresso das quests

import { questManager } from "./questManager.js";

export class QuestTracker {
  constructor() {
    this.isEnabled = true;
  }

  /**
   * Ativa o tracking de quests
   */
  enable() {
    this.isEnabled = true;
  }

  /**
   * Desativa o tracking de quests
   */
  disable() {
    this.isEnabled = false;
  }

  /**
   * Registra que um mob foi morto
   */
  async trackMobKilled(userId, guildId, mobData) {
    if (!this.isEnabled || !questManager.isInitialized) return;

    try {
      const updates = await questManager.updateQuestProgress(userId, guildId, "mob_killed", {
        mobType: mobData.type || mobData.name?.toLowerCase(),
        mobName: mobData.name,
        mobLevel: mobData.level
      });

      // Retornar quests completadas para notificação
      return updates;
    } catch (error) {
      console.error("Erro ao rastrear mob morto:", error);
      return [];
    }
  }

  /**
   * Registra que uma sala foi explorada
   */
  async trackRoomExplored(userId, guildId, roomData) {
    if (!this.isEnabled || !questManager.isInitialized) return;

    try {
      const updates = await questManager.updateQuestProgress(userId, guildId, "room_explored", {
        roomType: roomData.type,
        biome: roomData.biome,
        isDangerous: roomData.hasMob || roomData.difficulty > 3
      });

      return updates;
    } catch (error) {
      console.error("Erro ao rastrear sala explorada:", error);
      return [];
    }
  }

  /**
   * Registra que itens foram coletados
   */
  async trackItemsCollected(userId, guildId, itemsData) {
    if (!this.isEnabled || !questManager.isInitialized) return;

    try {
      let updates = [];

      for (const item of itemsData) {
        const itemUpdates = await questManager.updateQuestProgress(userId, guildId, "item_collected", {
          itemType: item.type,
          itemName: item.name,
          quantity: item.quantity || 1,
          rarity: item.rarity
        });

        updates.push(...itemUpdates);
      }

      return updates;
    } catch (error) {
      console.error("Erro ao rastrear itens coletados:", error);
      return [];
    }
  }

  /**
   * Registra que moedas foram ganhas
   */
  async trackCoinsEarned(userId, guildId, amount, source = "unknown") {
    if (!this.isEnabled || !questManager.isInitialized) return;

    try {
      const updates = await questManager.updateQuestProgress(userId, guildId, "coins_earned", {
        amount: amount,
        source: source
      });

      return updates;
    } catch (error) {
      console.error("Erro ao rastrear moedas ganhas:", error);
      return [];
    }
  }

  /**
   * Registra que uma batalha foi vencida
   */
  async trackBattleWon(userId, guildId, battleData) {
    if (!this.isEnabled || !questManager.isInitialized) return;

    try {
      const updates = await questManager.updateQuestProgress(userId, guildId, "battle_won", {
        enemyType: battleData.enemyType,
        enemyLevel: battleData.enemyLevel,
        duration: battleData.duration,
        difficulty: battleData.difficulty
      });

      return updates;
    } catch (error) {
      console.error("Erro ao rastrear batalha vencida:", error);
      return [];
    }
  }

  /**
   * Registra que um tesouro foi encontrado
   */
  async trackTreasureFound(userId, guildId, treasureData) {
    if (!this.isEnabled || !questManager.isInitialized) return;

    try {
      const updates = await questManager.updateQuestProgress(userId, guildId, "treasure_found", {
        treasureType: treasureData.type,
        value: treasureData.value,
        rarity: treasureData.rarity
      });

      return updates;
    } catch (error) {
      console.error("Erro ao rastrear tesouro encontrado:", error);
      return [];
    }
  }

  /**
   * Registra que um comando foi usado
   */
  async trackCommandUsed(userId, guildId, commandName) {
    if (!this.isEnabled || !questManager.isInitialized) return;

    try {
      // Filtrar comandos que não contam para quests
      const excludedCommands = ["help", "ping", "board", "progress"];
      if (excludedCommands.includes(commandName)) return [];

      const updates = await questManager.updateQuestProgress(userId, guildId, "command_used", {
        command: commandName
      });

      return updates;
    } catch (error) {
      console.error("Erro ao rastrear comando usado:", error);
      return [];
    }
  }

  /**
   * Combina múltiplos eventos de uma ação
   */
  async trackCombinedAction(userId, guildId, actions) {
    if (!this.isEnabled || !questManager.isInitialized) return;

    try {
      let allUpdates = [];

      for (const action of actions) {
        let updates = [];

        switch (action.type) {
          case "mob_killed":
            updates = await this.trackMobKilled(userId, guildId, action.data);
            break;
          case "room_explored":
            updates = await this.trackRoomExplored(userId, guildId, action.data);
            break;
          case "items_collected":
            updates = await this.trackItemsCollected(userId, guildId, action.data);
            break;
          case "coins_earned":
            updates = await this.trackCoinsEarned(userId, guildId, action.data.amount, action.data.source);
            break;
          case "battle_won":
            updates = await this.trackBattleWon(userId, guildId, action.data);
            break;
          case "treasure_found":
            updates = await this.trackTreasureFound(userId, guildId, action.data);
            break;
          case "command_used":
            updates = await this.trackCommandUsed(userId, guildId, action.data.command);
            break;
        }

        allUpdates.push(...updates);
      }

      return allUpdates;
    } catch (error) {
      console.error("Erro ao rastrear ação combinada:", error);
      return [];
    }
  }

  /**
   * Gera notificação de quest completada
   */
  generateQuestCompletedNotification(completedQuests) {
    if (!completedQuests || completedQuests.length === 0) return null;

    const notifications = completedQuests.map(({ quest, userQuest }) => {
      return {
        title: "🎉 Quest Concluída!",
        description: `Você completou **${quest.name}**!`,
        fields: [
          {
            name: "📝 Descrição",
            value: quest.description,
            inline: false
          },
          {
            name: "💰 Recompensas",
            value: this.formatRewards(quest.rewards),
            inline: true
          }
        ],
        footer: "Use /board claim para reivindicar suas recompensas!"
      };
    });

    return notifications;
  }

  /**
   * Formata recompensas para exibição
   */
  formatRewards(rewards) {
    const parts = [];
    if (rewards.xp) parts.push(`${rewards.xp} XP`);
    if (rewards.coins) parts.push(`${rewards.coins} moedas`);
    if (rewards.items && rewards.items.length > 0) {
      parts.push(`Itens: ${rewards.items.join(", ")}`);
    }
    return parts.join(" • ") || "Nenhuma";
  }

  /**
   * Processa notificações de quest e envia se necessário
   */
  async processQuestNotifications(message, completedQuests) {
    if (!completedQuests || completedQuests.length === 0) return;

    try {
      const notifications = this.generateQuestCompletedNotification(completedQuests);
      
      if (notifications && notifications.length > 0) {
        // Enviar primeira notificação (se houver múltiplas, enviar apenas a primeira para não spam)
        const notification = notifications[0];
        
        const embed = {
          color: 0x00ff00, // Verde para quest completada
          title: notification.title,
          description: notification.description,
          fields: notification.fields,
          footer: { text: notification.footer },
          timestamp: new Date().toISOString()
        };

        // Enviar como reply ou mensagem separada
        try {
          await message.reply({ embeds: [embed] });
        } catch (error) {
          // Se falhar reply, enviar mensagem normal
          await message.channel.send({ embeds: [embed] });
        }
      }
    } catch (error) {
      console.error("Erro ao processar notificações de quest:", error);
    }
  }
}

// Instância global do tracker
export const questTracker = new QuestTracker();