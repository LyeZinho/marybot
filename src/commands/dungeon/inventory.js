import config from "../../config.js";
import { getOrCreateUser, getOrCreateDungeonRun } from "../../database/client.js";

export default {
  name: "inventory",
  aliases: ["inv", "bag", "items"],
  description: "Mostra seu inventário e equipamentos atuais.",
  category: "dungeon",
  usage: "inventory [page]",
  cooldown: 1500,
  
  async execute(client, message, args) {
    try {
      const discordId = message.author.id;
      const page = parseInt(args[0]) || 1;
      
      // Pegar dados do usuário
      const user = await getOrCreateUser(discordId, message.author.tag);
      const dungeonRun = await getOrCreateDungeonRun(discordId);
      
      // Criar embed do inventário
      const inventoryEmbed = await this.createInventoryEmbed(user, dungeonRun, page);
      
      await message.reply({ embeds: [inventoryEmbed] });
      
    } catch (error) {
      console.error("Erro no comando inventory:", error);
      
      const errorEmbed = {
        color: config.colors.error,
        title: `${config.emojis.error} Erro`,
        description: "Ocorreu um erro ao mostrar o inventário. Tente novamente.",
      };
      
      await message.reply({ embeds: [errorEmbed] });
    }
  },
  
  async createInventoryEmbed(user, dungeonRun, page) {
    const classEmojis = {
      'WARRIOR': '⚔️',
      'MAGE': '🔮',
      'ROGUE': '🗡️',
      'CLERIC': '✨'
    };
    
    // Inventário temporário até implementarmos sistema completo
    const tempInventory = this.getTempInventory(dungeonRun);
    const equipment = this.getTempEquipment(user.playerClass);
    
    const embed = {
      color: config.colors.primary,
      title: `🎒 Inventário de ${user.username}`,
      description: `${classEmojis[user.playerClass]} **${this.getClassName(user.playerClass)}** - Nível ${user.level}`,
      fields: [
        {
          name: "👤 Status do Personagem",
          value: `**HP:** ${dungeonRun.health}/${dungeonRun.maxHealth}\n**Mana:** ${user.mana}/${user.maxMana}\n**Moedas:** ${user.coins} 🪙`,
          inline: true
        },
        {
          name: "📊 Atributos",
          value: `**ATK:** ${user.attack}\n**DEF:** ${user.defense}\n**VEL:** ${user.speed}`,
          inline: true
        },
        {
          name: "⚔️ Equipamentos",
          value: this.formatEquipment(equipment),
          inline: false
        },
        {
          name: "🎒 Itens no Inventário",
          value: this.formatInventoryItems(tempInventory, page),
          inline: false
        },
        {
          name: "🎯 Habilidades Ativas",
          value: this.formatActiveSkills(user.playerClass),
          inline: false
        }
      ],
      footer: {
        text: dungeonRun.mapData?.grid ? 
          `Atualmente na ${this.getBiomeName(dungeonRun.biome)} - Andar ${dungeonRun.currentFloor}` :
          "Não está em uma dungeon ativa",
      },
      timestamp: new Date().toISOString(),
    };
    
    return embed;
  },
  
  getTempInventory(dungeonRun) {
    // Inventário temporário baseado no progresso da dungeon
    const baseItems = [
      { name: "Poção de Vida", quantity: 3, type: "consumable", emoji: "🧪", description: "Restaura 50 HP" },
      { name: "Poção de Mana", quantity: 2, type: "consumable", emoji: "💙", description: "Restaura 30 Mana" },
      { name: "Pergaminho de Recall", quantity: 1, type: "consumable", emoji: "📜", description: "Retorna à entrada" },
    ];
    
    // Adicionar itens baseados no bioma atual
    if (dungeonRun.biome) {
      const biomeItems = {
        'CRYPT': [
          { name: "Osso Antigo", quantity: 2, type: "material", emoji: "🦴", description: "Material de crafting" },
          { name: "Poeira Espectral", quantity: 1, type: "material", emoji: "👻", description: "Componente mágico" }
        ],
        'VOLCANO': [
          { name: "Cristal de Fogo", quantity: 1, type: "material", emoji: "🔥", description: "Cristal ardente" },
          { name: "Obsidiana Pura", quantity: 3, type: "material", emoji: "⚫", description: "Material resistente" }
        ],
        'FOREST': [
          { name: "Erva Medicinal", quantity: 4, type: "material", emoji: "🌿", description: "Para poções" },
          { name: "Seiva Mágica", quantity: 2, type: "material", emoji: "🍯", description: "Ingrediente raro" }
        ],
        'GLACIER': [
          { name: "Cristal de Gelo", quantity: 2, type: "material", emoji: "❄️", description: "Nunca derrete" },
          { name: "Pele Térmica", quantity: 1, type: "material", emoji: "🧥", description: "Proteção contra frio" }
        ],
        'RUINS': [
          { name: "Fragmento Antigo", quantity: 3, type: "material", emoji: "🏺", description: "Relíquia arqueológica" },
          { name: "Runa Gravada", quantity: 1, type: "material", emoji: "🗿", description: "Poder ancestral" }
        ],
        'ABYSS': [
          { name: "Essência Sombria", quantity: 1, type: "material", emoji: "🌑", description: "Energia do vazio" },
          { name: "Fragmento Estelar", quantity: 1, type: "material", emoji: "⭐", description: "Poder cósmico" }
        ]
      };
      
      if (biomeItems[dungeonRun.biome]) {
        baseItems.push(...biomeItems[dungeonRun.biome]);
      }
    }
    
    return baseItems;
  },
  
  getTempEquipment(playerClass) {
    const equipment = {
      'WARRIOR': {
        weapon: { name: "Espada de Ferro", emoji: "⚔️", stats: "+15 ATK" },
        armor: { name: "Armadura de Placas", emoji: "🛡️", stats: "+20 DEF" },
        accessory: { name: "Anel de Força", emoji: "💍", stats: "+5 ATK" }
      },
      'MAGE': {
        weapon: { name: "Cajado Arcano", emoji: "🪄", stats: "+12 ATK, +10 Mana" },
        armor: { name: "Robes Místicos", emoji: "👘", stats: "+10 DEF, +15 Mana" },
        accessory: { name: "Amuleto Sábio", emoji: "🔮", stats: "+8 Mana" }
      },
      'ROGUE': {
        weapon: { name: "Adagas Gêmeas", emoji: "🗡️", stats: "+12 ATK, +5 VEL" },
        armor: { name: "Armadura de Couro", emoji: "🦺", stats: "+15 DEF, +3 VEL" },
        accessory: { name: "Botas Sombrias", emoji: "👢", stats: "+8 VEL" }
      },
      'CLERIC': {
        weapon: { name: "Martelo Sagrado", emoji: "🔨", stats: "+10 ATK, +5 DEF" },
        armor: { name: "Vestes Divinas", emoji: "👗", stats: "+18 DEF, +5 Mana" },
        accessory: { name: "Símbolo Sagrado", emoji: "✝️", stats: "+10 Mana" }
      }
    };
    
    return equipment[playerClass] || equipment['WARRIOR'];
  },
  
  formatEquipment(equipment) {
    return `**Arma:** ${equipment.weapon.emoji} ${equipment.weapon.name} (${equipment.weapon.stats})
**Armadura:** ${equipment.armor.emoji} ${equipment.armor.name} (${equipment.armor.stats})
**Acessório:** ${equipment.accessory.emoji} ${equipment.accessory.name} (${equipment.accessory.stats})`;
  },
  
  formatInventoryItems(items, page) {
    const itemsPerPage = 8;
    const startIndex = (page - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const pageItems = items.slice(startIndex, endIndex);
    
    if (pageItems.length === 0) {
      return "Inventário vazio nesta página.";
    }
    
    const itemLines = pageItems.map(item => {
      const quantityText = item.quantity > 1 ? ` x${item.quantity}` : '';
      return `${item.emoji} **${item.name}**${quantityText}\n   *${item.description}*`;
    });
    
    const totalPages = Math.ceil(items.length / itemsPerPage);
    const pageInfo = totalPages > 1 ? `\n\n📄 Página ${page}/${totalPages}` : '';
    
    return itemLines.join('\n\n') + pageInfo;
  },
  
  formatActiveSkills(playerClass) {
    const skills = {
      'WARRIOR': [
        { name: "Golpe Poderoso", emoji: "💥", description: "Ataque devastador" },
        { name: "Defesa Férrea", emoji: "🛡️", description: "Reduz dano recebido" },
        { name: "Grito de Guerra", emoji: "📢", description: "Aumenta ATK temporariamente" }
      ],
      'MAGE': [
        { name: "Bola de Fogo", emoji: "🔥", description: "Dano mágico de fogo" },
        { name: "Escudo Mágico", emoji: "🔮", description: "Proteção arcana" },
        { name: "Raio de Gelo", emoji: "❄️", description: "Congela o inimigo" }
      ],
      'ROGUE': [
        { name: "Ataque Furtivo", emoji: "🗡️", description: "Dano crítico garantido" },
        { name: "Evasão", emoji: "💨", description: "Evita próximo ataque" },
        { name: "Veneno", emoji: "☠️", description: "Aplica dano contínuo" }
      ],
      'CLERIC': [
        { name: "Cura Divina", emoji: "✨", description: "Restaura HP" },
        { name: "Benção", emoji: "🙏", description: "Aumenta todos os atributos" },
        { name: "Luz Sagrada", emoji: "☀️", description: "Dano contra mortos-vivos" }
      ]
    };
    
    const classSkills = skills[playerClass] || skills['WARRIOR'];
    return classSkills.map(skill => `${skill.emoji} **${skill.name}** - ${skill.description}`).join('\n');
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
  
  getClassName(playerClass) {
    const names = {
      'WARRIOR': 'Guerreiro',
      'MAGE': 'Mago',
      'ROGUE': 'Ladino',
      'CLERIC': 'Clérigo'
    };
    return names[playerClass] || playerClass;
  }
};