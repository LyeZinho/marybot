// Comando para fugir de batalhas
import { combatEngine } from "../../game/combatEngine.js";
import config from "../../config.js";

export default {
  name: "run",
  aliases: ["flee", "escape", "fugir"],
  description: "Tenta fugir da batalha atual.",
  category: "dungeon",
  usage: "run",
  cooldown: 2000,
  
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
            description: "Você não está em combate no momento.\nNão há necessidade de fugir!",
            footer: { text: "Use m.dungeon para explorar" }
          }]
        });
      }

      // Verificar se é o turno do jogador
      const currentTurn = battle.turnOrder[battle.turn % battle.turnOrder.length];
      if (currentTurn.type !== 'player') {
        return message.reply({
          embeds: [{
            color: config.colors.warning,
            title: "⏳ Aguarde Sua Vez",
            description: "Não é seu turno ainda!\nAguarde o inimigo terminar sua ação para tentar fugir.",
            footer: { text: "Use m.status para ver o estado da batalha" }
          }]
        });
      }

      // Verificar se player pode fugir (não atordoado, etc.)
      if (battle.player.statusEffects.some(effect => effect.name === 'STUNNED')) {
        return message.reply({
          embeds: [{
            color: config.colors.warning,
            title: "💫 Atordoado",
            description: "Você está atordoado e não consegue fugir!\nAguarde o efeito passar.",
            footer: { text: "Use m.status para ver seus status effects" }
          }]
        });
      }

      // Tentar fugir
      await this.attemptEscape(message, battle);
      
    } catch (error) {
      console.error("Erro no comando run:", error);
      message.reply({
        embeds: [{
          color: config.colors.error,
          title: "❌ Erro na Fuga",
          description: "Ocorreu um erro ao tentar fugir. Tente novamente.",
          footer: { text: "Se o erro persistir, contate um administrador" }
        }]
      });
    }
  },

  async attemptEscape(message, battle) {
    const { player, mob } = battle;
    
    // Calcular chance de fuga baseada na velocidade
    const playerSpeed = Math.round(player.spd * (player.buffs?.spd || 1));
    const mobSpeed = Math.round(mob.spd * (mob.buffs?.spd || 1));
    
    // Chance base de fuga: 50%
    let escapeChance = 0.5;
    
    // Modificadores baseados na velocidade relativa
    const speedDifference = playerSpeed - mobSpeed;
    escapeChance += speedDifference * 0.02; // +2% por ponto de velocidade de diferença
    
    // Modificadores baseados no HP (mais fácil fugir com menos HP)
    const playerHpPercent = player.currentHp / player.maxHp;
    if (playerHpPercent < 0.3) {
      escapeChance += 0.2; // +20% se HP crítico
    } else if (playerHpPercent < 0.5) {
      escapeChance += 0.1; // +10% se HP baixo
    }
    
    // Modificadores baseados no tipo de mob
    switch (mob.category) {
      case 'BOSS':
        escapeChance *= 0.3; // Muito difícil fugir de bosses
        break;
      case 'ELITE':
        escapeChance *= 0.6; // Difícil fugir de elites
        break;
      case 'BASIC':
        escapeChance *= 1.2; // Mais fácil fugir de mobs básicos
        break;
    }
    
    // Modificadores baseados no bioma
    const dungeonRun = await getOrCreateDungeonRun(message.author.id);
    const biome = dungeonRun.mapData?.biome;
    switch (biome) {
      case 'ABYSS':
        escapeChance *= 0.7; // Difícil fugir do abismo
        break;
      case 'CRYPT':
        escapeChance *= 0.8; // Difícil fugir de mortos-vivos
        break;
      case 'FOREST':
        escapeChance *= 1.3; // Mais fácil se esconder na floresta
        break;
    }
    
    // Garantir que a chance esteja entre 5% e 95%
    escapeChance = Math.max(0.05, Math.min(0.95, escapeChance));
    
    const roll = Math.random();
    const success = roll < escapeChance;
    
    if (success) {
      await this.handleSuccessfulEscape(message, battle, escapeChance, playerSpeed, mobSpeed);
    } else {
      await this.handleFailedEscape(message, battle, escapeChance, playerSpeed, mobSpeed);
    }
  },

  async handleSuccessfulEscape(message, battle, escapeChance, playerSpeed, mobSpeed) {
    const { player, mob } = battle;
    
    // Logs da fuga bem-sucedida
    const escapeLog = [
      `🏃‍♂️ **${player.name || 'Você'}** tenta fugir da batalha!`,
      `💨 **Sucesso!** Você conseguiu escapar de **${mob.name}**!`
    ];
    
    // Adicionar flavor text baseado na diferença de velocidade
    if (playerSpeed > mobSpeed + 5) {
      escapeLog.push(`⚡ Sua velocidade superior permitiu uma fuga limpa!`);
    } else if (playerSpeed < mobSpeed) {
      escapeLog.push(`🍀 Por pouco! Você conseguiu escapar por um triz!`);
    } else {
      escapeLog.push(`🏃‍♂️ Você se afastou rapidamente do perigo!`);
    }
    
    // Limpar batalha
    combatEngine.activeBattles.delete(message.author.id);
    
    // Aplicar penalidades da fuga (opcional)
    const penalties = this.calculateEscapePenalties(battle);
    if (penalties.length > 0) {
      escapeLog.push(`\n⚠️ **Consequências da fuga:**`);
      escapeLog.push(...penalties);
    }
    
    const embed = {
      color: config.colors.success,
      title: "🏃‍♂️ Fuga Bem-Sucedida!",
      description: escapeLog.join('\n'),
      fields: [
        {
          name: "📊 Estatísticas da Fuga",
          value: `**Chance:** ${Math.round(escapeChance * 100)}%\n**Sua Velocidade:** ${playerSpeed}\n**Velocidade do Inimigo:** ${mobSpeed}`,
          inline: true
        },
        {
          name: "🗺️ Próximos Passos",
          value: `Você retornou para a sala anterior.\nUse \`m.move\` para continuar explorando\nou \`m.look\` para examinar seus arredores.`,
          inline: false
        }
      ],
      footer: { text: "Nem sempre vale a pena lutar! Às vezes é melhor recuar." }
    };
    
    await message.reply({ embeds: [embed] });
  },

  async handleFailedEscape(message, battle, escapeChance, playerSpeed, mobSpeed) {
    const { player, mob } = battle;
    
    // Logs da fuga falhada
    const escapeLog = [
      `🏃‍♂️ **${player.name || 'Você'}** tenta fugir da batalha!`,
      `❌ **Falhou!** **${mob.name}** bloqueou sua fuga!`
    ];
    
    // Flavor text baseado no tipo de mob
    switch (mob.category) {
      case 'BOSS':
        escapeLog.push(`👑 **${mob.name}** não permitirá que você escape tão facilmente!`);
        break;
      case 'ELITE':
        escapeLog.push(`⚔️ **${mob.name}** é muito experiente para deixar você fugir!`);
        break;
      default:
        escapeLog.push(`🚫 **${mob.name}** cortou seu caminho de fuga!`);
    }
    
    // Mob pode fazer um ataque de oportunidade
    const opportunityAttack = Math.random() < 0.6; // 60% de chance
    if (opportunityAttack) {
      const attackCommand = (await import('./attack.js')).default;
      
      // Mob usa ataque básico como ataque de oportunidade
      const basicAttack = mob.skills.find(s => s.id === 'basic_attack') || mob.skills[0];
      const damageResult = attackCommand.calculateDamage(mob, player, basicAttack);
      
      player.currentHp = Math.max(0, player.currentHp - damageResult.damage);
      
      escapeLog.push(`⚔️ **${mob.name}** aproveita a oportunidade e ataca!`);
      escapeLog.push(`💔 Você recebeu **${damageResult.damage}** de dano!`);
      
      if (damageResult.critical) {
        escapeLog.push(`💥 **CRÍTICO!** O ataque foi devastador!`);
      }
    }
    
    // Verificar se player morreu com o ataque de oportunidade
    if (player.currentHp <= 0) {
      const attackCommand = (await import('./attack.js')).default;
      escapeLog.push(`💀 **Você foi derrotado** durante a tentativa de fuga!`);
      await attackCommand.handlePlayerDefeat(message, battle, escapeLog);
      return;
    }
    
    // Continuar batalha - turno do mob
    battle.turn++;
    
    const embed = {
      color: config.colors.warning,
      title: "❌ Fuga Falhada!",
      description: escapeLog.join('\n'),
      fields: [
        {
          name: "📊 Estatísticas da Fuga",
          value: `**Chance:** ${Math.round(escapeChance * 100)}%\n**Sua Velocidade:** ${playerSpeed}\n**Velocidade do Inimigo:** ${mobSpeed}`,
          inline: true
        },
        {
          name: "👤 Seu Status",
          value: `**HP:** ${player.currentHp}/${player.maxHp}\n**Status:** ${player.statusEffects.length > 0 ? player.statusEffects.map(e => e.name).join(', ') : 'Normal'}`,
          inline: true
        },
        {
          name: "⚔️ Batalha Continua",
          value: `A batalha ainda não acabou!\nUse \`m.attack\` ou \`m.skill\` para continuar lutando.`,
          inline: false
        }
      ],
      footer: { text: "Nem sempre a fuga é bem-sucedida. Prepare-se para lutar!" }
    };
    
    await message.reply({ embeds: [embed] });
    
    // Executar turno do mob se não for ataque de oportunidade
    if (!opportunityAttack) {
      const attackCommand = (await import('./attack.js')).default;
      await attackCommand.executeMobTurn(message, battle, []);
    }
  },

  calculateEscapePenalties(battle) {
    const penalties = [];
    const { mob } = battle;
    
    // Penalidades baseadas no tipo de mob
    switch (mob.category) {
      case 'BOSS':
        penalties.push(`• Bosses lembram de fugitivos - próximo encontro será mais difícil`);
        break;
      case 'ELITE':
        penalties.push(`• Você pode ter deixado cair alguns itens na fuga`);
        break;
    }
    
    // Penalidade de stamina (se implementado)
    if (battle.player.currentHp < battle.player.maxHp * 0.3) {
      penalties.push(`• Você estava muito ferido - recuperação será mais lenta`);
    }
    
    // Penalidade de tempo
    if (battle.turn > 10) {
      penalties.push(`• A longa batalha causou fadiga adicional`);
    }
    
    return penalties;
  }
};

// Importar função auxiliar
const { getOrCreateDungeonRun } = await import("../../database/client.js");