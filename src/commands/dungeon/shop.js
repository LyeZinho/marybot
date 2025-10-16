// Comando para interagir com lojas em salas SHOP
import config from "../../config.js";
import { getOrCreateDungeonRun, updateUserBalance } from "../../database/client.js";
import { itemManager } from "../../game/itemManager.js";

export default {
  name: "shop",
  aliases: ["store", "buy", "sell", "comprar", "vender"],
  description: "Interage com lojas nas dungeons para comprar e vender itens.",
  category: "dungeon",
  usage: "shop [buy/sell] [item] [quantidade]",
  cooldown: 3000,
  
  async execute(client, message, args) {
    try {
      const discordId = message.author.id;
      
      // Verificar se há dungeon ativa
      const dungeonRun = await getOrCreateDungeonRun(discordId);
      
      if (!dungeonRun) {
        const errorEmbed = {
          color: config.colors.warning,
          title: `${config.emojis.warning} Nenhuma Dungeon Ativa`,
          description: `Você não está em uma dungeon!\n\nUse \`${config.prefix}dungeon start\` para começar uma aventura.`,
        };
        return message.reply({ embeds: [errorEmbed] });
      }

      // Verificar se o ItemManager foi inicializado
      if (!itemManager.isInitialized()) {
        await itemManager.loadItemData();
      }

      // Obter dados da dungeon e posição atual
      const dungeon = dungeonRun.mapData;
      const playerX = dungeonRun.positionX;
      const playerY = dungeonRun.positionY;
      
      // Verificar se a posição é válida
      if (!dungeon.grid || !dungeon.grid[playerY] || !dungeon.grid[playerY][playerX]) {
        const errorEmbed = {
          color: config.colors.error,
          title: `${config.emojis.error} Erro de Posição`,
          description: "Erro ao determinar sua posição na dungeon.",
        };
        return message.reply({ embeds: [errorEmbed] });
      }

      const currentRoom = dungeon.grid[playerY][playerX];
      
      // Verificar se a sala atual é do tipo SHOP
      if (currentRoom.type !== 'SHOP') {
        const errorEmbed = {
          color: config.colors.warning,
          title: `${config.emojis.warning} Nenhuma Loja Aqui`,
          description: "Não há loja nesta sala.\n\nProcure por salas marcadas com 🏪 no mapa!",
        };
        return message.reply({ embeds: [errorEmbed] });
      }

      // Se não há argumentos, mostrar catálogo da loja
      if (args.length === 0) {
        return this.showShopCatalog(message, currentRoom, dungeonRun);
      }

      const action = args[0].toLowerCase();
      
      switch (action) {
        case 'buy':
        case 'comprar':
          return this.handleBuyAction(message, args.slice(1), currentRoom, dungeonRun);
          
        case 'sell':
        case 'vender':
          return this.handleSellAction(message, args.slice(1), dungeonRun);
          
        default:
          return this.showShopHelp(message);
      }
      
    } catch (error) {
      console.error("Erro no comando shop:", error);
      
      const errorEmbed = {
        color: config.colors.error,
        title: `${config.emojis.error} Erro`,
        description: "Ocorreu um erro ao acessar a loja. Tente novamente.",
      };
      
      await message.reply({ embeds: [errorEmbed] });
    }
  },

  async showShopCatalog(message, room, dungeonRun) {
    // Gerar itens da loja se não existirem
    if (!room.shopItems) {
      room.shopItems = this.generateShopItems(dungeonRun.currentFloor, dungeonRun.mapData.biome);
    }

    const embed = {
      color: 0x00aa55,
      title: "🏪 Loja da Dungeon",
      description: `Bem-vindo à nossa loja! Aqui você pode comprar e vender itens.\n\n**Andar ${dungeonRun.currentFloor}** - ${this.getBiomeName(dungeonRun.mapData.biome)}`,
      fields: [],
      footer: {
        text: `Use ${config.prefix}shop buy <item> para comprar • ${config.prefix}shop sell para vender`,
      },
      timestamp: new Date().toISOString(),
    };

    // Listar itens à venda
    if (room.shopItems.length > 0) {
      const itemsList = room.shopItems
        .map((shopItem, index) => {
          const item = itemManager.getItemById(shopItem.itemId);
          if (!item) return null;
          
          const rarity = itemManager.rarityTypes.get(item.rarity);
          const price = shopItem.price;
          const stock = shopItem.stock > 0 ? ` (${shopItem.stock} em estoque)` : ' (Esgotado)';
          
          return `**${index + 1}.** ${rarity?.icon || '⚫'} **${item.name}**${stock}\n💰 Preço: ${price} moedas`;
        })
        .filter(Boolean)
        .join('\n\n');

      embed.fields.push({
        name: "🛒 Itens à Venda",
        value: itemsList || "Nenhum item disponível.",
        inline: false,
      });
    }

    // Mostrar dinheiro do jogador
    const user = await this.getUserData(message.author.id);
    embed.fields.push({
      name: "💰 Suas Moedas",
      value: `${user.coins || 0} moedas`,
      inline: true,
    });

    // Informações sobre venda
    embed.fields.push({
      name: "📤 Vender Itens",
      value: `Use \`${config.prefix}shop sell\` para ver o que você pode vender.`,
      inline: true,
    });

    await message.reply({ embeds: [embed] });
  },

  async handleBuyAction(message, args, room, dungeonRun) {
    if (args.length === 0) {
      const errorEmbed = {
        color: config.colors.warning,
        title: `${config.emojis.warning} Item Não Especificado`,
        description: `Especifique o item que deseja comprar.\n\nUse \`${config.prefix}shop\` para ver os itens disponíveis.`,
      };
      return message.reply({ embeds: [errorEmbed] });
    }

    // Gerar itens da loja se não existirem
    if (!room.shopItems) {
      room.shopItems = this.generateShopItems(dungeonRun.currentFloor, dungeonRun.mapData.biome);
    }

    const itemQuery = args.join(' ').toLowerCase();
    let shopItem = null;
    let shopIndex = -1;

    // Buscar por número do item
    if (!isNaN(itemQuery)) {
      const itemIndex = parseInt(itemQuery) - 1;
      if (itemIndex >= 0 && itemIndex < room.shopItems.length) {
        shopItem = room.shopItems[itemIndex];
        shopIndex = itemIndex;
      }
    } else {
      // Buscar por nome
      shopIndex = room.shopItems.findIndex(shopItem => {
        const item = itemManager.getItemById(shopItem.itemId);
        return item && item.name.toLowerCase().includes(itemQuery);
      });
      shopItem = shopIndex >= 0 ? room.shopItems[shopIndex] : null;
    }

    if (!shopItem) {
      const errorEmbed = {
        color: config.colors.warning,
        title: `${config.emojis.warning} Item Não Encontrado`,
        description: `Item "${args.join(' ')}" não está disponível na loja.`,
      };
      return message.reply({ embeds: [errorEmbed] });
    }

    const item = itemManager.getItemById(shopItem.itemId);
    if (!item) {
      const errorEmbed = {
        color: config.colors.error,
        title: `${config.emojis.error} Erro`,
        description: "Item inválido na loja.",
      };
      return message.reply({ embeds: [errorEmbed] });
    }

    // Verificar estoque
    if (shopItem.stock <= 0) {
      const errorEmbed = {
        color: config.colors.warning,
        title: `${config.emojis.warning} Fora de Estoque`,
        description: `O item **${item.name}** está fora de estoque.`,
      };
      return message.reply({ embeds: [errorEmbed] });
    }

    // Verificar se o jogador tem dinheiro
    const user = await this.getUserData(message.author.id);
    if (user.coins < shopItem.price) {
      const errorEmbed = {
        color: config.colors.warning,
        title: `${config.emojis.warning} Moedas Insuficientes`,
        description: `Você precisa de **${shopItem.price}** moedas para comprar **${item.name}**.\n\nVocê tem: **${user.coins}** moedas`,
      };
      return message.reply({ embeds: [errorEmbed] });
    }

    // Realizar compra
    await updateUserBalance(message.author.id, -shopItem.price, 0);
    shopItem.stock -= 1;

    // Atualizar dados da dungeon
    await this.updateDungeonData(message.author.id, dungeonRun.mapData);

    const rarity = itemManager.rarityTypes.get(item.rarity);
    const successEmbed = {
      color: config.colors.success,
      title: "🛒 Compra Realizada!",
      description: `Você comprou **${item.name}** por **${shopItem.price}** moedas.`,
      fields: [
        {
          name: "🎒 Item Adquirido",
          value: `${rarity?.icon || '⚫'} **${item.name}**\n*${item.description}*`,
          inline: false,
        },
        {
          name: "💰 Saldo Atual",
          value: `${user.coins - shopItem.price} moedas`,
          inline: true,
        }
      ],
      footer: {
        text: "Item adicionado ao seu inventário (sistema temporário)",
      },
    };

    await message.reply({ embeds: [successEmbed] });
  },

  async handleSellAction(message, args, dungeonRun) {
    const embed = {
      color: config.colors.primary,
      title: "📤 Sistema de Venda",
      description: "O sistema de venda ainda não foi implementado.\n\nPor enquanto, itens de tesouro são automaticamente vendidos quando coletados.",
      fields: [
        {
          name: "🔮 Em Desenvolvimento",
          value: "- Sistema de inventário persistente\n- Venda de equipamentos\n- Cálculo automático de preços",
          inline: false,
        }
      ],
    };

    await message.reply({ embeds: [embed] });
  },

  generateShopItems(floorLevel, biome) {
    const shopItems = [];
    const itemCount = Math.min(3 + Math.floor(floorLevel / 2), 8);

    // Itens básicos sempre disponíveis
    const basicItems = [
      { id: 'healing_potion_small', basePrice: 15 },
      { id: 'healing_potion_medium', basePrice: 40 },
      { id: 'mana_potion_small', basePrice: 20 },
      { id: 'strength_potion', basePrice: 50 }
    ];

    // Adicionar itens básicos
    for (const basicItem of basicItems.slice(0, Math.floor(itemCount / 2))) {
      const priceMultiplier = 1 + (floorLevel * 0.1);
      shopItems.push({
        itemId: basicItem.id,
        price: Math.floor(basicItem.basePrice * priceMultiplier),
        stock: Math.floor(Math.random() * 3) + 2
      });
    }

    // Itens aleatórios baseados no andar
    const availableItems = Array.from(itemManager.items.values())
      .filter(item => 
        item.category !== 'TREASURE' && 
        item.category !== 'QUEST' && 
        !item.autoSell
      );

    for (let i = shopItems.length; i < itemCount; i++) {
      const randomItem = availableItems[Math.floor(Math.random() * availableItems.length)];
      if (randomItem) {
        const rarity = itemManager.rarityTypes.get(randomItem.rarity);
        const basePrice = randomItem.baseValue || 10;
        const rarityMultiplier = rarity?.sellMultiplier || 1;
        const shopMultiplier = 1.5; // Lojas vendem 50% mais caro
        
        shopItems.push({
          itemId: randomItem.id,
          price: Math.floor(basePrice * rarityMultiplier * shopMultiplier),
          stock: Math.floor(Math.random() * 2) + 1
        });
      }
    }

    return shopItems;
  },

  async showShopHelp(message) {
    const embed = {
      color: config.colors.primary,
      title: "🏪 Ajuda - Comando Shop",
      description: "Use este comando para interagir com lojas nas dungeons.",
      fields: [
        {
          name: "📖 Comandos Disponíveis",
          value: [
            `\`${config.prefix}shop\` - Ver catálogo da loja`,
            `\`${config.prefix}shop buy <item>\` - Comprar item`,
            `\`${config.prefix}shop buy <número>\` - Comprar por número`,
            `\`${config.prefix}shop sell\` - Ver opções de venda`
          ].join('\n'),
          inline: false,
        },
        {
          name: "💡 Dicas",
          value: [
            "• Lojas têm estoque limitado",
            "• Preços variam por andar",
            "• Itens de bioma são mais comuns",
            "• Use números para compra rápida"
          ].join('\n'),
          inline: false,
        }
      ],
    };

    await message.reply({ embeds: [embed] });
  },

  async getUserData(discordId) {
    try {
      const { getOrCreateUser } = await import("../../database/client.js");
      return await getOrCreateUser(discordId, 'Unknown');
    } catch (error) {
      console.error('Erro ao buscar dados do usuário:', error);
      return { coins: 0 };
    }
  },

  async updateDungeonData(discordId, dungeonData) {
    try {
      const { getPrisma } = await import("../../database/client.js");
      const prisma = getPrisma();
      
      await prisma.dungeonRun.updateMany({
        where: {
          userId: discordId,
          endedAt: null
        },
        data: {
          mapData: dungeonData
        }
      });
    } catch (error) {
      console.error('Erro ao atualizar dados da dungeon:', error);
    }
  },

  getBiomeName(biome) {
    const biomeNames = {
      'CRYPT': '🕸️ Cripta Sombria',
      'VOLCANO': '🔥 Vulcão Ardente', 
      'FOREST': '🌲 Floresta Perdida',
      'GLACIER': '❄️ Geleira Eterna',
      'RUINS': '⚙️ Ruínas Mecânicas',
      'ABYSS': '🌌 Abismo Infinito'
    };
    return biomeNames[biome] || '🗺️ Terra Desconhecida';
  }
};