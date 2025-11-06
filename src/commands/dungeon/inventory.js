// Comando melhorado de inventário com sistema persistente
import config from "../../config.js";
import { getOrCreateDungeonRun, getUserInventory, getEquippedItems, getOrCreateUser } from "../../database/client.js";
import { itemManager } from "../../game/itemManager.js";
import { statsRenderer } from "../../utils/statsRenderer.js";
import { EmbedBuilder, AttachmentBuilder } from "discord.js";

export default {
  name: "inventory",
  aliases: ["inventory", "inventario", "bag", "mochila", "inv"],
  description: "Mostra seu inventário persistente e equipamentos atuais com paginação.",
  category: "dungeon",
  usage: "inv [page] [visual|equipped/consumable/weapon/armor/accessory/material]",
  cooldown: 1500,
  
  async execute(client, message, args) {
    try {
      const discordId = message.author.id;
      
      // Verificar se o ItemManager foi inicializado
      if (!itemManager.isInitialized()) {
        await itemManager.loadItemData();
      }

      // Parse dos argumentos
      let page = 1;
      let mode = 'all'; // 'all', 'equipped', 'consumable', 'weapon', etc.
      let isVisual = false;
      
      for (const arg of args) {
        const argLower = arg.toLowerCase();
        if (!isNaN(argLower)) {
          page = parseInt(argLower);
        } else if (['visual', 'img', 'image', 'grafico', 'picture'].includes(argLower)) {
          isVisual = true;
        } else if (['equipped', 'equipado', 'eq'].includes(argLower)) {
          mode = 'equipped';
        } else if (['consumable', 'consumivel', 'potions', 'pocoes'].includes(argLower)) {
          mode = 'CONSUMABLE';
        } else if (['weapon', 'weapons', 'armas'].includes(argLower)) {
          mode = 'WEAPON';
        } else if (['armor', 'armadura', 'armaduras'].includes(argLower)) {
          mode = 'ARMOR';
        } else if (['accessory', 'acessorio', 'acessorios'].includes(argLower)) {
          mode = 'ACCESSORY';
        } else if (['material', 'materiais', 'materials'].includes(argLower)) {
          mode = 'MATERIAL';
        } else if (['treasure', 'tesouro', 'tesouros'].includes(argLower)) {
          mode = 'TREASURE';
        } else if (['key', 'keys', 'chave', 'chaves'].includes(argLower)) {
          mode = 'KEY';
        }
      }

      // Modo visual híbrido - stats em imagem + itens em texto
      if (isVisual) {
        try {
          // Buscar dados necessários para renderização
          const inventoryItems = await getUserInventory(discordId);
          const equippedItems = await getEquippedItems(discordId);
          const user = await getOrCreateUser(discordId, message.author.username);
          
          // Gerar imagem apenas para stats e equipamentos
          const imageBuffer = await statsRenderer.generateStatsImage({
            stats: {
              level: user?.level || 1,
              experience: user?.experience || 0,
              health: user?.health || 100,
              mana: user?.mana || 50,
              attack: user?.attack || 10,
              defense: user?.defense || 5,
              gold: user?.gold || 0
            },
            equippedItems: equippedItems,
            username: user?.username || message.author.username
          });
          
          const attachment = new AttachmentBuilder(imageBuffer, { 
            name: `stats_${message.author.username}_${Date.now()}.png` 
          });

          // Criar embed híbrido com imagem de stats + texto de itens
          const inventoryEmbed = await this.createHybridInventoryEmbed(
            message.author,
            inventoryItems,
            equippedItems,
            await getOrCreateDungeonRun(discordId),
            page,
            mode,
            attachment.name
          );
          
          return message.reply({ embeds: [inventoryEmbed], files: [attachment] });
        } catch (error) {
          console.error('Erro ao gerar inventário visual:', error);
          await message.reply('❌ Erro ao gerar inventário visual. Mostrando versão em texto...');
          // Continua para o modo texto como fallback
        }
      }

      // Buscar inventário do banco de dados
      const inventoryItems = await getUserInventory(discordId);
      const equippedItems = await getEquippedItems(discordId);
      
      // Buscar dados da dungeon para contexto adicional
      const dungeonRun = await getOrCreateDungeonRun(discordId);
      
      // Criar embed do inventário
      const embed = await this.createInventoryEmbed(
        message.author, 
        inventoryItems, 
        equippedItems, 
        dungeonRun, 
        page, 
        mode
      );
      
      const sentMessage = await message.reply({ embeds: [embed] });
      
      // Adicionar reações para navegação se houver múltiplas páginas
      const totalItems = this.filterItemsByMode(inventoryItems, mode).length;
      const itemsPerPage = 10;
      const totalPages = Math.ceil(totalItems / itemsPerPage);
      
      if (totalPages > 1) {
        await sentMessage.react('⬅️');
        await sentMessage.react('➡️');
        
        // Collector para navegação
        const filter = (reaction, user) => {
          return ['⬅️', '➡️'].includes(reaction.emoji.name) && user.id === message.author.id;
        };
        
        const collector = sentMessage.createReactionCollector({ filter, time: 60000 });
        
        let currentPage = page;
        
        collector.on('collect', async (reaction, user) => {
          if (reaction.emoji.name === '⬅️' && currentPage > 1) {
            currentPage--;
          } else if (reaction.emoji.name === '➡️' && currentPage < totalPages) {
            currentPage++;
          }
          
          const newEmbed = await this.createInventoryEmbed(
            message.author, 
            inventoryItems, 
            equippedItems, 
            dungeonRun, 
            currentPage, 
            mode
          );
          
          await sentMessage.edit({ embeds: [newEmbed] });
          await reaction.users.remove(user.id);
        });
        
        collector.on('end', () => {
          sentMessage.reactions.removeAll().catch(() => {});
        });
      }
      
    } catch (error) {
      console.error("Erro no comando inv:", error);
      
      const errorEmbed = {
        color: config.colors.error,
        title: `${config.emojis.error} Erro`,
        description: "Ocorreu um erro ao carregar seu inventário. Tente novamente.",
      };
      
      await message.reply({ embeds: [errorEmbed] });
    }
  },

  async createHybridInventoryEmbed(author, inventoryItems, equippedItems, dungeonRun, page, mode, attachmentName) {
    const itemsPerPage = 15;
    const filteredItems = this.filterItemsByMode(inventoryItems, mode);
    const totalPages = Math.ceil(filteredItems.length / itemsPerPage);
    const startIndex = (page - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const currentPageItems = filteredItems.slice(startIndex, endIndex);

    const embed = new EmbedBuilder()
      .setTitle(`📦 Inventário Híbrido - ${author.username}`)
      .setColor(config.colors.primary)
      .setImage(`attachment://${attachmentName}`)
      .setFooter({ 
        text: `Página ${page}/${totalPages || 1} • Stats visuais + itens em texto`,
        iconURL: author.displayAvatarURL({ dynamic: true })
      })
      .setTimestamp();

    // Adicionar contexto da dungeon se ativa
    if (dungeonRun && dungeonRun.endedAt === null) {
      embed.setDescription(`🏰 **Dungeon Ativa**: ${this.getBiomeName(dungeonRun.mapData?.biome)} - Andar ${dungeonRun.currentFloor}`);
    }

    // Adicionar lista de itens em texto
    if (currentPageItems.length > 0) {
      const itemsText = currentPageItems.map(inventoryItem => {
        const item = itemManager.getItemById(inventoryItem.itemId);
        if (!item) return null;
        
        const rarityIcon = this.getRarityIcon(item.rarity);
        const quantity = inventoryItem.quantity > 1 ? ` (x${inventoryItem.quantity})` : '';
        return `${rarityIcon} **${item.name}**${quantity}`;
      }).filter(item => item !== null).join('\n');

      embed.addFields({
        name: `📦 ${this.getModeName(mode)} (${filteredItems.length} itens)`,
        value: itemsText || 'Nenhum item encontrado nesta categoria.',
        inline: false
      });
    } else {
      embed.addFields({
        name: `📦 ${this.getModeName(mode)}`,
        value: 'Nenhum item encontrado nesta categoria.',
        inline: false
      });
    }

    // Adicionar comandos úteis
    embed.addFields({
      name: '💡 Comandos Úteis',
      value: [
        '`m.equip <item>` - Equipar item',
        '`m.use <item>` - Usar consumível', 
        '`m.item <nome>` - Info do item',
        '`m.inv` - Modo texto simples'
      ].join('\n'),
      inline: false
    });

    return embed;
  },
  
  async createInventoryEmbed(author, inventoryItems, equippedItems, dungeonRun, page, mode) {
    const itemsPerPage = 10;
    const filteredItems = this.filterItemsByMode(inventoryItems, mode);
    const totalPages = Math.ceil(filteredItems.length / itemsPerPage);
    const startIndex = (page - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const currentPageItems = filteredItems.slice(startIndex, endIndex);

    const embed = {
      color: config.colors.primary,
      title: `🎒 ${this.getModeName(mode)} - ${author.username}`,
      description: this.getInventoryDescription(inventoryItems, equippedItems, mode),
      fields: [],
      footer: {
        text: `Página ${page}/${totalPages || 1} • Use reações para navegar`,
        icon_url: author.displayAvatarURL({ dynamic: true }),
      },
      timestamp: new Date().toISOString(),
    };

    // Adicionar contexto da dungeon se ativa
    if (dungeonRun && dungeonRun.endedAt === null) {
      embed.description += `\n🏰 **Dungeon Ativa**: ${this.getBiomeName(dungeonRun.mapData?.biome)} - Andar ${dungeonRun.currentFloor}`;
    }

    // Seção de equipamentos (sempre visível)
    if (mode === 'all' || mode === 'equipped') {
      const equippedText = this.formatEquippedItems(equippedItems);
      embed.fields.push({
        name: "⚔️ Equipamentos Ativos",
        value: equippedText || "Nenhum item equipado",
        inline: false,
      });
    }

    // Seção de itens do inventário
    if (currentPageItems.length > 0) {
      const itemsText = this.formatInventoryItems(currentPageItems);
      embed.fields.push({
        name: `📦 ${this.getModeName(mode)} (${filteredItems.length} itens)`,
        value: itemsText,
        inline: false,
      });
    } else if (mode !== 'equipped') {
      embed.fields.push({
        name: `📦 ${this.getModeName(mode)}`,
        value: "Nenhum item encontrado nesta categoria.",
        inline: false,
      });
    }

    // Estatísticas do inventário
    const stats = this.calculateInventoryStats(inventoryItems);
    embed.fields.push({
      name: "📊 Estatísticas",
      value: [
        `**Total de Itens**: ${stats.totalQuantity}`,
        `**Tipos Únicos**: ${stats.uniqueItems}`,
        `**Valor Estimado**: ${stats.totalValue} moedas`,
        `**Equipados**: ${equippedItems.length}/6 slots`
      ].join('\n'),
      inline: true,
    });

    // Atalhos de comandos
    embed.fields.push({
      name: "💡 Comandos Úteis",
      value: [
        `\`${config.prefix}equip <item>\` - Equipar item`,
        `\`${config.prefix}use <item>\` - Usar consumível`,
        `\`${config.prefix}sell <item>\` - Vender item`,
        `\`${config.prefix}item <nome>\` - Info do item`
      ].join('\n'),
      inline: true,
    });

    return embed;
  },

  filterItemsByMode(items, mode) {
    if (mode === 'equipped') {
      return items.filter(item => item.isEquipped);
    }
    
    if (mode === 'all') {
      return items.filter(item => !item.isEquipped);
    }
    
    // Filtrar por categoria específica
    return items.filter(item => {
      if (item.isEquipped) return false;
      
      const itemData = itemManager.getItemById(item.itemId);
      if (!itemData) return false;
      
      return itemData.category === mode;
    });
  },

  formatEquippedItems(equippedItems) {
    if (equippedItems.length === 0) {
      return "Nenhum item equipado";
    }

    const slots = {
      'WEAPON': '⚔️ Arma',
      'ARMOR': '🛡️ Armadura', 
      'ACCESSORY': '💍 Acessório',
      'HELMET': '⛑️ Capacete',
      'BOOTS': '👢 Botas',
      'GLOVES': '🧤 Luvas'
    };

    return equippedItems
      .map(item => {
        const itemData = itemManager.getItemById(item.itemId);
        if (!itemData) return null;
        
        const rarity = itemManager.rarityTypes.get(itemData.rarity);
        const slot = slots[item.equipSlot] || '📦 Item';
        
        return `${slot}: ${rarity?.icon || '⚫'} **${itemData.name}**`;
      })
      .filter(Boolean)
      .join('\n');
  },

  formatInventoryItems(items) {
    return items
      .map(item => {
        const itemData = itemManager.getItemById(item.itemId);
        if (!itemData) return null;
        
        const rarity = itemManager.rarityTypes.get(itemData.rarity);
        const quantityText = item.quantity > 1 ? ` x${item.quantity}` : '';
        const equippedIcon = item.isEquipped ? ' ⚡' : '';
        
        return `${rarity?.icon || '⚫'} **${itemData.name}**${quantityText}${equippedIcon}`;
      })
      .filter(Boolean)
      .join('\n');
  },

  getInventoryDescription(inventoryItems, equippedItems, mode) {
    const totalItems = inventoryItems.reduce((sum, item) => sum + item.quantity, 0);
    const uniqueItems = inventoryItems.length;
    
    let description = `Você possui **${totalItems}** itens (${uniqueItems} únicos)`;
    
    if (mode !== 'all') {
      description += `\nFiltrando: **${this.getModeName(mode)}**`;
    }
    
    return description;
  },

  calculateInventoryStats(items) {
    let totalValue = 0;
    let totalQuantity = 0;
    
    for (const item of items) {
      const itemData = itemManager.getItemById(item.itemId);
      if (itemData) {
        const rarity = itemManager.rarityTypes.get(itemData.rarity);
        const value = (itemData.baseValue || 0) * (rarity?.sellMultiplier || 1);
        totalValue += value * item.quantity;
        totalQuantity += item.quantity;
      }
    }
    
    return {
      totalValue: Math.floor(totalValue),
      totalQuantity: totalQuantity,
      uniqueItems: items.length
    };
  },

  getModeName(mode) {
    const names = {
      'all': 'Inventário Completo',
      'equipped': 'Itens Equipados',
      'CONSUMABLE': 'Consumíveis',
      'WEAPON': 'Armas',
      'ARMOR': 'Armaduras',
      'ACCESSORY': 'Acessórios',
      'MATERIAL': 'Materiais',
      'TREASURE': 'Tesouros',
      'KEY': 'Chaves'
    };
    return names[mode] || 'Inventário';
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