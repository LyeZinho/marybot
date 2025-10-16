import config from "../../config.js";
import { getOrCreateUser, getOrCreateDungeonRun, updateDungeonPosition } from "../../database/client.js";
import { DungeonGenerator } from "../../game/dungeonGenerator.js";

export default {
  name: "dungeon",
  description: "Inicia uma nova aventura na dungeon ou mostra o status atual.",
  category: "dungeon",
  usage: "dungeon [start|status|exit]",
  cooldown: 3000,
  
  async execute(client, message, args) {
    try {
      const discordId = message.author.id;
      const subcommand = args[0]?.toLowerCase();
      
      switch (subcommand) {
        case 'start':
          return await this.startDungeon(message, discordId);
        
        case 'status':
          return await this.showStatus(message, discordId);
        
        case 'exit':
          return await this.exitDungeon(message, discordId);
        
        default:
          return await this.showHelp(message);
      }
      
    } catch (error) {
      console.error("Erro no comando dungeon:", error);
      
      const errorEmbed = {
        color: config.colors.error,
        title: `${config.emojis.error} Erro`,
        description: "Ocorreu um erro ao processar o comando da dungeon. Tente novamente.",
      };
      
      await message.reply({ embeds: [errorEmbed] });
    }
  },
  
  async startDungeon(message, discordId) {
    // Verificar se já tem dungeon ativa
    const dungeonRun = await getOrCreateDungeonRun(discordId);
    
    if (dungeonRun.positionX > 0 || dungeonRun.positionY > 0) {
      return message.reply({
        embeds: [{
          color: config.colors.warning,
          title: "⚠️ Dungeon Ativa",
          description: `Você já possui uma dungeon ativa!\n\nAndar: **${dungeonRun.currentFloor}**\nPosição: **(${dungeonRun.positionX}, ${dungeonRun.positionY})**\nHP: **${dungeonRun.health}/${dungeonRun.maxHealth}**\n\nUse \`${config.prefix}look\` para ver sua localização atual.`,
        }]
      });
    }
    
    // Gerar novo mapa
    const generator = new DungeonGenerator(dungeonRun.seed, dungeonRun.currentFloor);
    const dungeon = generator.generateDungeon();
    
    // Marcar sala de entrada como descoberta
    dungeon.grid[dungeon.entrance.x][dungeon.entrance.y].discovered = true;
    
    // Configurar posição inicial e salvar no banco
    await updateDungeonPosition(discordId, dungeon.entrance.x, dungeon.entrance.y, dungeon);
    
    // Atualizar objeto local para usar no embed
    dungeonRun.mapData = dungeon;
    dungeonRun.positionX = dungeon.entrance.x;
    dungeonRun.positionY = dungeon.entrance.y;
    
    const biomeEmojis = {
      'CRYPT': '💀',
      'VOLCANO': '🌋',
      'FOREST': '🌲',
      'GLACIER': '❄️',
      'RUINS': '🏛️',
      'ABYSS': '🕳️'
    };
    
    const startEmbed = {
      color: config.colors.primary,
      title: `${biomeEmojis[dungeon.biome]} Nova Aventura Iniciada!`,
      description: `Bem-vindo à **${this.getBiomeName(dungeon.biome)}** - Andar ${dungeon.floor}`,
      fields: [
        {
          name: "🗺️ Informações do Mapa",
          value: `**Tamanho:** ${dungeon.size}x${dungeon.size}\n**Bioma:** ${this.getBiomeName(dungeon.biome)}\n**Seed:** \`${dungeonRun.seed.slice(-8)}\``,
          inline: true
        },
        {
          name: "👤 Status do Jogador",
          value: `**HP:** ${dungeonRun.health}/${dungeonRun.maxHealth}\n**Posição:** (${dungeonRun.positionX}, ${dungeonRun.positionY})\n**Andar:** ${dungeonRun.currentFloor}`,
          inline: true
        },
        {
          name: "🎮 Comandos Disponíveis",
          value: `\`${config.prefix}move [north/south/east/west]\`\n\`${config.prefix}look\` - Observar sala atual\n\`${config.prefix}map\` - Ver minimapa\n\`${config.prefix}inventory\` - Ver inventário`,
          inline: false
        }
      ],
      footer: {
        text: `Use ${config.prefix}look para observar a sala atual`,
      },
      timestamp: new Date().toISOString(),
    };
    
    await message.reply({ embeds: [startEmbed] });
  },
  
  async showStatus(message, discordId) {
    const dungeonRun = await getOrCreateDungeonRun(discordId);
    
    if (!dungeonRun.mapData.grid) {
      return message.reply({
        embeds: [{
          color: config.colors.warning,
          title: "⚠️ Nenhuma Dungeon Ativa",
          description: `Você não possui uma dungeon ativa.\n\nUse \`${config.prefix}dungeon start\` para começar uma nova aventura!`,
        }]
      });
    }
    
    const dungeon = dungeonRun.mapData;
    const currentRoom = dungeon.grid[dungeonRun.positionX][dungeonRun.positionY];
    
    const biomeEmojis = {
      'CRYPT': '💀',
      'VOLCANO': '🌋',
      'FOREST': '🌲',
      'GLACIER': '❄️',
      'RUINS': '🏛️',
      'ABYSS': '🕳️'
    };
    
    const statusEmbed = {
      color: config.colors.primary,
      title: `${biomeEmojis[dungeonRun.biome]} Status da Dungeon`,
      fields: [
        {
          name: "🗺️ Localização",
          value: `**Bioma:** ${this.getBiomeName(dungeonRun.biome)}\n**Andar:** ${dungeonRun.currentFloor}\n**Posição:** (${dungeonRun.positionX}, ${dungeonRun.positionY})`,
          inline: true
        },
        {
          name: "👤 Status",
          value: `**HP:** ${dungeonRun.health}/${dungeonRun.maxHealth}\n**Progresso:** ${dungeonRun.progress.toFixed(1)}%`,
          inline: true
        },
        {
          name: "🏠 Sala Atual",
          value: `**Tipo:** ${this.getRoomTypeName(currentRoom.type)}\n**Descrição:** ${currentRoom.description}`,
          inline: false
        }
      ],
      footer: {
        text: `Iniciado em ${dungeonRun.startedAt.toLocaleDateString('pt-BR')}`,
      },
      timestamp: new Date().toISOString(),
    };
    
    await message.reply({ embeds: [statusEmbed] });
  },
  
  async exitDungeon(message, discordId) {
    // Implementar saída da dungeon
    return message.reply({
      embeds: [{
        color: config.colors.warning,
        title: "🚪 Sair da Dungeon",
        description: "Função de saída ainda não implementada. Use este comando quando quiser abandonar a dungeon atual.",
      }]
    });
  },
  
  async showHelp(message) {
    const helpEmbed = {
      color: config.colors.primary,
      title: "🗡️ Sistema de Dungeon",
      description: "Explore dungeons geradas proceduralmente, enfrente monstros e colete tesouros!",
      fields: [
        {
          name: `${config.prefix}dungeon start`,
          value: "Inicia uma nova aventura na dungeon",
          inline: false
        },
        {
          name: `${config.prefix}dungeon status`,
          value: "Mostra o status atual da sua aventura",
          inline: false
        },
        {
          name: `${config.prefix}dungeon exit`,
          value: "Sai da dungeon atual (progresso salvo)",
          inline: false
        },
        {
          name: "🎮 Outros Comandos",
          value: `\`${config.prefix}move [direção]\` - Mover pela dungeon\n\`${config.prefix}look\` - Observar sala atual\n\`${config.prefix}map\` - Ver minimapa`,
          inline: false
        }
      ],
      footer: {
        text: "Aventure-se com cuidado!",
      },
      timestamp: new Date().toISOString(),
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