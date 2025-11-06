// Motor de combate para o sistema de dungeon
// Gerencia turnos, dano, skills, status effects e IA de mobs

export class CombatEngine {
  constructor() {
    this.activeBattles = new Map(); // userId -> BattleState
  }

  // Inicia uma nova batalha
  async startBattle(player, mob, dungeonRunId = null) {
    const battleState = {
      id: this.generateBattleId(),
      player: this.prepareEntity(player, 'player'),
      mob: this.prepareEntity(mob, 'mob'),
      turn: 1,
      logs: [],
      turnOrder: [],
      dungeonRunId,
      startTime: Date.now()
    };

    // Determinar ordem dos turnos baseada na velocidade
    battleState.turnOrder = this.calculateTurnOrder(battleState.player, battleState.mob);
    
    this.activeBattles.set(player.discordId, battleState);
    
    battleState.logs.push(`💀 **${mob.name}** aparece para batalha!`);
    battleState.logs.push(`⚡ Ordem dos turnos: ${battleState.turnOrder.map(e => e.name).join(' → ')}`);
    
    return battleState;
  }

  prepareEntity(entity, type) {
    const prepared = {
      ...entity,
      type,
      currentHp: entity.hp || entity.maxHp || entity.baseHp,
      maxHp: entity.maxHp || entity.baseHp,
      statusEffects: [],
      skillCooldowns: {},
      buffs: {},
      originalStats: { ...entity }
    };

    // Normalizar stats para formato padrão
    if (type === 'mob') {
      prepared.atk = entity.baseAtk || entity.atk;
      prepared.def = entity.baseDef || entity.def;
      prepared.spd = entity.baseSpd || entity.spd;
      prepared.lck = entity.baseLck || entity.lck;
    }

    return prepared;
  }

  calculateTurnOrder(player, mob) {
    const entities = [player, mob];
    return entities.sort((a, b) => (b.spd || 0) - (a.spd || 0));
  }

  generateBattleId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  // Executa um turno de combate
  async executeTurn(userId, action) {
    const battle = this.activeBattles.get(userId);
    if (!battle) throw new Error('Nenhuma batalha ativa encontrada');

    const currentEntity = battle.turnOrder[0];
    let result = null;

    if (currentEntity.type === 'player') {
      result = await this.executePlayerAction(battle, action);
    } else {
      result = await this.executeMobAction(battle);
    }

    // Processar status effects
    this.processStatusEffects(battle);

    // Verificar condições de vitória/derrota
    const battleResult = this.checkBattleEnd(battle);
    if (battleResult) {
      this.activeBattles.delete(userId);
      return { ...result, battleEnded: true, result: battleResult };
    }

    // Avançar para próximo turno
    this.advanceTurn(battle);

    // Se agora é o turno do mob, executar automaticamente
    if (battle.turnOrder[0].type === 'mob') {
      const mobResult = await this.executeMobAction(battle);
      result.logs = result.logs.concat(mobResult.logs);
      
      // Processar status effects novamente
      this.processStatusEffects(battle);
      
      // Verificar novamente se batalha terminou
      const mobBattleResult = this.checkBattleEnd(battle);
      if (mobBattleResult) {
        this.activeBattles.delete(userId);
        return { ...result, battleEnded: true, result: mobBattleResult };
      }
      
      // Avançar turno após ação do mob
      this.advanceTurn(battle);
    }

    return { ...result, battleEnded: false };
  }

  async executePlayerAction(battle, action) {
    const { player, mob } = battle;
    const logs = [];

    switch (action.type) {
      case 'attack':
        return this.executeAttack(player, mob, logs, action.skillId);
      
      case 'skill':
        return this.executeSkill(player, mob, logs, action.skillId);
      
      case 'defend':
        return this.executeDefend(player, logs);
      
      case 'item':
        return this.useItem(player, logs, action.itemId);
      
      case 'flee':
        return this.attemptFlee(player, mob, logs);
      
      default:
        logs.push('❌ Ação inválida!');
        return { success: false, logs };
    }
  }

  async executeMobAction(battle) {
    const { mob, player } = battle;
    const logs = [];

    try {
      // IA simples do mob
      const availableSkills = mob.skills || ['basic_attack'];
      const skill = this.selectMobSkill(mob, player, availableSkills);

      // Executar ação do mob e registrar logs
      const result = this.executeAttack(mob, player, logs, skill);
      
      // Garantir que sempre há uma ação executada
      if (!result || !result.success) {
        // Fallback para ataque básico se nenhuma ação foi bem-sucedida
        logs.push(`🤖 ${mob.name} hesita e executa um ataque básico!`);
        return this.executeAttack(mob, player, logs, 'basic_attack');
      }
      
      return result;
    } catch (error) {
      console.error('Erro na execução do mob:', error);
      // Fallback de emergência
      logs.push(`🤖 ${mob.name} está confuso e ataca!`);
      return this.executeAttack(mob, player, logs, 'basic_attack');
    }
  }

