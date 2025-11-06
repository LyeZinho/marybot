import config from "../../config.js";
import { getOrCreateUser, getOrCreateDungeonRun, updateDungeonPosition, updateDungeonProgress } from "../../database/client.js";
import { dungeonProgressTracker } from "../../game/dungeonProgressTracker.js";
import { questTracker } from "../../game/questTracker.js";

export default {
  name: "move",
  aliases: ["mv", "go"],
  description: "Move-se pela dungeon em uma direção específica.",
  category: "dungeon",
  usage: "move [north/south/east/west/n/s/e/w]",
  cooldown: 2000,
  
  async execute(client, message, args) {
    try {
      const discordId = message.author.id;
      const direction = args[0]?.toLowerCase();
      
      if (!direction) {
        return await this.showHelp(message);
      }
      
      // Verificar se tem dungeon ativa
      const dungeonRun = await getOrCreateDungeonRun(discordId);
      
      if (!dungeonRun.mapData?.grid) {
        return message.reply({
          embeds: [{
            color: config.colors.warning,
            title: "⚠️ Nenhuma Dungeon Ativa",
            description: `Você não possui uma dungeon ativa.\n\nUse \`${config.prefix}dungeon start\` para começar uma nova aventura!`,
          }]
        });
      }
      
      // Normalizar direção
      const normalizedDirection = this.normalizeDirection(direction);
      if (!normalizedDirection) {
        return message.reply({
          embeds: [{
            color: config.colors.error,
            title: "❌ Direção Inválida",
            description: `Direção **${direction}** não reconhecida.\n\nDireções válidas: **north** (n), **south** (s), **east** (e), **west** (w)`,
          }]
        });
      }
      
      // Calcular nova posição
      const currentX = dungeonRun.positionX;
      const currentY = dungeonRun.positionY;
      const { newX, newY } = this.calculateNewPosition(currentX, currentY, normalizedDirection);
      
      // Verificar se a nova posição é válida
      const dungeon = dungeonRun.mapData;
      if (!this.isValidPosition(newX, newY, dungeon)) {
        return message.reply({
          embeds: [{
            color: config.colors.warning,
            title: "🚧 Caminho Bloqueado",
            description: `Não é possível mover-se para **${normalizedDirection}**.\n\nVerifique se há uma passagem nessa direção usando \`${config.prefix}look\`.`,
          }]
        });
      }
      
      // Atualizar posição
      await updateDungeonPosition(discordId, newX, newY);
      
      // Marcar nova sala como descoberta
      dungeon.grid[newX][newY].discovered = true;
      
      // Carregar progresso existente
      if (dungeonRun.visitedRooms) {
        dungeonProgressTracker.loadProgress(dungeonRun.visitedRooms);
      }
      
      // Rastrear sala visitada no sistema de progresso
      dungeonProgressTracker.markRoomVisited(newX, newY);
      
      // Gerar relatório de progresso
      const progressReport = dungeonProgressTracker.generateExplorationReport(
        dungeonRun.seed, 
        dungeonRun.currentFloor
      );
      
      // Salvar progresso comprimido no banco
      await updateDungeonProgress(discordId, progressReport.compressedProgress, progressReport.explorationPercentage);
      
      // Obter informações da nova sala
      const newRoom = dungeon.grid[newX][newY];
      
      // Tracking de quests - registrar sala explorada e comando usado
      try {
        const questActions = [
          {
            type: "room_explored",
            data: {
              type: newRoom.type,
              biome: dungeonRun.biome,
              hasMob: newRoom.mob !== null,
              difficulty: newRoom.difficulty || 1
            }
          },
          {
            type: "command_used", 
            data: {
              command: "move"
            }
          }
        ];

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
      
      // Criar embed de movimento com informações de progresso
      const moveEmbed = await this.createMoveEmbed(dungeonRun, newRoom, newX, newY, normalizedDirection, progressReport);
      
      await message.reply({ embeds: [moveEmbed] });
      
      // Verificar eventos da sala
      await this.handleRoomEvents(message, dungeonRun, newRoom, newX, newY);
      
    } catch (error) {
      console.error("Erro no comando move:", error);
      
      const errorEmbed = {
        color: config.colors.error,
        title: `${config.emojis.error} Erro`,
        description: "Ocorreu um erro ao processar o movimento. Tente novamente.",
      };
      
      await message.reply({ embeds: [errorEmbed] });
    }
  },
  
  normalizeDirection(direction) {
    const directions = {
      'north': 'north', 'n': 'north', 'norte': 'north',
      'south': 'south', 's': 'south', 'sul': 'south',
      'east': 'east', 'e': 'east', 'leste': 'east',
      'west': 'west', 'w': 'west', 'oeste': 'west'
    };
    
    return directions[direction] || null;
  },
  
  calculateNewPosition(x, y, direction) {
    const movements = {
      'north': { x: 0, y: -1 },
      'south': { x: 0, y: 1 },
      'east': { x: 1, y: 0 },
      'west': { x: -1, y: 0 }
    };
    
    const movement = movements[direction];
    return {
      newX: x + movement.x,
      newY: y + movement.y
    };
  },
  
  isValidPosition(x, y, dungeon) {
    // Verificar limites do mapa
    if (x < 0 || y < 0 || x >= dungeon.size || y >= dungeon.size) {
      return false;
    }
    
    // Verificar se a sala existe (não é parede nem obstáculo)
    const room = dungeon.grid[x][y];
    return room && room.type !== 'WALL' && !room.isObstacle && room.type !== 'OBSTACLE';
  },
  
  async createMoveEmbed(dungeonRun, room, x, y, direction, progressReport = null) {
    const directionEmojis = {
      'north': '⬆️',
      'south': '⬇️',
      'east': '➡️',
      'west': '⬅️'
    };
    
    const roomEmojis = {
      'ENTRANCE': '🚪',
      'EMPTY': '🏃',
      'MONSTER': '👹',
      'TRAP': '⚠️',
      'EVENT': '❓',
      'SHOP': '🏪',
      'LOOT': '💰',
      'BOSS': '👑'
    };
    
    const biomeEmojis = {
      'CRYPT': '💀',
      'VOLCANO': '🌋',
      'FOREST': '🌲',
      'GLACIER': '❄️',
      'RUINS': '🏛️',
      'ABYSS': '🕳️'
    };
    
    const embed = {
      color: config.colors.success,
      title: `${directionEmojis[direction]} Movimento Realizado`,
      description: `Você se moveu para **${direction}** e chegou em uma nova sala.`,
      fields: [
        {
          name: "📍 Nova Localização",
          value: `**Posição:** (${x}, ${y})\n**Andar:** ${dungeonRun.currentFloor}\n**Bioma:** ${this.getBiomeName(dungeonRun.biome)}`,
          inline: true
        },
        {
          name: `${roomEmojis[room.type]} Sala Atual`,
          value: `**Tipo:** ${this.getRoomTypeName(room.type)}\n**Descrição:** ${room.description}`,
          inline: true
        },
        {
          name: "🧭 Saídas Disponíveis",
          value: this.getAvailableExits(dungeonRun.mapData, x, y),
          inline: false
        }
      ],
      footer: {
        text: `Use ${config.prefix}look para observar a sala em detalhes`,
      },
      timestamp: new Date().toISOString(),
    };

    // Adicionar informações de progresso se disponível
    if (progressReport) {
      embed.fields.push({
        name: "📊 Progresso de Exploração",
        value: [
          `**Salas Visitadas:** ${progressReport.roomsVisited}/${progressReport.estimatedTotalRooms}`,
          `**Exploração:** ${progressReport.explorationPercentage}%`,
          `**Salas Especiais:** ${progressReport.specialRoomsFound}`,
          `**Score:** ${progressReport.explorationScore} pts`
        ].join('\n'),
        inline: true
      });

      // Mostrar conquista se atingiu marcos importantes
      if (progressReport.explorationPercentage >= 25 && progressReport.explorationPercentage < 26) {
        embed.fields.push({
          name: "🎯 Conquista Desbloqueada!",
          value: "**Explorador Iniciante** - 25% do andar explorado!",
          inline: false
        });
      } else if (progressReport.explorationPercentage >= 50 && progressReport.explorationPercentage < 51) {
        embed.fields.push({
          name: "🎯 Conquista Desbloqueada!",
          value: "**Explorador Experiente** - 50% do andar explorado!",
          inline: false
        });
      } else if (progressReport.explorationPercentage >= 75 && progressReport.explorationPercentage < 76) {
        embed.fields.push({
          name: "🎯 Conquista Desbloqueada!",
          value: "**Explorador Veterano** - 75% do andar explorado!",
          inline: false
        });
      } else if (progressReport.isFloorComplete) {
        embed.fields.push({
          name: "🏆 Conquista Desbloqueada!",
          value: "**Mestre Explorador** - Andar completamente explorado!",
          inline: false
        });
      }
    }

    // Atualizar footer com informações de progresso
    embed.footer = {
      text: progressReport 
        ? `${progressReport.explorationPercentage}% explorado • Dados: ${progressReport.dataSize} chars • ${config.prefix}look para detalhes`
        : `Use ${config.prefix}look para observar a sala em detalhes`,
    };
    
    embed.timestamp = new Date().toISOString();
    
    return embed;
  },
  
  getAvailableExits(dungeon, x, y) {
    const directions = {
      'north': { name: 'Norte', emoji: '⬆️', dx: 0, dy: -1 },
      'south': { name: 'Sul', emoji: '⬇️', dx: 0, dy: 1 },
      'east': { name: 'Leste', emoji: '➡️', dx: 1, dy: 0 },
      'west': { name: 'Oeste', emoji: '⬅️', dx: -1, dy: 0 }
    };
    
    const currentRoom = dungeon.grid[x][y];
    const exits = [];
    
    // Usar as saídas definidas na sala
    if (currentRoom && currentRoom.exits) {
      for (const exitDir of currentRoom.exits) {
        const dir = directions[exitDir];
        if (dir) {
          const newX = x + dir.dx;
          const newY = y + dir.dy;
          
          // Verificar se a posição de destino é válida
          if (this.isValidPosition(newX, newY, dungeon)) {
            const targetRoom = dungeon.grid[newX][newY];
            const discovered = targetRoom.discovered ? '' : ' (?)';
            exits.push(`${dir.emoji} **${dir.name}**${discovered}`);
          }
        }
      }
    }
    
    return exits.length > 0 ? exits.join('\n') : 'Nenhuma saída disponível';
  },
  
  async handleRoomEvents(message, dungeonRun, room, x, y) {
    // Verificar se a sala tem eventos especiais
    switch (room.type) {
      case 'MONSTER':
        await this.handleMonsterRoom(message, dungeonRun, room);
        break;
      
      case 'TRAP':
        await this.handleTrapRoom(message, dungeonRun, room);
        break;
      
      case 'LOOT':
        await this.handleLootRoom(message, dungeonRun, room);
        break;
      
      case 'EVENT':
        await this.handleEventRoom(message, dungeonRun, room);
        break;
      
      case 'SHOP':
        await this.handleShopRoom(message, dungeonRun, room);
        break;
      
      case 'BOSS':
        await this.handleBossRoom(message, dungeonRun, room);
        break;
    }
  },
  
  async handleMonsterRoom(message, dungeonRun, room) {
    try {
      const { mobManager } = await import("../../game/mobManager.js");
      const { combatEngine } = await import("../../game/combatEngine.js");
      const { combatRenderer } = await import("../../utils/combatRenderer.js");
      const { AttachmentBuilder } = await import("discord.js");
      
      // Carregar dados de mobs se necessário
      if (!mobManager.loaded) {
        await mobManager.loadMobData();
      }
      
      // Determinar nível do jogador e bioma
      const playerLevel = dungeonRun.level || 1;
      const biome = dungeonRun.mapData?.biome || 'FOREST';
      
      // Gerar mob para a sala
      const mob = mobManager.getRandomMobForBiome(biome, playerLevel, 'BASIC');
      
      // Preparar dados do jogador para combate
      const player = {
        discordId: message.author.id,
        name: message.author.username,
        level: playerLevel,
        playerClass: dungeonRun.playerClass || 'ADVENTURER',
        maxHp: 100,
        hp: dungeonRun.health || 100,
        currentHp: dungeonRun.health || 100,
        atk: 10 + (playerLevel * 2),
        def: 5 + playerLevel,
        spd: 8 + playerLevel,
        lck: 3 + Math.floor(playerLevel / 2),
        skills: this.getPlayerSkills(dungeonRun.playerClass, playerLevel)
      };
      
      // Iniciar batalha
      const battle = await combatEngine.startBattle(player, mob, dungeonRun.id);
      
      // Gerar imagem da batalha inicial
      let battleImage;
      try {
        battleImage = await combatRenderer.generateBattleImage(battle, biome.toLowerCase(), {
          showLogs: true,
          logCount: 3
        });
      } catch (imgError) {
        console.error('Erro ao gerar imagem de batalha:', imgError);
        battleImage = null;
      }
      
      const embed = {
        color: config.colors.error,
        title: `👹 ${mob.name} Aparece!`,
        description: `**${mob.description}**\n\n🔥 **Uma batalha começou!**`,
        fields: [
          {
            name: "👤 Você",
            value: `**HP:** ${player.currentHp}/${player.maxHp}\n**Nível:** ${player.level}\n**Classe:** ${this.getClassName(player.playerClass)}`,
            inline: true
          },
          {
            name: "👹 " + mob.name,
            value: `**HP:** ${mob.currentHp}/${mob.maxHp}\n**Nível:** ${mob.level}\n**Tipo:** ${mob.type}\n**Raridade:** ${mob.rarity}`,
            inline: true
          },
          {
            name: "⚔️ Ações Disponíveis",
            value: "`m.attack` - Atacar\n`m.skill` - Usar habilidade\n`m.status` - Ver status\n`m.run` - Tentar fugir",
            inline: false
          }
        ],
        footer: { text: "É seu turno! Use m.attack para começar a lutar." }
      };
      
      if (battleImage) {
        const attachment = new AttachmentBuilder(battleImage, { name: 'battle-start.png' });
        embed.image = { url: 'attachment://battle-start.png' };
        await message.reply({ embeds: [embed], files: [attachment] });
      } else {
        await message.reply({ embeds: [embed] });
      }
      
    } catch (error) {
      console.error('Erro ao iniciar batalha:', error);
      
      // Fallback para sistema simples
      const monsterEmbed = {
        color: config.colors.warning,
        title: "👹 Monstro Detectado!",
        description: `Você detecta a presença de um monstro nesta sala!\n\nSistema de combate temporariamente indisponível.`,
        footer: {
          text: "Tente novamente em alguns instantes.",
        },
      };
      
      await message.reply({ embeds: [monsterEmbed] });
    }
  },

  getPlayerSkills(playerClass, level) {
    // Skills básicas baseadas na classe
    const baseSkills = [
      { id: 'basic_attack', name: 'Ataque Básico', type: 'ATTACK', power: 10, accuracy: 0.95, description: 'Ataque simples' }
    ];

    const classSkills = {
      'WARRIOR': [
        { id: 'power_strike', name: 'Golpe Poderoso', type: 'ATTACK', power: 15, cost: 5, cooldown: 2, description: 'Ataque mais forte' }
      ],
      'MAGE': [
        { id: 'magic_missile', name: 'Míssil Mágico', type: 'ATTACK', power: 12, cost: 8, cooldown: 1, description: 'Projétil mágico' },
        { id: 'heal_light', name: 'Luz Curativa', type: 'HEAL', heal: 25, cost: 12, cooldown: 3, description: 'Cura mágica' }
      ],
      'ROGUE': [
        { id: 'sneak_attack', name: 'Ataque Furtivo', type: 'ATTACK', power: 18, cost: 6, cooldown: 3, description: 'Ataque com alta chance de crítico' }
      ],
      'CLERIC': [
        { id: 'heal_light', name: 'Luz Curativa', type: 'HEAL', heal: 30, cost: 10, cooldown: 2, description: 'Cura divina' }
      ]
    };

    let skills = [...baseSkills];
    const classSpecific = classSkills[playerClass] || [];
    
    // Adicionar skills baseadas no nível
    classSpecific.forEach(skill => {
      const requiredLevel = skill.requiredLevel || 1;
      if (level >= requiredLevel) {
        skills.push(skill);
      }
    });

    return skills;
  },

  getClassName(playerClass) {
    const names = {
      'ADVENTURER': 'Aventureiro',
      'WARRIOR': 'Guerreiro', 
      'MAGE': 'Mago',
      'ROGUE': 'Ladino',
      'CLERIC': 'Clérigo'
    };
    return names[playerClass] || playerClass || 'Aventureiro';
  },
  
  async handleTrapRoom(message, dungeonRun, room) {
    // Avisar sobre armadilha
    const trapEmbed = {
      color: config.colors.error,
      title: "⚠️ Armadilha!",
      description: "Você sente algo estranho no ar... Esta sala parece perigosa.\n\nTenha cuidado ao explorar!",
    };
    
    setTimeout(async () => {
      await message.channel.send({ embeds: [trapEmbed] });
    }, 1500);
  },
  
  async handleLootRoom(message, dungeonRun, room) {
    // Avisar sobre tesouro
    const lootEmbed = {
      color: config.colors.success,
      title: "💰 Tesouro Encontrado!",
      description: `Você vê algo brilhando no chão!\n\nUse \`${config.prefix}loot\` para coletar o tesouro.`,
    };
    
    setTimeout(async () => {
      await message.channel.send({ embeds: [lootEmbed] });
    }, 1500);
  },
  
  async handleEventRoom(message, dungeonRun, room) {
    // Evento especial
    const eventEmbed = {
      color: config.colors.primary,
      title: "❓ Evento Especial",
      description: "Algo interessante acontece nesta sala...\n\nUse `look` para investigar!",
    };
    
    setTimeout(async () => {
      await message.channel.send({ embeds: [eventEmbed] });
    }, 1500);
  },
  
  async handleShopRoom(message, dungeonRun, room) {
    // Loja encontrada
    const shopEmbed = {
      color: config.colors.primary,
      title: "🏪 Loja Encontrada!",
      description: `Um comerciante misterioso oferece seus serviços.\n\nUse \`${config.prefix}shop\` para ver os itens disponíveis.`,
    };
    
    setTimeout(async () => {
      await message.channel.send({ embeds: [shopEmbed] });
    }, 1500);
  },
  
  async handleBossRoom(message, dungeonRun, room) {
    // Sala do chefe
    const bossEmbed = {
      color: config.colors.error,
      title: "👑 Câmara do Chefe!",
      description: "Você sente uma presença poderosa nesta sala...\n\nO chefe deste andar está aqui! Prepare-se para uma batalha épica!",
    };
    
    setTimeout(async () => {
      await message.channel.send({ embeds: [bossEmbed] });
    }, 1500);
  },
  
  async showHelp(message) {
    const helpEmbed = {
      color: config.colors.primary,
      title: "🧭 Comando de Movimento",
      description: "Use este comando para navegar pela dungeon.",
      fields: [
        {
          name: "Uso Básico",
          value: `\`${config.prefix}move [direção]\``,
          inline: false
        },
        {
          name: "Direções Válidas",
          value: "**north** (n) - Norte ⬆️\n**south** (s) - Sul ⬇️\n**east** (e) - Leste ➡️\n**west** (w) - Oeste ⬅️",
          inline: false
        },
        {
          name: "Exemplos",
          value: `\`${config.prefix}move north\`\n\`${config.prefix}move s\`\n\`${config.prefix}mv east\``,
          inline: false
        }
      ],
      footer: {
        text: "Use 'look' para ver as saídas disponíveis!",
      },
    };
    
    await message.reply({ embeds: [helpEmbed] });
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
      'ENTRANCE': 'Entrada',
      'EMPTY': 'Sala Vazia',
      'MONSTER': 'Covil de Monstro',
      'TRAP': 'Armadilha',
      'EVENT': 'Evento Especial',
      'SHOP': 'Loja',
      'LOOT': 'Tesouro',
      'BOSS': 'Câmara do Chefe'
    };
    return names[type] || type;
  }
};