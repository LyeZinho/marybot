// Comando para mostrar estatísticas do jogador
import config from "../../config.js";
import { getOrCreateUser, getEquippedItems } from "../../database/client.js";
import { itemManager } from "../../game/itemManager.js";

export default {
  name: "stats",
  aliases: ["estatisticas", "status", "atributos"],
  description: "Mostra suas estatísticas atuais e efeitos dos equipamentos.",
  category: "dungeon",
  usage: "stats",
  cooldown: 3000,
  
  async execute(client, message, args) {
    try {
      const discordId = message.author.id;
      
      // Verificar se o ItemManager foi inicializado
      if (!itemManager.isInitialized()) {
        await itemManager.loadItemData();
      }

      // Buscar dados do usuário
      const user = await getOrCreateUser(discordId, message.author.tag);
      const equippedItems = await getEquippedItems(discordId);
      
      // Calcular estatísticas
      const baseStats = this.getBaseStats(user.playerClass || 'ADVENTURER', user.level || 1);
      const equipmentBonuses = this.calculateEquipmentBonuses(equippedItems);
      const finalStats = this.combinateStats(baseStats, equipmentBonuses);
      
      // Criar embed de estatísticas
      const embed = {
        color: config.colors.primary,
        title: `📊 Estatísticas - ${message.author.username}`,
        description: this.getPlayerDescription(user),
        fields: [
          {
            name: "⚔️ Atributos Primários",
            value: this.formatPrimaryStats(finalStats, equipmentBonuses),
            inline: true,
          },
          {
            name: "🛡️ Atributos Secundários",
            value: this.formatSecondaryStats(finalStats, equipmentBonuses),
            inline: true,
          },
          {
            name: "✨ Atributos Especiais",
            value: this.formatSpecialStats(finalStats, equipmentBonuses),
            inline: true,
          }
        ],
        footer: {
          text: `Classe: ${this.getClassName(user.playerClass)} • Level ${user.level || 1}`,
          icon_url: message.author.displayAvatarURL({ dynamic: true }),
        },
        timestamp: new Date().toISOString(),
      };

      // Adicionar informações sobre equipamentos
      if (equippedItems.length > 0) {
        const equipmentText = this.formatEquippedItems(equippedItems);
        embed.fields.push({
          name: "🎒 Equipamentos Ativos",
          value: equipmentText,
          inline: false,
        });
      }

      // Adicionar indicadores de performance
      const performance = this.calculatePerformanceRating(finalStats);
      embed.fields.push({
        name: "📈 Avaliação de Combate",
        value: this.formatPerformanceRating(performance),
        inline: false,
      });

      await message.reply({ embeds: [embed] });
      
    } catch (error) {
      console.error("Erro no comando stats:", error);
      
      const errorEmbed = {
        color: config.colors.error,
        title: `${config.emojis.error} Erro`,
        description: "Ocorreu um erro ao calcular suas estatísticas. Tente novamente.",
      };
      
      await message.reply({ embeds: [errorEmbed] });
    }
  },

  getBaseStats(playerClass, level) {
    const classBaseStats = {
      'ADVENTURER': { attack: 10, defense: 8, health: 100, mana: 50, speed: 12, critical: 5, luck: 10 },
      'WARRIOR': { attack: 15, defense: 12, health: 150, mana: 30, speed: 8, critical: 8, luck: 8 },
      'MAGE': { attack: 8, defense: 6, health: 80, mana: 120, speed: 10, critical: 12, luck: 15 },
      'ROGUE': { attack: 12, defense: 7, health: 90, mana: 60, speed: 18, critical: 20, luck: 12 },
      'CLERIC': { attack: 9, defense: 10, health: 120, mana: 100, speed: 9, critical: 6, luck: 18 }
    };

    const baseStats = classBaseStats[playerClass] || classBaseStats['ADVENTURER'];
    
    // Aplicar scaling por level
    const levelMultiplier = 1 + (level - 1) * 0.1; // 10% por level
    
    return {
      attack: Math.floor(baseStats.attack * levelMultiplier),
      defense: Math.floor(baseStats.defense * levelMultiplier),
      health: Math.floor(baseStats.health * levelMultiplier),
      mana: Math.floor(baseStats.mana * levelMultiplier),
      speed: Math.floor(baseStats.speed * levelMultiplier),
      critical: Math.floor(baseStats.critical * levelMultiplier),
      luck: Math.floor(baseStats.luck * levelMultiplier)
    };
  },

  calculateEquipmentBonuses(equippedItems) {
    const bonuses = {
      attack: 0, defense: 0, health: 0, mana: 0, 
      speed: 0, critical: 0, luck: 0
    };

    for (const equippedItem of equippedItems) {
      const itemData = itemManager.getItemById(equippedItem.itemId);
      if (!itemData || !itemData.effects) continue;

      for (const effect of itemData.effects) {
        const statType = effect.type.toLowerCase();
        if (bonuses.hasOwnProperty(statType)) {
          bonuses[statType] += effect.value;
        }
      }
    }

    return bonuses;
  },

  combinateStats(baseStats, bonuses) {
    const finalStats = {};
    
    for (const [stat, baseValue] of Object.entries(baseStats)) {
      finalStats[stat] = baseValue + (bonuses[stat] || 0);
    }
    
    return finalStats;
  },

  formatPrimaryStats(stats, bonuses) {
    return [
      `⚔️ **Ataque**: ${stats.attack}${this.getBonusText(bonuses.attack)}`,
      `🛡️ **Defesa**: ${stats.defense}${this.getBonusText(bonuses.defense)}`,
      `❤️ **Vida**: ${stats.health}${this.getBonusText(bonuses.health)}`
    ].join('\n');
  },

  formatSecondaryStats(stats, bonuses) {
    return [
      `💙 **Mana**: ${stats.mana}${this.getBonusText(bonuses.mana)}`,
      `💨 **Velocidade**: ${stats.speed}${this.getBonusText(bonuses.speed)}`
    ].join('\n');
  },

  formatSpecialStats(stats, bonuses) {
    return [
      `⚡ **Crítico**: ${stats.critical}%${this.getBonusText(bonuses.critical)}`,
      `🍀 **Sorte**: ${stats.luck}%${this.getBonusText(bonuses.luck)}`
    ].join('\n');
  },

  getBonusText(bonus) {
    if (bonus === 0) return '';
    return bonus > 0 ? ` (+${bonus})` : ` (${bonus})`;
  },

  formatEquippedItems(equippedItems) {
    return equippedItems
      .map(item => {
        const itemData = itemManager.getItemById(item.itemId);
        if (!itemData) return null;
        
        const rarity = itemManager.rarityTypes.get(itemData.rarity);
        const slot = this.getSlotIcon(item.equipSlot);
        
        return `${slot} ${rarity?.icon || '⚫'} **${itemData.name}**`;
      })
      .filter(Boolean)
      .join('\n') || 'Nenhum item equipado';
  },

  calculatePerformanceRating(stats) {
    // Calcular um score geral baseado nas estatísticas
    const combatPower = Math.floor((stats.attack * 2 + stats.defense) / 3);
    const survivability = Math.floor((stats.health + stats.defense * 10) / 11);
    const versatility = Math.floor((stats.speed + stats.critical + stats.luck) / 3);
    
    return {
      combatPower,
      survivability,
      versatility,
      overallRating: Math.floor((combatPower + survivability + versatility) / 3)
    };
  },

  formatPerformanceRating(performance) {
    const getRatingIcon = (value) => {
      if (value >= 50) return '🔥 Excelente';
      if (value >= 35) return '⭐ Ótimo';
      if (value >= 25) return '✨ Bom';
      if (value >= 15) return '💫 Regular';
      return '🌟 Iniciante';
    };

    return [
      `**Poder de Combate**: ${performance.combatPower} - ${getRatingIcon(performance.combatPower)}`,
      `**Sobrevivência**: ${performance.survivability} - ${getRatingIcon(performance.survivability)}`,
      `**Versatilidade**: ${performance.versatility} - ${getRatingIcon(performance.versatility)}`,
      `**Avaliação Geral**: ${performance.overallRating} - ${getRatingIcon(performance.overallRating)}`
    ].join('\n');
  },

  getPlayerDescription(user) {
    const className = this.getClassName(user.playerClass || 'ADVENTURER');
    const level = user.level || 1;
    const coins = user.coins || 0;
    const experience = user.experience || 0;
    
    return [
      `**Classe**: ${className}`,
      `**Level**: ${level} (${experience} XP)`,
      `**Moedas**: ${coins} 💰`
    ].join(' • ');
  },

  getClassName(playerClass) {
    const classNames = {
      'ADVENTURER': '🗡️ Aventureiro',
      'WARRIOR': '⚔️ Guerreiro',
      'MAGE': '🔮 Mago',
      'ROGUE': '🗡️ Ladino',
      'CLERIC': '✨ Clérigo'
    };
    return classNames[playerClass] || '🗡️ Aventureiro';
  },

  getSlotIcon(slot) {
    const slotIcons = {
      'WEAPON': '⚔️',
      'ARMOR': '🛡️',
      'ACCESSORY': '💍',
      'HELMET': '⛑️',
      'BOOTS': '👢',
      'GLOVES': '🧤'
    };
    return slotIcons[slot] || '📦';
  }
};