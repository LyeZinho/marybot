// Comando temporário para adicionar itens de teste ao inventário
import config from "../../config.js";
import { addItemToInventory } from "../../database/client.js";
import { itemManager } from "../../game/itemManager.js";

export default {
  name: "additem",
  aliases: ["give", "add"],
  description: "[TESTE] Adiciona itens ao inventário para teste.",
  category: "admin",
  usage: "additem <item_id> [quantidade]",
  cooldown: 1000,
  ownerOnly: true, // Apenas para testes
  
  async execute(client, message, args) {
    try {
      const discordId = message.author.id;
      
      if (args.length === 0) {
        const embed = {
          color: config.colors.warning,
          title: `${config.emojis.warning} Item Necessário`,
          description: `Você precisa especificar qual item adicionar.\n\n**Uso:** \`${config.prefix}additem <item_id> [quantidade]\`\n\n**Itens disponíveis:**\nhealing_potion_small, healing_potion_medium, iron_sword, leather_armor, magic_ring, etc.`,
        };
        return await message.reply({ embeds: [embed] });
      }

      // Verificar se o ItemManager foi inicializado
      if (!itemManager.isInitialized()) {
        await itemManager.loadItemData();
      }

      const itemId = args[0];
      const quantity = parseInt(args[1]) || 1;
      
      // Verificar se o item existe
      const itemData = itemManager.getItemById(itemId);
      if (!itemData) {
        const embed = {
          color: config.colors.error,
          title: `${config.emojis.error} Item Não Encontrado`,
          description: `O item **${itemId}** não existe na base de dados.`,
        };
        return await message.reply({ embeds: [embed] });
      }

      // Adicionar item ao inventário
      await addItemToInventory(discordId, itemId, quantity);
      
      const rarity = itemManager.rarityTypes.get(itemData.rarity);
      
      const embed = {
        color: config.colors.success,
        title: `${config.emojis.success} Item Adicionado`,
        description: `Adicionado ${quantity}x ${rarity?.icon || '⚫'} **${itemData.name}** ao seu inventário!`,
        fields: [
          {
            name: "📦 Item",
            value: `${rarity?.icon || '⚫'} **${itemData.name}**`,
            inline: true,
          },
          {
            name: "📊 Quantidade",
            value: `${quantity}x`,
            inline: true,
          },
          {
            name: "⭐ Raridade",
            value: `${rarity?.name || 'Desconhecida'}`,
            inline: true,
          }
        ],
        footer: {
          text: `Use ${config.prefix}inv para ver seu inventário`,
        },
        timestamp: new Date().toISOString(),
      };

      await message.reply({ embeds: [embed] });
      
    } catch (error) {
      console.error("Erro no comando additem:", error);
      
      const errorEmbed = {
        color: config.colors.error,
        title: `${config.emojis.error} Erro`,
        description: "Ocorreu um erro ao adicionar o item. Tente novamente.",
      };
      
      await message.reply({ embeds: [errorEmbed] });
    }
  }
};