  executeAttack(attacker, defender, logs, skillId = 'basic_attack') {
    const skill = this.getSkill(skillId);
    
    // Verificar cooldown
    if (attacker.skillCooldowns[skillId] > 0) {
      logs.push(`❌ ${attacker.name} não pode usar ${skill.name} ainda! (Cooldown: ${attacker.skillCooldowns[skillId]} turnos)`);
      return { success: false, logs };
    }

    // Verificar acerto
    if (!this.checkHit(attacker, defender, skill)) {
      logs.push(`💨 ${attacker.name} errou o ataque!`);
      return { success: true, logs };
    }

    // Calcular dano
    const damage = this.calculateDamage(attacker, defender, skill);
    const isCritical = this.checkCritical(attacker);
    const finalDamage = Math.floor(damage * (isCritical ? 1.5 : 1));

    // Aplicar dano
    defender.currentHp = Math.max(0, defender.currentHp - finalDamage);

    logs.push(`⚔️ ${attacker.name} usa **${skill.name}** em ${defender.name}!`);
    logs.push(`💥 Causa **${finalDamage}** de dano${isCritical ? ' **CRÍTICO!**' : ''}!`);
    logs.push(`❤️ ${defender.name}: ${defender.currentHp}/${defender.maxHp} HP`);

    // Aplicar efeitos da skill
    if (skill.effects) {
      this.applySkillEffects(skill, attacker, defender, logs);
    }

    // Definir cooldown
    if (skill.cooldown > 0) {
      attacker.skillCooldowns[skillId] = skill.cooldown;
    }

    return { success: true, logs, damage: finalDamage, critical: isCritical };
  }

  executeSkill(attacker, defender, logs, skillId) {
    const skill = this.getSkill(skillId);
    
    if (skill.type === 'HEAL') {
      return this.executeHeal(attacker, logs, skill);
    } else if (skill.type === 'BUFF') {
      return this.executeBuff(attacker, logs, skill);
    } else if (skill.type === 'DEBUFF') {
      return this.executeDebuff(attacker, defender, logs, skill);
    } else {
      return this.executeAttack(attacker, defender, logs, skillId);
    }
  }

  executeHeal(target, logs, skill) {
    const healAmount = skill.heal + Math.floor(target.lck / 10);
    const actualHeal = Math.min(healAmount, target.maxHp - target.currentHp);
    
    target.currentHp += actualHeal;
    
    logs.push(`✨ ${target.name} usa **${skill.name}**!`);
    logs.push(`💚 Recupera **${actualHeal}** HP!`);
    logs.push(`❤️ ${target.name}: ${target.currentHp}/${target.maxHp} HP`);

    return { success: true, logs, heal: actualHeal };
  }

  executeDefend(player, logs) {
    // Aplicar buff de defesa temporário
    if (!player.buffs.defending) {
      player.buffs.defending = {
        name: 'Defendendo',
        defenseBonus: Math.floor(player.def * 0.5),
        duration: 1 // Dura apenas este turno
      };
      
      logs.push(`🛡️ **${player.name}** assume uma postura defensiva! (+${player.buffs.defending.defenseBonus} DEF)`);
    } else {
      logs.push(`🛡️ **${player.name}** continua se defendendo!`);
    }
    
    return { success: true, logs };
  }

  calculateDamage(attacker, defender, skill) {
    const baseDamage = (attacker.atk * (skill.power / 10)) - (defender.def / 2);
    const variation = baseDamage * (Math.random() * 0.2 - 0.1); // ±10%
    return Math.max(1, baseDamage + variation);
  }

  checkHit(attacker, defender, skill) {
    const baseAccuracy = skill.accuracy || 0.9;
    const evasion = (defender.spd || 0) / 200;
    const finalAccuracy = Math.max(0.1, baseAccuracy - evasion);
    return Math.random() < finalAccuracy;
  }

  checkCritical(attacker) {
    const critChance = (attacker.lck || 0) / 100;
    return Math.random() < critChance;
  }

  attemptFlee(player, mob, logs) {
    const fleeChance = (player.spd || 0) / ((mob.spd || 0) + 50);
    const success = Math.random() < Math.min(0.8, fleeChance);

    if (success) {
      logs.push(`🏃 ${player.name} conseguiu fugir da batalha!`);
      return { success: true, logs, fled: true };
    } else {
      logs.push(`❌ ${player.name} tentou fugir mas falhou!`);
      return { success: true, logs, fled: false };
    }
  }

