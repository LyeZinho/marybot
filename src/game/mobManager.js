// Sistema de gerenciamento de mobs para dungeons
// Carrega e gerencia dados de mobs do arquivo JSON
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class MobManager {
  constructor() {
    this.mobData = null;
    this.mobsById = new Map();
    this.mobsByBiome = new Map();
    this.mobsByCategory = new Map();
    this.loaded = false;
  }

  /**
   * Carrega dados dos mobs do arquivo JSON
   */
  async loadMobData() {
    try {
      const dataPath = path.join(__dirname, '../data/mobs.json');
      const rawData = await fs.readFile(dataPath, 'utf8');
      this.mobData = JSON.parse(rawData);
      
      this.indexMobs();
      this.loaded = true;
      
      console.log(`✅ Carregados ${Object.keys(this.mobData.mobs).length} mobs`);
      return this.mobData;
    } catch (error) {
      console.error('❌ Erro ao carregar dados de mobs:', error);
      throw error;
    }
  }

  /**
   * Indexa mobs por diferentes critérios para busca rápida
   */
  indexMobs() {
    // Limpar índices existentes
    this.mobsById.clear();
    this.mobsByBiome.clear();
    this.mobsByCategory.clear();

    // Indexar por ID
    for (const [mobId, mobData] of Object.entries(this.mobData.mobs)) {
      this.mobsById.set(mobId, mobData);
    }

    // Indexar por bioma
    for (const [mobId, mobData] of Object.entries(this.mobData.mobs)) {
      for (const biome of mobData.biomes) {
        if (!this.mobsByBiome.has(biome)) {
          this.mobsByBiome.set(biome, []);
        }
        this.mobsByBiome.get(biome).push(mobId);
      }
    }

    // Indexar por categoria
    for (const [mobId, mobData] of Object.entries(this.mobData.mobs)) {
      const category = mobData.category;
      if (!this.mobsByCategory.has(category)) {
        this.mobsByCategory.set(category, []);
      }
      this.mobsByCategory.get(category).push(mobId);
    }
  }

  /**
   * Retorna um mob pelo ID
   * @param {string} mobId - ID do mob
   */
  getMobById(mobId) {
    this.ensureLoaded();
    return this.mobsById.get(mobId);
  }

  /**
   * Seleciona um mob aleatório para um bioma específico
   * @param {string} biome - Bioma da dungeon
   * @param {number} targetLevel - Nível alvo do jogador
   * @param {string} category - Categoria preferida (opcional)
   */
  getRandomMobForBiome(biome, targetLevel = 1, category = null) {
    this.ensureLoaded();
    
    let candidateMobs = this.mobsByBiome.get(biome) || [];
    
    // Filtrar por categoria se especificado
    if (category) {
      const categoryMobs = this.mobsByCategory.get(category) || [];
      candidateMobs = candidateMobs.filter(mobId => categoryMobs.includes(mobId));
    }

    // Filtrar por level range apropriado
    candidateMobs = candidateMobs.filter(mobId => {
      const mob = this.mobsById.get(mobId);
      const [minLevel, maxLevel] = mob.levelRange;
      return targetLevel >= minLevel - 2 && targetLevel <= maxLevel + 2;
    });

    // Se não há candidatos adequados, pegar qualquer mob do bioma
    if (candidateMobs.length === 0) {
      candidateMobs = this.mobsByBiome.get(biome) || [];
    }

    // Se ainda não há candidatos, pegar um mob básico qualquer
    if (candidateMobs.length === 0) {
      candidateMobs = this.mobsByCategory.get('BASIC') || [];
    }

    if (candidateMobs.length === 0) {
      throw new Error(`Nenhum mob encontrado para bioma ${biome}`);
    }

    // Selecionar aleatoriamente
    const randomIndex = Math.floor(Math.random() * candidateMobs.length);
    const selectedMobId = candidateMobs[randomIndex];
    
    return this.createMobInstance(selectedMobId, targetLevel);
  }

  /**
   * Cria uma instância de mob com stats calculados
   * @param {string} mobId - ID do mob template
   * @param {number} level - Nível do mob
   */
  createMobInstance(mobId, level = null) {
    this.ensureLoaded();
    
    const mobTemplate = this.mobsById.get(mobId);
    if (!mobTemplate) {
      throw new Error(`Mob não encontrado: ${mobId}`);
    }

    // Determinar nível do mob
    const [minLevel, maxLevel] = mobTemplate.levelRange;
    const mobLevel = level || Math.floor(Math.random() * (maxLevel - minLevel + 1)) + minLevel;

    // Aplicar modificadores de raridade
    const rarityMod = this.mobData.rarityModifiers[mobTemplate.rarity] || this.mobData.rarityModifiers.COMMON;

    // Calcular stats baseados no nível e raridade
    const calculatedStats = this.calculateMobStats(mobTemplate.baseStats, mobLevel, rarityMod);

    // Preparar skills do mob
    const skills = this.prepareMobSkills(mobTemplate.skills);

    // Criar instância do mob
    const mobInstance = {
      ...mobTemplate,
      level: mobLevel,
      ...calculatedStats,
      currentHp: calculatedStats.maxHp,
      skills: skills,
      statusEffects: [],
      skillCooldowns: {},
      aiPattern: this.mobData.aiPatterns[mobTemplate.aiPattern] || this.mobData.aiPatterns.PASSIVE,
      
      // Dados originais para referência
      template: mobTemplate,
      rarityModifier: rarityMod
    };

    return mobInstance;
  }

  /**
   * Calcula stats do mob baseado no nível e raridade
   */
  calculateMobStats(baseStats, level, rarityMod) {
    const levelMultiplier = 1 + ((level - 1) * 0.1); // 10% a mais por nível
    const rarityMultiplier = rarityMod.statMultiplier;

    return {
      maxHp: Math.floor(baseStats.hp * levelMultiplier * rarityMultiplier),
      hp: Math.floor(baseStats.hp * levelMultiplier * rarityMultiplier),
      atk: Math.floor(baseStats.atk * levelMultiplier * rarityMultiplier),
      def: Math.floor(baseStats.def * levelMultiplier * rarityMultiplier),
      spd: Math.floor(baseStats.spd * levelMultiplier * rarityMultiplier),
      lck: Math.floor(baseStats.lck * levelMultiplier * rarityMultiplier)
    };
  }

  /**
   * Prepara skills do mob para uso em combate
   */
  prepareMobSkills(skillIds) {
    return skillIds.map(skillId => {
      const skill = this.mobData.skills[skillId];
      if (!skill) {
        console.warn(`Skill não encontrada: ${skillId}`);
        return this.mobData.skills.basic_attack;
      }
      return { ...skill, id: skillId };
    }).filter(Boolean);
  }

  /**
   * Seleciona próxima skill para um mob usar baseado na IA
   * @param {Object} mob - Instância do mob
   * @param {Object} player - Dados do jogador
   * @param {Object} battleState - Estado atual da batalha
   */
  selectMobSkill(mob, player, battleState) {
    this.ensureLoaded();

    const aiPattern = mob.aiPattern;
    
    // Verificar se mob pode usar skills (não atordoado, etc.)
    if (mob.statusEffects.some(effect => effect.name === 'STUNNED')) {
      return null; // Mob perde o turno
    }

    // Skills disponíveis (não em cooldown)
    const availableSkills = mob.skills.filter(skill => {
      const cooldownKey = skill.id || skill.name;
      const cooldownRemaining = mob.skillCooldowns[cooldownKey] || 0;
      return cooldownRemaining <= 0;
    });

    if (availableSkills.length === 0) {
      return mob.skills.find(s => s.id === 'basic_attack') || mob.skills[0];
    }

    // Lógica específica por padrão de IA
    return this.selectSkillByAI(availableSkills, aiPattern, mob, player, battleState);
  }

  /**
   * Seleciona skill baseado no padrão de IA
   */
  selectSkillByAI(availableSkills, aiPattern, mob, player, battleState) {
    const shouldUseSkill = Math.random() < aiPattern.skillUsageChance;
    
    if (!shouldUseSkill) {
      return availableSkills.find(s => s.id === 'basic_attack') || availableSkills[0];
    }

    // Filtrar skills por tipo preferido
    const preferredSkills = availableSkills.filter(skill => {
      return aiPattern.preferredSkills.includes(skill.type) || 
             aiPattern.preferredSkills.includes(skill.id);
    });

    const skillPool = preferredSkills.length > 0 ? preferredSkills : availableSkills;

    // Lógicas específicas por tipo de IA
    switch (aiPattern.description || 'PASSIVE') {
      case 'BERSERKER':
        return this.selectBerserkerSkill(skillPool, mob, player);
      
      case 'SUPPORT':
        return this.selectSupportSkill(skillPool, mob, player);
      
      case 'BOSS':
        return this.selectBossSkill(skillPool, mob, player, battleState);
      
      default:
        return skillPool[Math.floor(Math.random() * skillPool.length)];
    }
  }

  selectBerserkerSkill(skillPool, mob, player) {
    const hpPercent = mob.currentHp / mob.maxHp;
    
    // Se HP baixo, ficar mais agressivo
    if (hpPercent < 0.3) {
      const attackSkills = skillPool.filter(s => s.type === 'ATTACK');
      return attackSkills.length > 0 ? 
        attackSkills[Math.floor(Math.random() * attackSkills.length)] :
        skillPool[Math.floor(Math.random() * skillPool.length)];
    }
    
    return skillPool[Math.floor(Math.random() * skillPool.length)];
  }

  selectSupportSkill(skillPool, mob, player) {
    const hpPercent = mob.currentHp / mob.maxHp;
    
    // Se HP baixo, priorizar cura
    if (hpPercent < 0.5) {
      const healSkills = skillPool.filter(s => s.type === 'HEAL');
      if (healSkills.length > 0) {
        return healSkills[Math.floor(Math.random() * healSkills.length)];
      }
    }
    
    return skillPool[Math.floor(Math.random() * skillPool.length)];
  }

  selectBossSkill(skillPool, mob, player, battleState) {
    const hpPercent = mob.currentHp / mob.maxHp;
    const phases = mob.aiPattern.phases || [];
    
    // Determinar fase atual
    let currentPhase = phases.find(phase => hpPercent <= phase.hpThreshold);
    if (!currentPhase && phases.length > 0) {
      currentPhase = phases[0];
    }
    
    // Usar comportamento da fase
    if (currentPhase) {
      const phaseBehavior = this.mobData.aiPatterns[currentPhase.behavior];
      if (phaseBehavior) {
        return this.selectSkillByAI(skillPool, phaseBehavior, mob, player, battleState);
      }
    }
    
    return skillPool[Math.floor(Math.random() * skillPool.length)];
  }

  /**
   * Gera loot para um mob derrotado
   * @param {Object} mob - Instância do mob derrotado
   * @param {number} playerLevel - Nível do jogador
   */
  generateLoot(mob, playerLevel = 1) {
    this.ensureLoaded();
    
    const loot = [];
    const rarityMod = mob.rarityModifier || this.mobData.rarityModifiers.COMMON;
    
    // Processar loot table
    for (const lootEntry of mob.lootTable) {
      const roll = Math.random();
      const adjustedChance = lootEntry.chance * rarityMod.lootMultiplier;
      
      if (roll < adjustedChance) {
        const quantity = Array.isArray(lootEntry.quantity) ? 
          Math.floor(Math.random() * (lootEntry.quantity[1] - lootEntry.quantity[0] + 1)) + lootEntry.quantity[0] :
          lootEntry.quantity;
          
        loot.push({
          item: lootEntry.item,
          quantity: quantity
        });
      }
    }

    // XP reward
    const [minXP, maxXP] = mob.xpReward;
    const xp = Math.floor(Math.random() * (maxXP - minXP + 1)) + minXP;
    const adjustedXP = Math.floor(xp * rarityMod.xpMultiplier);

    return {
      items: loot,
      xp: adjustedXP,
      mobName: mob.name,
      mobLevel: mob.level,
      rarity: mob.rarity
    };
  }

  /**
   * Retorna mobs disponíveis para um bioma específico
   */
  getMobsForBiome(biome) {
    this.ensureLoaded();
    const mobIds = this.mobsByBiome.get(biome) || [];
    return mobIds.map(id => this.mobsById.get(id)).filter(Boolean);
  }

  /**
   * Retorna todos os mobs de uma categoria
   */
  getMobsByCategory(category) {
    this.ensureLoaded();
    const mobIds = this.mobsByCategory.get(category) || [];
    return mobIds.map(id => this.mobsById.get(id)).filter(Boolean);
  }

  ensureLoaded() {
    if (!this.loaded) {
      throw new Error('MobManager não foi carregado. Chame loadMobData() primeiro.');
    }
  }

  /**
   * Retorna estatísticas dos mobs carregados
   */
  getStats() {
    this.ensureLoaded();
    
    const stats = {
      totalMobs: this.mobsById.size,
      mobsByBiome: {},
      mobsByCategory: {},
      mobsByRarity: {}
    };

    // Contagem por bioma
    for (const [biome, mobs] of this.mobsByBiome.entries()) {
      stats.mobsByBiome[biome] = mobs.length;
    }

    // Contagem por categoria
    for (const [category, mobs] of this.mobsByCategory.entries()) {
      stats.mobsByCategory[category] = mobs.length;
    }

    // Contagem por raridade
    for (const mob of this.mobsById.values()) {
      const rarity = mob.rarity;
      stats.mobsByRarity[rarity] = (stats.mobsByRarity[rarity] || 0) + 1;
    }

    return stats;
  }
}

// Instância global do gerenciador de mobs
export const mobManager = new MobManager();