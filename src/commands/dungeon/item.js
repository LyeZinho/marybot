// Comando para visualizar informações detalhadas sobre itens
import config from "../../config.js";
import { itemManager } from "../../game/itemManager.js";

export default {
  name: "item",
  aliases: ["iteminfo", "info", "examine"],
  description: "Mostra informações detalhadas sobre um item específico ou lista todos os itens.",
  category: "dungeon",
  usage: "item [nome do item] ou item list [categoria]",
  cooldown: 1500,
  
  async execute(client, message, args) {
    try {
      // Verificar se o ItemManager foi inicializado
      if (!itemManager.isInitialized()) {
        await itemManager.loadItemData();
      }

      // Se não há argumentos, mostrar ajuda
      if (args.length === 0) {
        return this.showHelp(message);
      }

      const firstArg = args[0].toLowerCase();

      // Comando para listar itens
      if (firstArg === 'list' || firstArg === 'lista') {
        const category = args[1]?.toUpperCase();
        return this.showItemList(message, category);
      }

      // Procurar item específico
      const itemQuery = args.join(' ').toLowerCase();
      const item = this.findItemByName(itemQuery);

      if (!item) {
        const errorEmbed = {
          color: config.colors.warning,
          title: `${config.emojis.warning} Item Não Encontrado`,
          description: `Não foi possível encontrar um item com o nome "${args.join(' ')}".\n\nUse \`${config.prefix}item list\` para ver todos os itens disponíveis.`,
        };
        return message.reply({ embeds: [errorEmbed] });
      }

      // Mostrar informações do item
      const itemEmbed = this.createItemInfoEmbed(item);
      await message.reply({ embeds: [itemEmbed] });
      
    } catch (error) {
      console.error("Erro no comando item:", error);
      
      const errorEmbed = {
        color: config.colors.error,
        title: `${config.emojis.error} Erro`,
        description: "Ocorreu um erro ao buscar informações do item. Tente novamente.",
      };
      
      await message.reply({ embeds: [errorEmbed] });
    }
  },

  findItemByName(query) {
    const items = Array.from(itemManager.items.values());
    
    // Busca exata primeiro
    let found = items.find(item => 
      item.name.toLowerCase() === query ||
      item.id.toLowerCase() === query
    );
    
    if (found) return found;
    
    // Busca parcial
    found = items.find(item => 
      item.name.toLowerCase().includes(query) ||
      item.id.toLowerCase().includes(query)
    );
    
    return found;
  },

  createItemInfoEmbed(item) {
    const rarity = itemManager.rarityTypes.get(item.rarity);
    const rarityIcon = rarity?.icon || '⚫';
    const rarityName = rarity?.name || 'Comum';
    const rarityColor = parseInt(rarity?.color?.replace('#', ''), 16) || config.colors.primary;

    const embed = {
      color: rarityColor,
      title: `${rarityIcon} ${item.name}`,
      description: item.description,
      fields: [],
      footer: {
        text: `ID: ${item.id} • Categoria: ${item.category}`,
      },
      timestamp: new Date().toISOString(),
    };

    // Informações básicas
    embed.fields.push({
      name: "📊 Informações Básicas",
      value: [
        `**Raridade**: ${rarityIcon} ${rarityName}`,
        `**Categoria**: ${this.getCategoryName(item.category)}`,
        `**Valor Base**: ${item.baseValue || 0} moedas`,
        `**Empilhável**: ${item.stackable ? `Sim (max ${item.maxStack || 1})` : 'Não'}`
      ].join('\n'),
      inline: false,
    });

    // Stats do item (se houver)
    if (item.stats) {
      const statsText = Object.entries(item.stats)
        .map(([stat, value]) => `**${stat.toUpperCase()}**: ${value > 0 ? '+' : ''}${value}`)
        .join('\n');
      
      embed.fields.push({
        name: "⚔️ Atributos",
        value: statsText,
        inline: true,
      });
    }

    // Efeitos do item (se houver)
    if (item.effects) {
      const effectsText = item.effects
        .map(effect => {
          const duration = effect.duration > 0 ? ` (${effect.duration} turnos)` : '';
          return `**${effect.type}**: ${effect.value}${duration}`;
        })
        .join('\n');
      
      embed.fields.push({
        name: "✨ Efeitos",
        value: effectsText,
        inline: true,
      });
    }

    // Efeitos especiais (se houver)
    if (item.specialEffects) {
      const specialText = item.specialEffects
        .map(effect => `**${effect.type}**: +${(effect.value * 100).toFixed(0)}%`)
        .join('\n');
      
      embed.fields.push({
        name: "🌟 Efeitos Especiais",
        value: specialText,
        inline: true,
      });
    }

    // Requisitos (se houver)
    if (item.requirements) {
      const reqText = [];
      if (item.requirements.level) {
        reqText.push(`**Nível**: ${item.requirements.level}+`);
      }
      if (item.requirements.class) {
        reqText.push(`**Classes**: ${item.requirements.class.join(', ')}`);
      }
      
      if (reqText.length > 0) {
        embed.fields.push({
          name: "📋 Requisitos",
          value: reqText.join('\n'),
          inline: false,
        });
      }
    }

    // Valor de venda calculado
    const sellValue = Math.floor((item.baseValue || 0) * (rarity?.sellMultiplier || 1));
    if (sellValue > 0) {
      embed.fields.push({
        name: "💰 Valor de Venda",
        value: `${sellValue} moedas`,
        inline: true,
      });
    }

    return embed;
  },

  async showItemList(message, category = null) {
    const embed = {
      color: config.colors.primary,
      title: "🎒 Lista de Itens",
      fields: [],
      footer: {
        text: `Use ${config.prefix}item <nome> para ver detalhes de um item específico`,
      },
    };

    if (category) {
      const items = itemManager.getItemsByCategory(category);
      if (items.length === 0) {
        embed.description = `Nenhum item encontrado na categoria "${category}".`;
      } else {
        embed.title += ` - ${this.getCategoryName(category)}`;
        embed.description = this.formatItemList(items);
      }
    } else {
      // Listar por categorias
      const categories = [
        'CONSUMABLE', 'WEAPON', 'ARMOR', 'ACCESSORY', 
        'MATERIAL', 'TREASURE', 'KEY', 'QUEST'
      ];

      for (const cat of categories) {
        const items = itemManager.getItemsByCategory(cat);
        if (items.length > 0) {
          const itemsList = items
            .slice(0, 5) // Mostrar apenas os primeiros 5 por categoria
            .map(item => {
              const rarity = itemManager.rarityTypes.get(item.rarity);
              return `${rarity?.icon || '⚫'} ${item.name}`;
            })
            .join('\n');
          
          const categoryName = this.getCategoryName(cat);
          const moreText = items.length > 5 ? `\n*...e mais ${items.length - 5}*` : '';
          
          embed.fields.push({
            name: `${this.getCategoryIcon(cat)} ${categoryName} (${items.length})`,
            value: itemsList + moreText,
            inline: true,
          });
        }
      }
      
      embed.description = `Total de ${itemManager.items.size} itens disponíveis.\n\nUse \`${config.prefix}item list <categoria>\` para ver todos os itens de uma categoria.`;
    }

    await message.reply({ embeds: [embed] });
  },

  async showHelp(message) {
    const embed = {
      color: config.colors.primary,
      title: "🎒 Comando Item - Ajuda",
      description: "Use este comando para ver informações sobre itens do jogo.",
      fields: [
        {
          name: "📖 Uso Básico",
          value: [
            `\`${config.prefix}item <nome>\` - Ver detalhes de um item`,
            `\`${config.prefix}item list\` - Listar todos os itens`,
            `\`${config.prefix}item list <categoria>\` - Itens de uma categoria`
          ].join('\n'),
          inline: false,
        },
        {
          name: "📂 Categorias Disponíveis",
          value: [
            '🧪 `consumable` - Poções e consumíveis',
            '⚔️ `weapon` - Armas',
            '🛡️ `armor` - Armaduras',
            '💍 `accessory` - Acessórios',
            '🏗️ `material` - Materiais',
            '💰 `treasure` - Tesouros',
            '🗝️ `key` - Chaves'
          ].join('\n'),
          inline: false,
        },
        {
          name: "💡 Exemplos",
          value: [
            `\`${config.prefix}item espada de ferro\``,
            `\`${config.prefix}item list weapon\``,
            `\`${config.prefix}item poção\``
          ].join('\n'),
          inline: false,
        }
      ],
    };

    await message.reply({ embeds: [embed] });
  },

  formatItemList(items) {
    return items
      .map(item => {
        const rarity = itemManager.rarityTypes.get(item.rarity);
        const value = item.baseValue > 0 ? ` (${item.baseValue}g)` : '';
        return `${rarity?.icon || '⚫'} **${item.name}**${value}`;
      })
      .join('\n');
  },

  getCategoryName(category) {
    const names = {
      'CONSUMABLE': 'Consumíveis',
      'WEAPON': 'Armas',
      'ARMOR': 'Armaduras',
      'ACCESSORY': 'Acessórios',
      'MATERIAL': 'Materiais',
      'TREASURE': 'Tesouros',
      'KEY': 'Chaves',
      'QUEST': 'Missão'
    };
    return names[category] || category;
  },

  getCategoryIcon(category) {
    const icons = {
      'CONSUMABLE': '🧪',
      'WEAPON': '⚔️',
      'ARMOR': '🛡️',
      'ACCESSORY': '💍',
      'MATERIAL': '🏗️',
      'TREASURE': '💰',
      'KEY': '🗝️',
      'QUEST': '📜'
    };
    return icons[category] || '📦';
  }
};