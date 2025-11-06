// Comando de habilidades para sistema de combate
import { getOrCreateDungeonRun } from "../../database/client.js";
import { combatEngine } from "../../game/combatEngine.js";
import { mobManager } from "../../game/mobManager.js";
import config from "../../config.js";

export default {
  name: "skill",
  aliases: ["skills", "habilidade", "hab"],
  description: "Lista suas habilidades ou usa uma habilidade específica em combate.",
  category: "dungeon",
  usage: "skill [nome da habilidade]",
  cooldown: 1000,
  
  async execute(client, message, args) {
    try {
      const discordId = message.author.id;
      
      // Verificar se há batalha ativa
      const battle = combatEngine.activeBattles.get(discordId);
      
      if (!args.length) {
        // Mostrar lista de habilidades
        return await this.showSkillList(message, battle);
      }

      // Usar habilidade específica
      if (!battle) {
        return message.reply({
          embeds: [{
            color: config.colors.warning,
            title: "⚠️ Nenhuma Batalha Ativa",
            description: "Você não está em combate no momento.\nUse `m.dungeon` para explorar e encontrar inimigos!",
            footer: { text: "Use m.skills para ver suas habilidades fora de combate" }
          }]
        });
      }

      const skillName = args.join(' ').toLowerCase();
      await this.useSkill(message, battle, skillName);
      
    } catch (error) {
      console.error("Erro no comando skill:", error);
      message.reply({
        embeds: [{
          color: config.colors.error,
          title: "❌ Erro nas Habilidades",
          description: "Ocorreu um erro ao processar habilidades. Tente novamente.",
          footer: { text: "Se o erro persistir, contate um administrador" }
        }]
      });
    }
  },

  async showSkillList(message, battle = null) {
    let skills = [];
    let playerLevel = 1;
    let playerClass = 'ADVENTURER';
    
    if (battle) {
      // Em combate - mostrar skills do player na batalha
      skills = battle.player.skills || [];
      playerLevel = battle.player.level || 1;
      playerClass = battle.player.playerClass || 'ADVENTURER';
    } else {
      // Fora de combate - mostrar skills baseadas na classe e nível
      const dungeonRun = await getOrCreateDungeonRun(message.author.id);
      playerLevel = dungeonRun.level || 1;
      playerClass = dungeonRun.playerClass || 'ADVENTURER';
      skills = this.getSkillsForClass(playerClass, playerLevel);
    }

    const embed = {
      color: config.colors.primary,
      title: `📚 Suas Habilidades - ${this.getClassName(playerClass)}`,
      description: `**Nível:** ${playerLevel}\n${battle ? '⚔️ **Em Combate**' : '🏠 **Fora de Combate**'}\n\n`,
      fields: [],
      footer: { 
        text: battle ? 
          "Use m.skill <nome> para usar uma habilidade" : 
          "Entre em combate para usar suas habilidades"
      }
    };

    if (skills.length === 0) {
      embed.description += "Você ainda não possui habilidades especiais.\nSuba de nível para desbloquear novas habilidades!";
      return message.reply({ embeds: [embed] });
    }

    // Agrupar skills por tipo
    const skillsByType = {
      'ATTACK': [],
      'HEAL': [],
      'BUFF': [],
      'DEBUFF': [],
      'SPECIAL': []
    };

    skills.forEach(skill => {
      const type = skill.type || 'SPECIAL';
      if (!skillsByType[type]) skillsByType[type] = [];
      skillsByType[type].push(skill);
    });

    // Adicionar fields para cada tipo
    for (const [type, typeSkills] of Object.entries(skillsByType)) {
      if (typeSkills.length === 0) continue;

      const typeIcon = this.getTypeIcon(type);
      const typeName = this.getTypeName(type);
      
      let skillText = '';
      typeSkills.forEach(skill => {
        const cooldownInfo = battle && battle.player.skillCooldowns[skill.id || skill.name] > 0 ? 
          ` ⏳(${battle.player.skillCooldowns[skill.id || skill.name]})` : '';
        
        skillText += `**${skill.name}**${cooldownInfo}\n`;
        skillText += `${skill.description || 'Habilidade especial'}\n`;
        
        // Info adicional da skill
        const info = [];
        if (skill.power) info.push(`⚔️ ${skill.power}`);
        if (skill.heal) info.push(`💚 +${skill.heal} HP`);
        if (skill.cost) info.push(`💙 ${skill.cost} MP`);
        if (skill.cooldown) info.push(`⏱️ ${skill.cooldown} turnos`);
        if (info.length > 0) skillText += `*${info.join(' • ')}*\n`;
        
        skillText += '\n';
      });

      embed.fields.push({
        name: `${typeIcon} ${typeName}`,
        value: skillText || 'Nenhuma habilidade deste tipo',
        inline: false
      });
    }

    await message.reply({ embeds: [embed] });
  },

  async useSkill(message, battle, skillName) {
    const { player } = battle;

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

    // Buscar habilidade
    const skill = this.findSkill(player.skills, skillName);
    if (!skill) {
      return message.reply({
        embeds: [{
          color: config.colors.error,
          title: "❌ Habilidade Não Encontrada",
          description: `Habilidade "${skillName}" não encontrada.\nUse \`m.skills\` para ver suas habilidades disponíveis.`,
          fields: [{
            name: "💡 Dica",
            value: "Você pode usar parte do nome da habilidade, como 'fogo' para 'Bola de Fogo'",
            inline: false
          }]
        }]
      });
    }

    // Verificar cooldown
    const cooldownKey = skill.id || skill.name;
    if (player.skillCooldowns[cooldownKey] > 0) {
      return message.reply({
        embeds: [{
          color: config.colors.warning,
          title: "⏳ Habilidade em Cooldown",
          description: `**${skill.name}** ainda está em cooldown.\nTurnos restantes: **${player.skillCooldowns[cooldownKey]}**`,
          footer: { text: "Use outras habilidades ou ataque básico" }
        }]
      });
    }

    // Verificar custo de mana (se implementado)
    if (skill.cost && player.currentMp !== undefined && player.currentMp < skill.cost) {
      return message.reply({
        embeds: [{
          color: config.colors.warning,
          title: "💙 Mana Insuficiente",
          description: `**${skill.name}** requer **${skill.cost} MP**.\nMana atual: **${player.currentMp}/${player.maxMp || 100}**`,
          footer: { text: "Recupere mana ou use outras habilidades" }
        }]
      });
    }

    // Verificar se player pode usar skills (não atordoado, etc.)
    if (player.statusEffects.some(effect => effect.name === 'STUNNED')) {
      return message.reply({
        embeds: [{
          color: config.colors.warning,
          title: "💫 Atordoado",
          description: "Você está atordoado e não pode usar habilidades!",
          footer: { text: "Aguarde o efeito passar" }
        }]
      });
    }

    // Executar habilidade
    await this.executeSkill(message, battle, skill);
  },

  async executeSkill(message, battle, skill) {
    const { player, mob } = battle;
    
    // Consumir mana se necessário
    if (skill.cost && player.currentMp !== undefined) {
      player.currentMp = Math.max(0, player.currentMp - skill.cost);
    }

    let turnLog = [];
    turnLog.push(`✨ **${player.name || 'Você'}** usa **${skill.name}**!`);

    // Diferentes tipos de habilidades
    switch (skill.type) {
      case 'ATTACK':
        await this.executeAttackSkill(skill, player, mob, turnLog);
        break;
        
      case 'HEAL':
        await this.executeHealSkill(skill, player, turnLog);
        break;
        
      case 'BUFF':
        await this.executeBuffSkill(skill, player, turnLog);
        break;
        
      case 'DEBUFF':
        await this.executeDebuffSkill(skill, player, mob, turnLog);
        break;
        
      case 'SPECIAL':
        await this.executeSpecialSkill(skill, player, mob, turnLog);
        break;
        
      default:
        // Skill tipo padrão (ataque)
        await this.executeAttackSkill(skill, player, mob, turnLog);
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

    // Continuar batalha
    battle.turn++;
    const attackCommand = (await import('./attack.js')).default;
    await attackCommand.executeMobTurn(message, battle, turnLog);
  },

  async executeAttackSkill(skill, player, mob, turnLog) {
    const accuracy = skill.accuracy || 0.95;
    const evasion = mob.spd / 200;
    const finalAccuracy = Math.max(0.1, accuracy - evasion);

    if (Math.random() > finalAccuracy) {
      turnLog.push(`💨 **${skill.name}** errou o alvo!`);
      return;
    }

    const attackCommand = (await import('./attack.js')).default;
    const damageResult = attackCommand.calculateDamage(player, mob, skill);
    
    mob.currentHp = Math.max(0, mob.currentHp - damageResult.damage);
    
    let damageText = `🎯 Acertou! Causou **${damageResult.damage}** de dano!`;
    if (damageResult.critical) {
      damageText += ` 💥 **CRÍTICO!**`;
    }
    turnLog.push(damageText);

    // Status effects
    if (skill.statusChance) {
      for (const [statusName, chance] of Object.entries(skill.statusChance)) {
        if (Math.random() < chance) {
          attackCommand.applyStatusEffect(mob, statusName, 3);
          turnLog.push(`${attackCommand.getStatusIcon(statusName)} **${mob.name}** foi afetado por **${attackCommand.getStatusName(statusName)}**!`);
        }
      }
    }
  },

  async executeHealSkill(skill, player, turnLog) {
    const healAmount = skill.heal || Math.floor(skill.power * 1.5);
    const actualHeal = Math.min(healAmount, player.maxHp - player.currentHp);
    
    player.currentHp = Math.min(player.maxHp, player.currentHp + actualHeal);
    
    turnLog.push(`💚 Recuperou **${actualHeal}** pontos de vida!`);
    
    // Status de regeneração se especificado
    if (skill.statusChance?.REGENERATING) {
      const attackCommand = (await import('./attack.js')).default;
      attackCommand.applyStatusEffect(player, 'REGENERATING', 3);
      turnLog.push(`💚 Você está **regenerando**!`);
    }
  },

  async executeBuffSkill(skill, player, turnLog) {
    if (skill.selfBuff) {
      for (const [stat, multiplier] of Object.entries(skill.selfBuff)) {
        if (!player.buffs) player.buffs = {};
        if (!player.buffs[stat]) player.buffs[stat] = 1;
        
        const oldValue = player.buffs[stat];
        player.buffs[stat] *= multiplier;
        
        const improvement = Math.round((multiplier - 1) * 100);
        turnLog.push(`✨ **${stat.toUpperCase()}** aumentou em **${improvement}%**!`);
      }
    }

    // Status de blessed
    if (skill.statusChance?.BLESSED) {
      const attackCommand = (await import('./attack.js')).default;
      attackCommand.applyStatusEffect(player, 'BLESSED', 5);
      turnLog.push(`✨ Você foi **abençoado**!`);
    }
  },

  async executeDebuffSkill(skill, player, mob, turnLog) {
    const accuracy = skill.accuracy || 0.85;
    
    if (Math.random() > accuracy) {
      turnLog.push(`💨 **${skill.name}** falhou!`);
      return;
    }

    // Aplicar debuffs
    if (skill.statusChance) {
      for (const [statusName, chance] of Object.entries(skill.statusChance)) {
        if (Math.random() < chance) {
          const attackCommand = (await import('./attack.js')).default;
          attackCommand.applyStatusEffect(mob, statusName, 4);
          turnLog.push(`${attackCommand.getStatusIcon(statusName)} **${mob.name}** foi afetado por **${attackCommand.getStatusName(statusName)}**!`);
        }
      }
    }

    turnLog.push(`🎯 **${skill.name}** foi bem-sucedida!`);
  },

  async executeSpecialSkill(skill, player, mob, turnLog) {
    // Skills especiais personalizadas
    const skillId = skill.id || skill.name.toLowerCase().replace(/\s+/g, '_');
    
    switch (skillId) {
      case 'berserker_rage':
        player.buffs = player.buffs || {};
        player.buffs.atk = (player.buffs.atk || 1) * 1.5;
        player.buffs.spd = (player.buffs.spd || 1) * 1.2;
        turnLog.push(`🔥 Você entrou em **FÚRIA BERSERKER**!`);
        turnLog.push(`⚔️ Ataque aumentado em 50%! ⚡ Velocidade aumentada em 20%!`);
        break;
        
      default:
        // Skill especial genérica
        if (skill.power) {
          await this.executeAttackSkill(skill, player, mob, turnLog);
        } else if (skill.heal) {
          await this.executeHealSkill(skill, player, turnLog);
        } else {
          turnLog.push(`✨ **${skill.name}** teve um efeito misterioso...`);
        }
    }
  },

  async handleMobDefeat(message, battle, turnLog) {
    const attackCommand = (await import('./attack.js')).default;
    await attackCommand.handleMobDefeat(message, battle, turnLog);
  },

  findSkill(skills, skillName) {
    // Busca exata primeiro
    let skill = skills.find(s => 
      (s.name && s.name.toLowerCase() === skillName) ||
      (s.id && s.id.toLowerCase() === skillName)
    );
    
    if (skill) return skill;

    // Busca parcial
    skill = skills.find(s => 
      (s.name && s.name.toLowerCase().includes(skillName)) ||
      (s.id && s.id.toLowerCase().includes(skillName))
    );
    
    return skill;
  },

  getSkillsForClass(playerClass, level) {
    // Skills baseadas na classe e nível do jogador
    const baseSkills = [
      { id: 'basic_attack', name: 'Ataque Básico', type: 'ATTACK', power: 10, accuracy: 0.95, description: 'Ataque simples sem custo' }
    ];

    // Skills por classe
    const classSkills = {
      'ADVENTURER': [],
      'WARRIOR': [
        { id: 'power_strike', name: 'Golpe Poderoso', type: 'ATTACK', power: 15, cost: 5, cooldown: 2, description: 'Ataque mais forte que o normal' }
      ],
      'MAGE': [
        { id: 'magic_missile', name: 'Míssil Mágico', type: 'ATTACK', power: 12, cost: 8, cooldown: 1, description: 'Projétil mágico certeiro' },
        { id: 'heal_light', name: 'Luz Curativa', type: 'HEAL', heal: 25, cost: 12, cooldown: 3, description: 'Cura mágica poderosa' }
      ],
      'ROGUE': [
        { id: 'sneak_attack', name: 'Ataque Furtivo', type: 'ATTACK', power: 18, cost: 6, cooldown: 3, description: 'Ataque com chance alta de crítico' }
      ],
      'CLERIC': [
        { id: 'heal_light', name: 'Luz Curativa', type: 'HEAL', heal: 30, cost: 10, cooldown: 2, description: 'Cura divina' },
        { id: 'bless', name: 'Bênção', type: 'BUFF', cost: 8, cooldown: 4, statusChance: { 'BLESSED': 1.0 }, description: 'Aumenta poder de ataque' }
      ]
    };

    let skills = [...baseSkills];
    
    // Adicionar skills da classe
    const classSpecificSkills = classSkills[playerClass] || [];
    skills = skills.concat(classSpecificSkills);

    // Filtrar por nível (skills desbloqueadas)
    skills = skills.filter(skill => {
      const requiredLevel = skill.requiredLevel || 1;
      return level >= requiredLevel;
    });

    return skills;
  },

  getTypeIcon(type) {
    const icons = {
      'ATTACK': '⚔️',
      'HEAL': '💚',
      'BUFF': '✨',
      'DEBUFF': '💀',
      'SPECIAL': '🌟'
    };
    return icons[type] || '❓';
  },

  getTypeName(type) {
    const names = {
      'ATTACK': 'Ataques',
      'HEAL': 'Curas',
      'BUFF': 'Buffs',
      'DEBUFF': 'Debuffs',
      'SPECIAL': 'Especiais'
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
    return names[playerClass] || playerClass;
  }
};