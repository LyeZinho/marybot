// Comando de status para sistema de combate e dungeon
import { getOrCreateDungeonRun } from "../../database/client.js";
import { combatEngine } from "../../game/combatEngine.js";
import { combatRenderer } from "../../utils/combatRenderer.js";
import { AttachmentBuilder } from "discord.js";
import config from "../../config.js";

export default {
  name: "status",
  aliases: ["st", "estado", "info"],
  description: "Mostra o status atual da batalha ou do jogador na dungeon.",
  category: "dungeon",
  usage: "status",
  cooldown: 1500,
  
  async execute(client, message, args) {
    try {
      const discordId = message.author.id;
      
      // Verificar se há batalha ativa
      const battle = combatEngine.activeBattles.get(discordId);
      
      if (battle) {
        // Status de batalha
        await this.showBattleStatus(message, battle);
      } else {
        // Status fora de combate
        await this.showDungeonStatus(message, discordId);
      }
      
    } catch (error) {
      console.error("Erro no comando status:", error);
      message.reply({
        embeds: [{
          color: config.colors.error,
          title: "❌ Erro no Status",
          description: "Ocorreu um erro ao verificar o status. Tente novamente.",
          footer: { text: "Se o erro persistir, contate um administrador" }
        }]
      });
    }
  },

  async showBattleStatus(message, battle) {
    try {
      const { player, mob, turn, logs } = battle;
      
      // Determinar de quem é o turno
      const currentTurn = battle.turnOrder[turn % battle.turnOrder.length];
      const isPlayerTurn = currentTurn.type === 'player';
      
      // Calcular porcentagens de HP
      const playerHpPercent = Math.round((player.currentHp / player.maxHp) * 100);
      const mobHpPercent = Math.round((mob.currentHp / mob.maxHp) * 100);
      
      // Gerar imagem rápida da batalha
      const dungeonRun = await getOrCreateDungeonRun(message.author.id);
      const biome = dungeonRun.mapData?.biome || 'default';
      
      let battleImage;
      try {
        battleImage = await combatRenderer.generateQuickStatus(player, mob, biome);
      } catch (imgError) {
        console.error('Erro ao gerar imagem de status:', imgError);
        battleImage = null;
      }
      
      const embed = {
        color: isPlayerTurn ? config.colors.success : config.colors.warning,
        title: `⚔️ Status da Batalha - Turno ${turn}`,
        description: `**${isPlayerTurn ? '🟢 SEU TURNO' : '🔴 TURNO DO INIMIGO'}**\n\n`,
        fields: [
          {
            name: "👤 Você",
            value: this.formatPlayerStatus(player, playerHpPercent),
            inline: true
          },
          {
            name: "👹 " + mob.name,
            value: this.formatMobStatus(mob, mobHpPercent),
            inline: true
          },
          {
            name: "⚡ Ações Disponíveis",
            value: isPlayerTurn ? 
              "`m.attack` - Atacar\n`m.skill` - Usar habilidade\n`m.run` - Tentar fugir" :
              "Aguarde o inimigo agir...",
            inline: false
          }
        ],
        footer: { 
          text: `Batalha iniciada há ${this.getTimeSince(battle.startTime)} • Use m.attack para agir` 
        }
      };

      // Adicionar status effects se houver
      const statusText = this.getStatusEffectsText(player, mob);
      if (statusText) {
        embed.fields.push({
          name: "🌟 Efeitos Ativos",
          value: statusText,
          inline: false
        });
      }

      // Adicionar logs recentes
      const recentLogs = logs.slice(-3);
      if (recentLogs.length > 0) {
        embed.fields.push({
          name: "📜 Últimas Ações",
          value: recentLogs.map(log => `• ${log.replace(/\*\*/g, '')}`).join('\n'),
          inline: false
        });
      }

      // Adicionar imagem se gerada com sucesso
      if (battleImage) {
        const attachment = new AttachmentBuilder(battleImage, { name: 'battle-status.png' });
        embed.image = { url: 'attachment://battle-status.png' };
        await message.reply({ embeds: [embed], files: [attachment] });
      } else {
        await message.reply({ embeds: [embed] });
      }
      
    } catch (error) {
      console.error('Erro ao mostrar status da batalha:', error);
      throw error;
    }
  },

  async showDungeonStatus(message, discordId) {
    try {
      const dungeonRun = await getOrCreateDungeonRun(discordId);
      
      if (!dungeonRun.mapData?.grid) {
        return message.reply({
          embeds: [{
            color: config.colors.warning,
            title: "🏠 Fora da Dungeon",
            description: "Você não está explorando uma dungeon no momento.\nUse `m.dungeon start` para começar uma nova aventura!",
            fields: [
              {
                name: "📊 Estatísticas Gerais",
                value: `**Nível:** ${dungeonRun.level || 1}\n**Classe:** ${this.getClassName(dungeonRun.playerClass)}\n**XP:** ${dungeonRun.xp || 0}`,
                inline: true
              },
              {
                name: "💰 Recursos",
                value: `**HP:** ${dungeonRun.health || 100}/100\n**Moedas:** ${dungeonRun.coins || 0}`,
                inline: true
              }
            ],
            footer: { text: "Use m.profile para ver mais detalhes" }
          }]
        });
      }

      // Status na dungeon
      const mapData = dungeonRun.mapData;
      const currentRoom = mapData.grid[dungeonRun.positionY][dungeonRun.positionX];
      
      const embed = {
        color: config.colors.primary,
        title: `🏰 Status na Dungeon - Andar ${dungeonRun.currentFloor}`,
        description: `**Bioma:** ${this.getBiomeName(mapData.biome)}\n**Seed:** \`${dungeonRun.seed}\`\n\n`,
        fields: [
          {
            name: "👤 Seu Status",
            value: `**HP:** ${dungeonRun.health}/100\n**Nível:** ${dungeonRun.level || 1}\n**Classe:** ${this.getClassName(dungeonRun.playerClass)}`,
            inline: true
          },
          {
            name: "📍 Localização",
            value: `**Posição:** (${dungeonRun.positionX}, ${dungeonRun.positionY})\n**Sala:** ${this.getRoomTypeName(currentRoom.type)}\n**Descoberta:** ${currentRoom.discovered ? 'Sim' : 'Não'}`,
            inline: true
          },
          {
            name: "🗺️ Progresso",
            value: `**Salas Exploradas:** ${this.countDiscoveredRooms(mapData.grid)}\n**Salas Totais:** ${mapData.size * mapData.size}\n**Progresso:** ${Math.round(dungeonRun.progress || 0)}%`,
            inline: false
          }
        ],
        footer: { text: "Use m.move, m.look, m.map para explorar • m.inventory para ver itens" }
      };

      // Adicionar informações da sala atual
      if (currentRoom.type !== 'EMPTY') {
        embed.fields.push({
          name: "🔍 Sala Atual",
          value: this.getRoomDescription(currentRoom, mapData.biome),
          inline: false
        });
      }

      // Adicionar direções disponíveis
      const exits = this.getAvailableExits(mapData.grid, dungeonRun.positionX, dungeonRun.positionY);
      if (exits.length > 0) {
        embed.fields.push({
          name: "🧭 Saídas Disponíveis",
          value: exits.map(exit => `**${this.getDirectionIcon(exit)}** ${this.getDirectionName(exit)}`).join(' • '),
          inline: false
        });
      }

      await message.reply({ embeds: [embed] });
      
    } catch (error) {
      console.error('Erro ao mostrar status da dungeon:', error);
      throw error;
    }
  },

  formatPlayerStatus(player, hpPercent) {
    let status = `**HP:** ${player.currentHp}/${player.maxHp} (${hpPercent}%)\n`;
    
    if (player.currentMp !== undefined) {
      const mpPercent = Math.round((player.currentMp / (player.maxMp || 100)) * 100);
      status += `**MP:** ${player.currentMp}/${player.maxMp || 100} (${mpPercent}%)\n`;
    }
    
    status += `**ATK:** ${Math.round(player.atk * (player.buffs?.atk || 1))}\n`;
    status += `**DEF:** ${Math.round(player.def * (player.buffs?.def || 1))}\n`;
    status += `**SPD:** ${Math.round(player.spd * (player.buffs?.spd || 1))}`;
    
    return status;
  },

  formatMobStatus(mob, hpPercent) {
    let status = `**HP:** ${mob.currentHp}/${mob.maxHp} (${hpPercent}%)\n`;
    status += `**Nível:** ${mob.level}\n`;
    status += `**Tipo:** ${mob.type}\n`;
    status += `**Raridade:** ${mob.rarity}`;
    
    return status;
  },

  getStatusEffectsText(player, mob) {
    let statusText = '';
    
    // Status do jogador
    if (player.statusEffects && player.statusEffects.length > 0) {
      const playerEffects = player.statusEffects.map(effect => 
        `${this.getStatusIcon(effect.name)} **${this.getStatusName(effect.name)}** (${effect.duration})`
      ).join('\n');
      statusText += `**👤 Você:**\n${playerEffects}\n\n`;
    }
    
    // Status do mob
    if (mob.statusEffects && mob.statusEffects.length > 0) {
      const mobEffects = mob.statusEffects.map(effect => 
        `${this.getStatusIcon(effect.name)} **${this.getStatusName(effect.name)}** (${effect.duration})`
      ).join('\n');
      statusText += `**👹 ${mob.name}:**\n${mobEffects}`;
    }
    
    return statusText;
  },

  countDiscoveredRooms(grid) {
    let count = 0;
    for (const row of grid) {
      for (const room of row) {
        if (room && room.discovered) {
          count++;
        }
      }
    }
    return count;
  },

  getAvailableExits(grid, x, y) {
    const exits = [];
    const directions = [
      { name: 'north', dx: 0, dy: -1 },
      { name: 'south', dx: 0, dy: 1 },
      { name: 'east', dx: 1, dy: 0 },
      { name: 'west', dx: -1, dy: 0 }
    ];
    
    for (const dir of directions) {
      const newX = x + dir.dx;
      const newY = y + dir.dy;
      
      if (newY >= 0 && newY < grid.length && 
          newX >= 0 && newX < grid[0].length && 
          grid[newY][newX]) {
        exits.push(dir.name);
      }
    }
    
    return exits;
  },

  getRoomDescription(room, biome) {
    const descriptions = {
      'MONSTER': '👹 Há uma criatura hostil nesta sala!',
      'TRAP': '⚠️ Esta sala contém armadilhas perigosas.',
      'LOOT': '💰 Há tesouros escondidos aqui.',
      'BOSS': '💀 O chefe do andar aguarda nesta sala!',
      'SHOP': '🏪 Um mercador misterioso oferece seus serviços.',
      'EVENT': '❓ Algo interessante está acontecendo aqui.',
      'EXIT': '🚪 A saída para o próximo andar!'
    };
    
    return descriptions[room.type] || '📍 Uma sala comum.';
  },

  getTimeSince(timestamp) {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ${seconds % 60}s`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ${minutes % 60}m`;
  },

  getDirectionIcon(direction) {
    const icons = {
      'north': '⬆️',
      'south': '⬇️',
      'east': '➡️',
      'west': '⬅️'
    };
    return icons[direction] || '❓';
  },

  getDirectionName(direction) {
    const names = {
      'north': 'Norte',
      'south': 'Sul',
      'east': 'Leste',
      'west': 'Oeste'
    };
    return names[direction] || direction;
  },

  getStatusIcon(statusName) {
    const icons = {
      'POISONED': '🟢', 'BURNED': '🔥', 'FROZEN': '🧊', 'STUNNED': '💫',
      'BLEEDING': '🩸', 'REGENERATING': '💚', 'BLESSED': '✨', 'CURSED': '💀',
      'HASTE': '⚡', 'SLOW': '🐌'
    };
    return icons[statusName] || '❓';
  },

  getStatusName(statusName) {
    const names = {
      'POISONED': 'Envenenado', 'BURNED': 'Queimando', 'FROZEN': 'Congelado',
      'STUNNED': 'Atordoado', 'BLEEDING': 'Sangrando', 'REGENERATING': 'Regenerando',
      'BLESSED': 'Abençoado', 'CURSED': 'Amaldiçoado', 'HASTE': 'Velocidade', 'SLOW': 'Lentidão'
    };
    return names[statusName] || statusName;
  },

  getBiomeName(biome) {
    const names = {
      'CRYPT': 'Cripta Sombria',
      'VOLCANO': 'Vulcão Ardente',
      'FOREST': 'Floresta Perdida',
      'GLACIER': 'Geleira Eterna',
      'RUINS': 'Ruínas Antigas',
      'ABYSS': 'Abismo Profundo'
    };
    return names[biome] || biome;
  },

  getRoomTypeName(type) {
    const names = {
      'EMPTY': 'Sala Vazia',
      'MONSTER': 'Covil de Monstros',
      'TRAP': 'Sala com Armadilhas',
      'EVENT': 'Sala de Eventos',
      'BOSS': 'Câmara do Chefe',
      'SHOP': 'Loja do Mercador',
      'LOOT': 'Câmara do Tesouro',
      'ENTRANCE': 'Entrada',
      'EXIT': 'Saída'
    };
    return names[type] || type;
  },

  getClassName(playerClass) {
    const names = {
      'ADVENTURER': 'Aventureiro',
      'WARRIOR': 'Guerreiro',
      'MAGE': 'Mago',
      'ROGUE': 'Ladino',
      'CLERIC': 'Clérigo',
      'PALADIN': 'Paladino',
      'NECROMANCER': 'Necromante',
      'NINJA': 'Ninja',
      'BERSERKER': 'Berserker',
      'ARCHMAGE': 'Arquimago'
    };
    return names[playerClass] || playerClass || 'Aventureiro';
  }
};