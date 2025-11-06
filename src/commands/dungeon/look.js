import config from "../../config.js";
import { getOrCreateUser, getOrCreateDungeonRun } from "../../database/client.js";
import DungeonVisuals from "../../utils/dungeonVisuals.js";

export default {
  name: "look",
  aliases: ["observe", "examine", "inspect"],
  description: "Observa a sala atual e seus detalhes.",
  category: "dungeon",
  usage: "look",
  cooldown: 1000,
  
  async execute(client, message, args) {
    try {
      const discordId = message.author.id;
      
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
      
      const dungeon = dungeonRun.mapData;
      const currentRoom = dungeon.grid[dungeonRun.positionX][dungeonRun.positionY];
      
      // Criar embed detalhado da sala
      const lookEmbed = await this.createDetailedRoomEmbed(dungeonRun, currentRoom);
      
      await message.reply({ embeds: [lookEmbed] });
      
    } catch (error) {
      console.error("Erro no comando look:", error);
      
      const errorEmbed = {
        color: config.colors.error,
        title: `${config.emojis.error} Erro`,
        description: "Ocorreu um erro ao observar a sala. Tente novamente.",
      };
      
      await message.reply({ embeds: [errorEmbed] });
    }
  },
  
  async createDetailedRoomEmbed(dungeonRun, room) {
    const biomeEmojis = {
      'CRYPT': '💀',
      'VOLCANO': '🌋',
      'FOREST': '🌲',
      'GLACIER': '❄️',
      'RUINS': '🏛️',
      'ABYSS': '🕳️'
    };
    
    const roomEmojis = {
      'ENTRANCE': '🚪',
      'EMPTY': '🏛️',
      'MONSTER': '👹',
      'TRAP': '⚠️',
      'EVENT': '❓',
      'SHOP': '🏪',
      'LOOT': '💰',
      'BOSS': '👑'
    };
    
    const embed = {
      color: this.getRoomColor(room.type),
      title: `${roomEmojis[room.type]} ${this.getRoomTypeName(room.type)}`,
      description: this.getDetailedDescription(dungeonRun.biome, room),
      fields: [
        {
          name: "📍 Localização",
          value: `**Posição:** (${dungeonRun.positionX}, ${dungeonRun.positionY})\n**Andar:** ${dungeonRun.currentFloor}\n**Bioma:** ${this.getBiomeName(dungeonRun.biome)}`,
          inline: true
        },
        {
          name: "👤 Status",
          value: `**HP:** ${dungeonRun.health}/${dungeonRun.maxHealth}\n**Progresso:** ${dungeonRun.progress.toFixed(1)}%`,
          inline: true
        },
        {
          name: "🧭 Saídas Disponíveis",
          value: this.getAvailableExits(dungeonRun.mapData, dungeonRun.positionX, dungeonRun.positionY),
          inline: false
        }
      ],
      footer: {
        text: this.getRoomFooter(room.type),
      },
      timestamp: new Date().toISOString(),
    };
    
    // Adicionar campos específicos do tipo de sala
    this.addRoomSpecificFields(embed, room, dungeonRun.biome);
    
    return embed;
  },
  
  getDetailedDescription(biome, room) {
    const biomeDescriptions = {
      'CRYPT': {
        'ENTRANCE': 'Você está na entrada de uma cripta antiga. Ossos branqueados decoram as paredes de pedra úmida, e um ar gelado sopra dos corredores à frente.',
        'EMPTY': 'Uma câmara vazia da cripta. Teias de aranha pendem do teto e você pode ouvir ecos distantes de suas pegadas.',
        'MONSTER': 'Esta sala ressoa com grunhidos baixos. Esqueletos antigos jazem espalhados pelo chão, alguns ainda se mexendo levemente.',
        'TRAP': 'O chão aqui parece instável. Lajes de pedra soltas e pressões plates antigas sugerem armadilhas mortais.',
        'EVENT': 'Uma sala ritual com um altar de pedra no centro. Runas brilham fracamente nas paredes.',
        'SHOP': 'Um necromante encapuzado oferece seus serviços sombrios de um canto escuro da sala.',
        'LOOT': 'Um sarcófago ornamentado brilha no centro da sala. Tesouros antigos podem estar escondidos dentro.',
        'BOSS': 'Uma câmara massiva com um trono de ossos no centro. A presença de morte é avassaladora aqui.'
      },
      'VOLCANO': {
        'ENTRANCE': 'O calor é intenso aqui. Lava borbulha em fissuras nas paredes rochosas, iluminando a entrada com um brilho vermelho.',
        'EMPTY': 'Uma caverna de rocha vulcânica. O ar é espesso e quente, com vapor subindo de pequenas fissuras no chão.',
        'MONSTER': 'Rugidos ecoam desta câmara superaquecida. Pegadas queimadas no chão sugerem criaturas de fogo.',
        'TRAP': 'Jatos de lava ocasionais disparam de buracos na parede. O chão está rachado e instável.',
        'EVENT': 'Um poço de lava no centro da sala forma padrões hipnotizantes. Algo mágico está acontecendo aqui.',
        'SHOP': 'Um elementalista de fogo oferece equipamentos forjados em lava de uma plataforma de obsidiana.',
        'LOOT': 'Cristais de fogo brilham intensamente em uma formação rochosa. O calor é quase insuportável.',
        'BOSS': 'O núcleo do vulcão. Lava corre pelas paredes e uma presença ardente domina o espaço.'
      },
      'FOREST': {
        'ENTRANCE': 'Raízes antigas formam um arco natural na entrada. Folhas sussurram mesmo sem vento, criando uma atmosfera misteriosa.',
        'EMPTY': 'Uma clareira silenciosa. Luz filtrada pelas copas cria padrões dançantes no chão coberto de musgo.',
        'MONSTER': 'Galhos quebrados e marcas de garras nas árvores indicam a presença de predadores selvagens.',
        'TRAP': 'Vinhas espessas pendem do teto e raízes emergem do chão de forma suspeita.',
        'EVENT': 'Um círculo de cogumelos brilhantes pulsa com energia mágica. Fadas podem estar por perto.',
        'SHOP': 'Um druida ancião oferece poções e amuletos naturais de um tronco oco.',
        'LOOT': 'Uma árvore oca revela tesouros escondidos entre suas raízes douradas.',
        'BOSS': 'O coração da floresta. Uma árvore colossal domina a área, irradiando poder ancestral.'
      },
      'GLACIER': {
        'ENTRANCE': 'Cristais de gelo formam a entrada desta caverna gelada. Seu hálito forma nuvens densas no ar gélido.',
        'EMPTY': 'Uma caverna de gelo puro. Estalactites pontiagudas pendem do teto como dentes de cristal.',
        'MONSTER': 'Pegadas congeladas no chão e arranhaduras no gelo sugerem predadores árticos.',
        'TRAP': 'O gelo aqui é fino e perigoso. Buracos escuros são visíveis sob a superfície.',
        'EVENT': 'Auroras dançam nas paredes de gelo, criando um espetáculo mágico de luzes.',
        'SHOP': 'Um xamã inuit oferece equipamentos de sobrevivência de um iglu improvisado.',
        'LOOT': 'Gemas congeladas brilham dentro de um iceberg transparente.',
        'BOSS': 'O trono de gelo eterno. O frio aqui é sobrenatural e penetra até os ossos.'
      },
      'RUINS': {
        'ENTRANCE': 'Colunas quebradas marcam a entrada destas ruínas antigas. Inscrições desgastadas contam histórias perdidas.',
        'EMPTY': 'Um salão em ruínas com mosaicos parcialmente preservados no chão. Ecos do passado parecem susurrar.',
        'MONSTER': 'Estátuas quebradas e escombros espalhados sugerem que guardiões antigos ainda protegem este lugar.',
        'TRAP': 'Mecanismos antigos ainda funcionam nestas ruínas. Placas de pressão e sensores aguardam os incautos.',
        'EVENT': 'Um altar antigo ainda pulsa com magia residual. Oferendas há muito esquecidas jazem por perto.',
        'SHOP': 'Um arqueólogo oferece artefatos recuperados de uma mesa improvisada entre os escombros.',
        'LOOT': 'Um cofre antigo, selado com runas poderosas, aguarda para ser aberto.',
        'BOSS': 'O santuário interno. Poder ancestral ecoa por estas ruínas sagradas.'
      },
      'ABYSS': {
        'ENTRANCE': 'A escuridão absoluta engole a luz aqui. Sussurros incompreensíveis ecoam das profundezas.',
        'EMPTY': 'Um vazio que parece se estender infinitamente. Apenas seus passos quebram o silêncio ensurdecedor.',
        'MONSTER': 'Sombras se movem independentemente da luz. Olhos vermelhos brilham na escuridão.',
        'TRAP': 'O próprio vazio parece vivo aqui. Buracos dimensionais se abrem e fecham aleatoriamente.',
        'EVENT': 'Um portal vacilante para outros planos de existência pulsa com energia cósmica.',
        'SHOP': 'Uma entidade sombria oferece conhecimentos proibidos das profundezas do vazio.',
        'LOOT': 'Fragmentos de estrelas mortas flutuam em uma órbita impossível.',
        'BOSS': 'O coração do abismo. A realidade se dobra e quebra neste lugar impossível.'
      }
    };
    
    return biomeDescriptions[biome]?.[room.type] || room.description || 'Uma sala misteriosa que desafia descrição.';
  },
  
  addRoomSpecificFields(embed, room, biome) {
    switch (room.type) {
      case 'MONSTER':
        embed.fields.push({
          name: "⚔️ Combate",
          value: `Um monstro habita esta sala!\n\nUse \`${config.prefix}battle\` para iniciar o combate.\nOu \`${config.prefix}move [direção]\` para fugir.`,
          inline: false
        });
        break;
        
      case 'TRAP':
        embed.fields.push({
          name: "⚠️ Perigo",
          value: `Esta sala contém armadilhas!\n\nMova-se com cuidado ou use \`${config.prefix}disarm\` se tiver as habilidades necessárias.`,
          inline: false
        });
        break;
        
      case 'LOOT':
        embed.fields.push({
          name: "💰 Tesouro",
          value: `Há tesouros nesta sala!\n\nUse \`${config.prefix}loot\` para coletar os itens.`,
          inline: false
        });
        break;
        
      case 'SHOP':
        embed.fields.push({
          name: "🏪 Comércio",
          value: `Um comerciante está presente!\n\nUse \`${config.prefix}shop\` para ver os itens disponíveis.\nOu \`${config.prefix}sell\` para vender seus itens.`,
          inline: false
        });
        break;
        
      case 'EVENT':
        embed.fields.push({
          name: "❓ Evento Especial",
          value: `Algo interessante está acontecendo aqui!\n\nUse \`${config.prefix}interact\` para investigar.`,
          inline: false
        });
        break;
        
      case 'BOSS':
        embed.fields.push({
          name: "👑 Chefe",
          value: `O chefe deste andar está aqui!\n\n⚠️ **Aviso:** Esta será uma batalha difícil!\nUse \`${config.prefix}battle\` quando estiver pronto.`,
          inline: false
        });
        break;
        
      case 'ENTRANCE':
        embed.fields.push({
          name: "🚪 Entrada",
          value: `Esta é a entrada da dungeon.\n\nVocê sempre pode voltar aqui usando \`${config.prefix}recall\` (se tiver um pergaminho).`,
          inline: false
        });
        break;

      case 'WORKSHOP':
        embed.fields.push({
          name: "🔨 Oficina de Ferreiro",
          value: `Uma forja e bigorna estão disponíveis!\n\nUse \`${config.prefix}craft\` para ver receitas de armas e armaduras.\nEsta estação permite crafting avançado de equipamentos.`,
          inline: false
        });
        break;

      case 'ALCHEMY':
        embed.fields.push({
          name: "⚗️ Laboratório de Alquimia", 
          value: `Equipamento alquímico está montado aqui!\n\nUse \`${config.prefix}craft\` para preparar poções e elixires.\nEsta estação é ideal para criar consumíveis.`,
          inline: false
        });
        break;

      case 'ENCHANTING':
        embed.fields.push({
          name: "✨ Mesa de Encantamento",
          value: `Cristais mágicos flutuam ao redor da mesa!\n\nUse \`${config.prefix}craft\` para criar itens encantados.\nEsta estação permite crafting de itens mágicos poderosos.`,
          inline: false
        });
        break;
    }
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
            const discovered = targetRoom.discovered ? '' : ' (inexplorado)';
            const roomIcon = this.getRoomIcon(targetRoom.type);
            exits.push(`${dir.emoji} **${dir.name}** ${roomIcon}${discovered}`);
          }
        }
      }
    }
    
    return exits.length > 0 ? exits.join('\n') : '🚧 Nenhuma saída disponível';
  },
  
  isValidPosition(x, y, dungeon) {
    if (x < 0 || y < 0 || x >= dungeon.size || y >= dungeon.size) {
      return false;
    }
    
    const room = dungeon.grid[x][y];
    return room && room.type !== 'WALL' && !room.isObstacle && room.type !== 'OBSTACLE';
  },
  
  getRoomIcon(type) {
    const icons = {
      'ENTRANCE': '🚪',
      'EMPTY': '⬜',
      'MONSTER': '👹',
      'TRAP': '⚠️',
      'EVENT': '❓',
      'SHOP': '🏪',
      'LOOT': '💰',
      'BOSS': '👑'
    };
    return icons[type] || '❔';
  },
  
  getRoomColor(type) {
    const colors = {
      'ENTRANCE': config.colors.primary,
      'EMPTY': 0x808080,
      'MONSTER': config.colors.error,
      'TRAP': config.colors.warning,
      'EVENT': config.colors.primary,
      'SHOP': 0x00ff00,
      'LOOT': 0xffd700,
      'BOSS': 0x800080
    };
    return colors[type] || config.colors.primary;
  },
  
  getRoomFooter(type) {
    const footers = {
      'ENTRANCE': 'Ponto de partida seguro',
      'EMPTY': 'Sala tranquila para descanso',
      'MONSTER': 'Prepare-se para o combate!',
      'TRAP': 'Cuidado onde pisa!',
      'EVENT': 'Algo interessante pode acontecer...',
      'SHOP': 'Hora de fazer negócios!',
      'LOOT': 'Tesouros aguardam!',
      'BOSS': 'O desafio final deste andar!'
    };
    return footers[type] || 'Explore com cuidado...';
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
      'ENTRANCE': 'Entrada da Dungeon',
      'EMPTY': 'Sala Vazia',
      'MONSTER': 'Covil de Monstro',
      'TRAP': 'Sala com Armadilhas',
      'EVENT': 'Evento Especial',
      'SHOP': 'Loja do Comerciante',
      'LOOT': 'Câmara do Tesouro',
      'BOSS': 'Câmara do Chefe'
    };
    return names[type] || type;
  }
};