  processStatusEffects(battle) {
    [battle.player, battle.mob].forEach(entity => {
      entity.statusEffects = entity.statusEffects.filter(effect => {
        this.applyStatusEffect(entity, effect, battle.logs);
        effect.duration--;
        return effect.duration > 0;
      });

      // Reduzir cooldowns
      Object.keys(entity.skillCooldowns).forEach(skillId => {
        if (entity.skillCooldowns[skillId] > 0) {
          entity.skillCooldowns[skillId]--;
        }
      });
    });
  }

  applyStatusEffect(entity, effect, logs) {
    switch (effect.type) {
      case 'POISONED':
        const poisonDamage = Math.floor(entity.maxHp * 0.05);
        entity.currentHp = Math.max(0, entity.currentHp - poisonDamage);
        logs.push(`☠️ ${entity.name} sofre ${poisonDamage} de dano por veneno!`);
        break;
      
      case 'BURNED':
        const burnDamage = Math.floor(entity.maxHp * 0.08);
        entity.currentHp = Math.max(0, entity.currentHp - burnDamage);
        logs.push(`🔥 ${entity.name} sofre ${burnDamage} de dano por queimadura!`);
        break;
      
      case 'REGENERATING':
        const healAmount = Math.floor(entity.maxHp * 0.1);
        entity.currentHp = Math.min(entity.maxHp, entity.currentHp + healAmount);
        logs.push(`💚 ${entity.name} regenera ${healAmount} HP!`);
        break;
    }
  }

  checkBattleEnd(battle) {
    if (battle.player.currentHp <= 0) {
      battle.logs.push(`💀 ${battle.player.name} foi derrotado!`);
      return { winner: 'mob', result: 'loss' };
    }
    
    if (battle.mob.currentHp <= 0) {
      battle.logs.push(`🏆 ${battle.player.name} venceu a batalha!`);
      return { winner: 'player', result: 'win' };
    }
    
    return null;
  }

  advanceTurn(battle) {
    battle.turn++;
    // Rotacionar ordem dos turnos
    battle.turnOrder.push(battle.turnOrder.shift());
  }

  selectMobSkill(mob, player, availableSkills) {
    // IA simples: usar skill mais poderosa disponível
    const skills = availableSkills.map(id => this.getSkill(id)).filter(s => s);
    
    if (skills.length === 0) return 'basic_attack';
    
    // Se HP baixo, tentar curar
    if (mob.currentHp < mob.maxHp * 0.3) {
      const healSkill = skills.find(s => s.type === 'HEAL');
      if (healSkill) return healSkill.id;
    }
    
    // Caso contrário, atacar
    const attackSkills = skills.filter(s => s.type === 'ATTACK' || !s.type);
    return attackSkills.length > 0 ? attackSkills[0].id : 'basic_attack';
  }

  getBattle(userId) {
    return this.activeBattles.get(userId);
  }

  endBattle(userId) {
    this.activeBattles.delete(userId);
  }

  // Skills básicas do sistema
  getSkill(skillId) {
    const skills = {
      'basic_attack': {
        id: 'basic_attack',
        name: 'Ataque Básico',
        type: 'ATTACK',
        power: 10,
        accuracy: 0.9,
        cooldown: 0
      },
      'heavy_strike': {
        id: 'heavy_strike',
        name: 'Golpe Pesado',
        type: 'ATTACK',
        power: 15,
        accuracy: 0.8,
        cooldown: 2
      },
      'heal': {
        id: 'heal',
        name: 'Cura',
        type: 'HEAL',
        heal: 25,
        cooldown: 3
      },
      'fire_ball': {
        id: 'fire_ball',
        name: 'Bola de Fogo',
        type: 'ATTACK',
        power: 12,
        accuracy: 0.85,
        cooldown: 1,
        effects: [{ type: 'BURNED', duration: 3, chance: 0.3 }]
      }
    };

    return skills[skillId] || skills['basic_attack'];
  }

  applySkillEffects(skill, attacker, defender, logs) {
    if (!skill.effects) return;

    skill.effects.forEach(effect => {
      if (Math.random() < (effect.chance || 1)) {
        defender.statusEffects.push({
          type: effect.type,
          duration: effect.duration || 3,
          source: attacker.name
        });
        logs.push(`✨ ${defender.name} fica ${this.getStatusEffectDescription(effect.type)}!`);
      }
    });
  }

  getStatusEffectDescription(effectType) {
    const descriptions = {
      'POISONED': 'envenenado',
      'BURNED': 'queimando',
      'FROZEN': 'congelado',
      'STUNNED': 'atordoado',
      'BLEEDING': 'sangrando',
      'REGENERATING': 'regenerando',
      'BLESSED': 'abençoado',
      'CURSED': 'amaldiçoado'
    };
    return descriptions[effectType] || 'afetado';
  }
}

// Instância global do motor de combate
export const combatEngine = new CombatEngine();