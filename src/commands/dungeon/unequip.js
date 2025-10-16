// Comando para desequipar itens
import config from "../../config.js";
import { getOrCreateUser, unequipItem, getEquippedItems } from "../../database/client.js";
import { itemManager } from "../../game/itemManager.js";

export default {
  name: "unequip",
  aliases: ["desequipar", "uneq"],
  description: "Desequipa um item equipado.",
  category: "dungeon",
  usage: "unequip <nome_do_item|slot>",
  cooldown: 2000,
  
  async execute(client, message, args) {
    try {
      const discordId = message.author.id;
      
      if (args.length === 0) {
        const embed = {
          color: config.colors.warning,
          title: `${config.emojis.warning} Item ou Slot Necessário`,
          description: `Você precisa especificar qual item ou slot desequipar.\n\n**Uso:** \`${config.prefix}unequip <nome_do_item|slot>\`\n\n**Slots disponíveis:** weapon, armor, accessory`,
          footer: {
            text: `Use ${config.prefix}inv equipped para ver seus itens equipados`,
          },
        };
        return await message.reply({ embeds: [embed] });
      }

      // Verificar se o ItemManager foi inicializado
      if (!itemManager.isInitialized()) {
        await itemManager.loadItemData();
      }

      const searchTerm = args.join(' ').toLowerCase();
      
      // Buscar itens equipados do usuário
      const equippedItems = await getEquippedItems(discordId);
      
      if (equippedItems.length === 0) {
        const embed = {
          color: config.colors.warning,
          title: `${config.emojis.warning} Nenhum Item Equipado`,
          description: `Você não possui nenhum item equipado.`,
          footer: {
            text: `Use ${config.prefix}equip para equipar itens`,
          },
        };
        return await message.reply({ embeds: [embed] });
      }

      // Encontrar o item para desequipar
      let targetItem = null;
      
      // Primeiro, tentar encontrar por slot
      const slotMapping = {
        'weapon': 'WEAPON',
        'arma': 'WEAPON',
        'armor': 'ARMOR',
        'armadura': 'ARMOR',
        'accessory': 'ACCESSORY',
        'acessorio': 'ACCESSORY',
        'acessório': 'ACCESSORY'
      };
      
      if (slotMapping[searchTerm]) {
        targetItem = equippedItems.find(item => item.equipSlot === slotMapping[searchTerm]);
      }
      
      // Se não encontrou por slot, tentar por nome do item
      if (!targetItem) {
        targetItem = equippedItems.find(item => {
          const itemData = itemManager.getItemById(item.itemId);
          return itemData && itemData.name.toLowerCase().includes(searchTerm);
        });
      }

      if (!targetItem) {
        const embed = {
          color: config.colors.error,
          title: `${config.emojis.error} Item Não Encontrado`,
          description: `Você não possui um item equipado correspondente a **${args.join(' ')}**.`,
          footer: {
            text: `Use ${config.prefix}inv equipped para ver seus itens equipados`,
          },
        };
        return await message.reply({ embeds: [embed] });
      }

      const itemData = itemManager.getItemById(targetItem.itemId);
      
      try {
        // Desequipar o item no banco de dados
        await unequipItem(discordId, targetItem.id);
        
        const rarity = itemManager.rarityTypes.get(itemData.rarity);
        
        const embed = {
          color: config.colors.success,
          title: `${config.emojis.success} Item Desequipado`,
          description: `Você desequipou ${rarity?.icon || '⚫'} **${itemData.name}**!`,
          fields: [
            {
              name: "💡 Slot Liberado",
              value: this.getSlotName(targetItem.equipSlot),
              inline: true,
            },
            {
              name: "⭐ Raridade",
              value: `${rarity?.icon || '⚫'} ${rarity?.name || 'Desconhecida'}`,
              inline: true,
            }
          ],
          footer: {
            text: `O item foi movido de volta para seu inventário`,
          },
          timestamp: new Date().toISOString(),
        };

        // Adicionar efeitos removidos se houver
        if (itemData.effects && itemData.effects.length > 0) {
          const effectsText = itemData.effects
            .map(effect => `-${effect.value} ${this.getEffectName(effect.type)}`)
            .join('\n');
          
          embed.fields.push({
            name: "✨ Efeitos Removidos",
            value: effectsText,
            inline: false,
          });
        }

        await message.reply({ embeds: [embed] });
        
      } catch (error) {
        console.error("Erro ao desequipar item:", error);
        
        const embed = {
          color: config.colors.error,
          title: `${config.emojis.error} Erro`,
          description: "Ocorreu um erro ao desequipar o item. Tente novamente.",
        };
        
        await message.reply({ embeds: [embed] });
      }
      
    } catch (error) {
      console.error("Erro no comando unequip:", error);
      
      const errorEmbed = {
        color: config.colors.error,
        title: `${config.emojis.error} Erro`,
        description: "Ocorreu um erro inesperado. Tente novamente.",
      };
      
      await message.reply({ embeds: [errorEmbed] });
    }
  },

  getSlotName(slot) {
    const slotNames = {
      'WEAPON': '⚔️ Arma',
      'ARMOR': '🛡️ Armadura',
      'ACCESSORY': '💍 Acessório',
      'HELMET': '⛑️ Capacete',
      'BOOTS': '👢 Botas',
      'GLOVES': '🧤 Luvas'
    };
    
    return slotNames[slot] || '📦 Item';
  },

  getEffectName(effectType) {
    const effectNames = {
      'ATTACK': 'Ataque',
      'DEFENSE': 'Defesa',
      'HEALTH': 'Vida',
      'MANA': 'Mana',
      'SPEED': 'Velocidade',
      'CRITICAL': 'Crítico',
      'LUCK': 'Sorte'
    };
    
    return effectNames[effectType] || effectType;
  }
};