// Comando de ataque para sistema de combate
import { getOrCreateDungeonRun } from "../../database/client.js";
import { combatEngine } from "../../game/combatEngine.js";
import { mobManager } from "../../game/mobManager.js";
import { combatRenderer } from "../../utils/combatRenderer.js";
import { questTracker } from "../../game/questTracker.js";
import { AttachmentBuilder } from "discord.js";
import config from "../../config.js";

export default {
  name: "attack",
  aliases: ["atk", "hit"],
  description: "Ataca o inimigo em combate com sua arma ou ataque básico.",
  category: "dungeon",
  usage: "attack [skill]",
  cooldown: 1000,
  
  async execute(client, message, args) {
    try {
      const discordId = message.author.id;
      
      // Verificar se há batalha ativa
      const battle = combatEngine.activeBattles.get(discordId);
      if (!battle) {
        return message.reply({
          embeds: [{
            color: config.colors.warning,
            title: "⚠️ Nenhuma Batalha Ativa",
            description: "Você não está em combate no momento.\nUse `m.dungeon` para explorar e encontrar inimigos!",
            footer: { text: "Use m.move para se mover pela dungeon" }
          }]
        });
      }

      // Verificar se é o turno do jogador
      const currentTurn = battle.turnOrder[0];
      if (currentTurn.type !== 'player') {
        return message.reply({
          embeds: [{
            color: config.colors.warning,
            title: "⏳ Aguarde Sua Vez",
            description: "Não é seu turno ainda!\nAguarde o inimigo terminar sua ação.",
            footer: { text: "Use m.status para ver o estado da batalha" }
          }]
        });
      }

      // Verificar se player pode atacar (não atordoado, etc.)
      if (battle.player.statusEffects.some(effect => effect.name === 'STUNNED')) {
        // Pular turno devido ao atordoamento
        await this.skipStunnedTurn(message, battle);
        return;
      }

      // Determinar skill a ser usada
      const skillName = args.join(' ').toLowerCase();
      const selectedSkill = this.selectPlayerSkill(battle.player, skillName);
      
      if (!selectedSkill) {
        return message.reply({
          embeds: [{
            color: config.colors.error,
            title: "❌ Skill Não Encontrada",
            description: `Skill "${skillName}" não encontrada ou não disponível.\nUse \`m.skills\` para ver suas habilidades disponíveis.`,
            footer: { text: "Use 'attack' sem argumentos para ataque básico" }
          }]
        });
      }

      // Verificar cooldown da skill
      const cooldownKey = selectedSkill.id || selectedSkill.name;
      if (battle.player.skillCooldowns[cooldownKey] > 0) {
        return message.reply({
          embeds: [{
            color: config.colors.warning,
            title: "⏳ Skill em Cooldown",
            description: `**${selectedSkill.name}** ainda está em cooldown.\nTurnos restantes: ${battle.player.skillCooldowns[cooldownKey]}`,
            footer: { text: "Use outras skills ou ataque básico" }
          }]
        });
      }

      // Executar ataque do jogador
      await this.executePlayerAttack(message, battle, selectedSkill);
      
    } catch (error) {
      console.error("Erro no comando attack:", error);
      message.reply({
        embeds: [{
          color: config.colors.error,
          title: "❌ Erro no Combate",
          description: "Ocorreu um erro durante o ataque. Tente novamente.",
          footer: { text: "Se o erro persistir, contate um administrador" }
        }]
      });
    }
  },

  selectPlayerSkill(player, skillName) {
    // Se não especificou skill, usar ataque básico
    if (!skillName) {
      return player.skills.find(s => s.id === 'basic_attack') || player.skills[0];
    }

    // Buscar skill por nome ou ID
    return player.skills.find(skill => 
      skill.name.toLowerCase().includes(skillName) || 
      (skill.id && skill.id.toLowerCase().includes(skillName))
    );
  },

  async executePlayerAttack(message, battle, skill) {
    const { player, mob } = battle;
    
    // Verificar se acerta o ataque
    const hitRoll = Math.random();
    const accuracy = skill.accuracy || 0.95;
    const evasion = mob.spd / 200; // Chance de esquiva baseada na velocidade
    const finalAccuracy = Math.max(0.1, accuracy - evasion);

    let turnLog = [];

    if (hitRoll > finalAccuracy) {
      // Errou o ataque
      turnLog.push(`💨 **${player.name || 'Você'}** tentou usar **${skill.name}**, mas errou!`);
      battle.logs.push(`💨 Ataque perdido! (${Math.round(hitRoll * 100)}% vs ${Math.round(finalAccuracy * 100)}%)`);
    } else {
      // Acertou o ataque
      const damageResult = this.calculateDamage(player, mob, skill);
      
      // Aplicar dano
      mob.currentHp = Math.max(0, mob.currentHp - damageResult.damage);
      
      // Log do ataque
      let attackLog = `⚔️ **${player.name || 'Você'}** usa **${skill.name}**!`;
      if (damageResult.critical) {
        attackLog += ` 💥 **CRÍTICO!**`;
      }
      turnLog.push(attackLog);
      turnLog.push(`🩸 Causou **${damageResult.damage}** de dano!`);
      
      battle.logs.push(`⚔️ ${skill.name} → ${damageResult.damage} dano${damageResult.critical ? ' (CRÍTICO!)' : ''}`);

      // Aplicar status effects se houver
      if (skill.statusChance) {
        for (const [statusName, chance] of Object.entries(skill.statusChance)) {
          if (Math.random() < chance) {
            this.applyStatusEffect(mob, statusName, 3); // 3 turnos de duração
            turnLog.push(`${this.getStatusIcon(statusName)} **${mob.name}** foi afetado por **${this.getStatusName(statusName)}**!`);
          }
        }
      }

      // Aplicar self-buffs se houver
      if (skill.selfBuff) {
        for (const [stat, multiplier] of Object.entries(skill.selfBuff)) {
          if (!player.buffs[stat]) player.buffs[stat] = 1;
          player.buffs[stat] *= multiplier;
          turnLog.push(`✨ **${player.name || 'Você'}** recebeu boost de **${stat.toUpperCase()}**!`);
        }
      }
    }

    // Aplicar cooldown
    const cooldownKey = skill.id || skill.name;
    if (skill.cooldown > 0) {
      player.skillCooldowns[cooldownKey] = skill.cooldown;
    }

    // Verificar se mob morreu
    if (mob.currentHp <= 0) {
      await this.handleMobDefeat(message, battle, turnLog);
      return;
    }

    // Avançar turno
    battle.turn++;
    
    // Turno do mob
    await this.executeMobTurn(message, battle, turnLog);
  },

  async executeMobTurn(message, battle, previousLog) {
    const { player, mob } = battle;
    
    // Processar status effects do mob
    this.processStatusEffects(mob);
    
    // Verificar se mob pode agir
    if (mob.statusEffects.some(effect => effect.name === 'STUNNED')) {
      previousLog.push(`💫 **${mob.name}** está atordoado e perde o turno!`);
      battle.turn++;
      await this.showBattleUpdate(message, battle, previousLog);
      return;
    }

    // Mob seleciona skill
    const mobSkill = mobManager.selectMobSkill(mob, player, battle);
    if (!mobSkill) {
      previousLog.push(`💤 **${mob.name}** não consegue agir!`);
      battle.turn++;
      await this.showBattleUpdate(message, battle, previousLog);
      return;
    }

    // Mob ataca
    const hitRoll = Math.random();
    const accuracy = mobSkill.accuracy || 0.90;
    const evasion = player.spd / 200;
    const finalAccuracy = Math.max(0.1, accuracy - evasion);

    if (hitRoll > finalAccuracy) {
      previousLog.push(`💨 **${mob.name}** tentou usar **${mobSkill.name}**, mas errou!`);
    } else {
      const damageResult = this.calculateDamage(mob, player, mobSkill);
      
      player.currentHp = Math.max(0, player.currentHp - damageResult.damage);
      
      let mobAttackLog = `👹 **${mob.name}** usa **${mobSkill.name}**!`;
      if (damageResult.critical) {
        mobAttackLog += ` 💥 **CRÍTICO!**`;
      }
      previousLog.push(mobAttackLog);
      previousLog.push(`💔 Você recebeu **${damageResult.damage}** de dano!`);

      // Status effects do mob
      if (mobSkill.statusChance) {
        for (const [statusName, chance] of Object.entries(mobSkill.statusChance)) {
          if (Math.random() < chance) {
            this.applyStatusEffect(player, statusName, 3);
            previousLog.push(`${this.getStatusIcon(statusName)} **Você** foi afetado por **${this.getStatusName(statusName)}**!`);
          }
        }
      }
    }

    // Verificar se player morreu
    if (player.currentHp <= 0) {
      await this.handlePlayerDefeat(message, battle, previousLog);
      return;
    }

    // Processar status effects do player
    this.processStatusEffects(player);

    // Reduzir cooldowns
    this.reduceCooldowns(player);
    this.reduceCooldowns(mob);

    battle.turn++;
    await this.showBattleUpdate(message, battle, previousLog);
  },

  calculateDamage(attacker, defender, skill) {
    const basePower = skill.power || 10;
    const attackStat = attacker.atk || 10;
    const defenseStat = defender.def || 0;
    
    // Fórmula de dano base
    let damage = Math.max(1, (attackStat * basePower / 10) - (defenseStat / 2));
    
    // Variação aleatória (±10%)
    const variation = damage * (Math.random() * 0.2 - 0.1);
    damage += variation;
    
    // Chance de crítico
    const criticalChance = (attacker.lck || 0) / 100;
    const isCritical = Math.random() < criticalChance;
    
    if (isCritical) {
      damage *= 1.5;
    }
    
    // Aplicar buffs do atacante
    if (attacker.buffs && attacker.buffs.atk) {
      damage *= attacker.buffs.atk;
    }
    
    return {
      damage: Math.floor(Math.max(1, damage)),
      critical: isCritical
    };
  },

  applyStatusEffect(target, statusName, duration) {
    // Remover efeito existente do mesmo tipo
    target.statusEffects = target.statusEffects.filter(effect => effect.name !== statusName);
    
    // Adicionar novo efeito
    target.statusEffects.push({
      name: statusName,
      duration: duration,
      appliedTurn: Date.now()
    });
  },

  processStatusEffects(entity) {
    const toRemove = [];
    
    for (let i = 0; i < entity.statusEffects.length; i++) {
      const effect = entity.statusEffects[i];
      
      // Aplicar efeito
      switch (effect.name) {
        case 'POISONED':
        case 'BURNED':
        case 'BLEEDING':
          const damage = Math.floor(entity.maxHp * 0.05);
          entity.currentHp = Math.max(0, entity.currentHp - damage);
          break;
          
        case 'REGENERATING':
          const heal = Math.floor(entity.maxHp * 0.05);
          entity.currentHp = Math.min(entity.maxHp, entity.currentHp + heal);
          break;
      }
      
      // Reduzir duração
      effect.duration--;
      if (effect.duration <= 0) {
        toRemove.push(i);
      }
    }
    
    // Remover efeitos expirados
    for (const index of toRemove.reverse()) {
      entity.statusEffects.splice(index, 1);
    }
  },

  reduceCooldowns(entity) {
    for (const skill in entity.skillCooldowns) {
      if (entity.skillCooldowns[skill] > 0) {
        entity.skillCooldowns[skill]--;
      }
    }
  },

  async skipStunnedTurn(message, battle) {
    battle.logs.push(`💫 Você está atordoado e perde o turno!`);
    battle.turn++;
    
    // Executar turno do mob
    await this.executeMobTurn(message, battle, [`💫 **${battle.player.name || 'Você'}** está atordoado e perde o turno!`]);
  },

  async handleMobDefeat(message, battle, turnLog) {
    const { player, mob } = battle;
    
    turnLog.push(`💀 **${mob.name}** foi derrotado!`);
    
    // Gerar loot
    const loot = mobManager.generateLoot(mob, player.level || 1);
    
    // Aplicar recompensas
    let rewardText = `\n🏆 **Recompensas:**\n`;
    rewardText += `✨ **${loot.xp} XP**\n`;
    
    if (loot.items.length > 0) {
      loot.items.forEach(item => {
        rewardText += `📦 **${item.item}** x${item.quantity}\n`;
      });
    }
    
    turnLog.push(rewardText);
    
    // Tracking de quests - registrar mob morto e batalha vencida
    try {
      const questActions = [
        {
          type: "mob_killed",
          data: {
            type: mob.type,
            name: mob.name,
            level: mob.level
          }
        },
        {
          type: "battle_won", 
          data: {
            enemyType: mob.type,
            enemyLevel: mob.level,
            difficulty: mob.difficulty || "normal"
          }
        }
      ];

      // Se ganhou moedas, registrar também
      if (loot.coins > 0) {
        questActions.push({
          type: "coins_earned",
          data: {
            amount: loot.coins,
            source: "combat"
          }
        });
      }

      // Se ganhou itens, registrar também  
      if (loot.items.length > 0) {
        questActions.push({
          type: "items_collected",
          data: loot.items.map(item => ({
            type: item.type || "unknown",
            name: item.item,
            quantity: item.quantity,
            rarity: item.rarity || "common"
          }))
        });
      }

      const completedQuests = await questTracker.trackCombinedAction(
        message.author.id, 
        message.guild.id, 
        questActions
      );

      // Processar notificações de quest em background
      if (completedQuests.length > 0) {
        setImmediate(() => {
          questTracker.processQuestNotifications(message, completedQuests);
        });
      }
    } catch (error) {
      console.error("Erro ao rastrear progresso de quest:", error);
    }
    
    // Limpar batalha
    combatEngine.activeBattles.delete(message.author.id);
    
    // Mostrar resultado final
    await this.showBattleEnd(message, battle, turnLog, 'victory');
  },

  async handlePlayerDefeat(message, battle, turnLog) {
    turnLog.push(`💀 **Você foi derrotado!**`);
    turnLog.push(`🏥 Você foi transportado para um local seguro...`);
    
    // Limpar batalha
    combatEngine.activeBattles.delete(message.author.id);
    
    // Mostrar resultado final
    await this.showBattleEnd(message, battle, turnLog, 'defeat');
  },

  async showBattleUpdate(message, battle, logs) {
    try {
      // Determinar bioma para tema visual
      const dungeonRun = await getOrCreateDungeonRun(message.author.id);
      const biome = dungeonRun.mapData?.biome || 'default';
      
      // Gerar imagem da batalha
      const battleImage = await combatRenderer.generateBattleImage(battle, biome, {
        showLogs: true,
        logCount: 4
      });
      
      const attachment = new AttachmentBuilder(battleImage, { name: 'battle.png' });
      
      // Criar embed com informações da batalha
      const embed = {
        color: config.colors.primary,
        title: `⚔️ ${battle.mob.name} vs ${battle.player.name || 'Você'}`,
        description: logs.join('\n'),
        image: { url: 'attachment://battle.png' },
        fields: [
          {
            name: "👤 Sua Vida",
            value: `${battle.player.currentHp}/${battle.player.maxHp} HP`,
            inline: true
          },
          {
            name: "👹 Vida do Inimigo",
            value: `${battle.mob.currentHp}/${battle.mob.maxHp} HP`,
            inline: true
          },
          {
            name: "🎯 Próxima Ação",
            value: "Use `m.attack`, `m.skill`, ou `m.run`",
            inline: false
          }
        ],
        footer: { text: `Turno ${battle.turn} • Use m.status para mais detalhes` }
      };
      
      await message.reply({ embeds: [embed], files: [attachment] });
      
    } catch (error) {
      console.error('Erro ao mostrar atualização da batalha:', error);
      
      // Fallback para embed simples
      const embed = {
        color: config.colors.primary,
        title: `⚔️ Batalha em Andamento`,
        description: logs.join('\n'),
        fields: [
          {
            name: "👤 Você",
            value: `${battle.player.currentHp}/${battle.player.maxHp} HP`,
            inline: true
          },
          {
            name: "👹 " + battle.mob.name,
            value: `${battle.mob.currentHp}/${battle.mob.maxHp} HP`,
            inline: true
          }
        ]
      };
      
      await message.reply({ embeds: [embed] });
    }
  },

  async showBattleEnd(message, battle, logs, result) {
    const embed = {
      color: result === 'victory' ? config.colors.success : config.colors.error,
      title: result === 'victory' ? '🎉 Vitória!' : '💀 Derrota!',
      description: logs.join('\n'),
      footer: { text: "A batalha terminou" }
    };
    
    await message.reply({ embeds: [embed] });
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
  }
};