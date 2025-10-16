// Comando para equipar itens
import config from "../../config.js";
import { getOrCreateUser, equipItem, getUserInventory } from "../../database/client.js";
import { itemManager } from "../../game/itemManager.js";

export default {
  name: "equip",
  aliases: ["equipar", "eq"],
  description: "Equipa um item do seu inventário.",
  category: "dungeon",
  usage: "equip <nome_do_item>",
  cooldown: 2000,
  
  async execute(client, message, args) {
    try {
      const discordId = message.author.id;
      
      if (args.length === 0) {
        const embed = {
          color: config.colors.warning,
          title: `${config.emojis.warning} Item Necessário`,
          description: `Você precisa especificar qual item equipar.\n\n**Uso:** \`${config.prefix}equip <nome_do_item>\``,
          footer: {
            text: `Use ${config.prefix}inv para ver seus itens disponíveis`,
          },
        };
        return await message.reply({ embeds: [embed] });
      }

      // Verificar se o ItemManager foi inicializado
      if (!itemManager.isInitialized()) {
        await itemManager.loadItemData();
      }

      const itemName = args.join(' ');
      
      // Buscar inventário do usuário
      const inventoryItems = await getUserInventory(discordId);
      
      // Encontrar o item no inventário
      const userItem = inventoryItems.find(item => {
        const itemData = itemManager.getItemById(item.itemId);
        return itemData && itemData.name.toLowerCase().includes(itemName.toLowerCase());
      });

      if (!userItem) {
        const embed = {
          color: config.colors.error,
          title: `${config.emojis.error} Item Não Encontrado`,
          description: `Você não possui o item **${itemName}** em seu inventário.`,
          footer: {
            text: `Use ${config.prefix}inv para ver seus itens disponíveis`,
          },
        };
        return await message.reply({ embeds: [embed] });
      }

      // Verificar se o item já está equipado
      if (userItem.isEquipped) {
        const itemData = itemManager.getItemById(userItem.itemId);
        const embed = {
          color: config.colors.warning,
          title: `${config.emojis.warning} Item Já Equipado`,
          description: `O item **${itemData.name}** já está equipado.`,
          footer: {
            text: `Use ${config.prefix}unequip para desequipar itens`,
          },
        };
        return await message.reply({ embeds: [embed] });
      }

      const itemData = itemManager.getItemById(userItem.itemId);
      
      // Verificar se o item pode ser equipado
      if (!this.canBeEquipped(itemData)) {
        const embed = {
          color: config.colors.error,
          title: `${config.emojis.error} Item Não Equipável`,
          description: `O item **${itemData.name}** não pode ser equipado.\n\nApenas armas, armaduras e acessórios podem ser equipados.`,
        };
        return await message.reply({ embeds: [embed] });
      }

      // Determinar slot de equipamento
      const equipSlot = this.getEquipSlot(itemData);
      
      try {
        // Equipar o item no banco de dados
        await equipItem(discordId, userItem.id, equipSlot);
        
        const rarity = itemManager.rarityTypes.get(itemData.rarity);
        
        const embed = {
          color: config.colors.success,
          title: `${config.emojis.success} Item Equipado`,
          description: `Você equipou ${rarity?.icon || '⚫'} **${itemData.name}**!`,
          fields: [
            {
              name: "💡 Slot",
              value: this.getSlotName(equipSlot),
              inline: true,
            },
            {
              name: "⭐ Raridade",
              value: `${rarity?.icon || '⚫'} ${rarity?.name || 'Desconhecida'}`,
              inline: true,
            }
          ],
          footer: {
            text: `Use ${config.prefix}stats para ver seus atributos atualizados`,
          },
          timestamp: new Date().toISOString(),
        };

        // Adicionar efeitos do item se houver
        if (itemData.effects && itemData.effects.length > 0) {
          const effectsText = itemData.effects
            .map(effect => `+${effect.value} ${this.getEffectName(effect.type)}`)
            .join('\n');
          
          embed.fields.push({
            name: "✨ Efeitos",
            value: effectsText,
            inline: false,
          });
        }

        await message.reply({ embeds: [embed] });
        
      } catch (error) {
        console.error("Erro ao equipar item:", error);
        
        const embed = {
          color: config.colors.error,
          title: `${config.emojis.error} Erro`,
          description: "Ocorreu um erro ao equipar o item. Tente novamente.",
        };
        
        await message.reply({ embeds: [embed] });
      }
      
    } catch (error) {
      console.error("Erro no comando equip:", error);
      
      const errorEmbed = {
        color: config.colors.error,
        title: `${config.emojis.error} Erro`,
        description: "Ocorreu um erro inesperado. Tente novamente.",
      };
      
      await message.reply({ embeds: [errorEmbed] });
    }
  },

  canBeEquipped(itemData) {
    const equipableCategories = ['WEAPON', 'ARMOR', 'ACCESSORY'];
    return equipableCategories.includes(itemData.category);
  },

  getEquipSlot(itemData) {
    // Por enquanto, mapeamento simples baseado na categoria
    const slotMapping = {
      'WEAPON': 'WEAPON',
      'ARMOR': 'ARMOR',
      'ACCESSORY': 'ACCESSORY'
    };
    
    return slotMapping[itemData.category] || 'ACCESSORY';
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