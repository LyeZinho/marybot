// Comando para coletar loot de salas de tesouro
import config from "../../config.js";
import { getOrCreateDungeonRun, updateUserBalance } from "../../database/client.js";
import { itemManager } from "../../game/itemManager.js";

export default {
  name: "loot",
  aliases: ["collect", "gather", "pegar", "coletar"],
  description: "Coleta tesouros e itens de salas de loot na dungeon.",
  category: "dungeon",
  usage: "loot",
  cooldown: 2000,
  
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
      
      // Verificar se a sala atual é do tipo LOOT
      if (currentRoom.type !== 'LOOT') {
        const errorEmbed = {
          color: config.colors.warning,
          title: `${config.emojis.warning} Nenhum Tesouro Aqui`,
          description: "Não há tesouros para coletar nesta sala.\n\nProcure por salas marcadas com 💰 no mapa!",
        };
        return message.reply({ embeds: [errorEmbed] });
      }

      // Verificar se o loot já foi coletado
      if (currentRoom.looted) {
        const errorEmbed = {
          color: config.colors.warning,
          title: `${config.emojis.warning} Tesouro Já Coletado`,
          description: "O tesouro desta sala já foi coletado anteriormente.",
        };
        return message.reply({ embeds: [errorEmbed] });
      }

      // Mostrar mensagem de carregamento
      const loadingEmbed = {
        color: config.colors.primary,
        title: "💰 Coletando Tesouro...",
        description: `${config.emojis.loading} Examinando o que você encontrou...`,
      };
      
      const loadingMessage = await message.reply({ embeds: [loadingEmbed] });

      // Gerar loot para a sala
      const lootResult = itemManager.generateRoomLoot(
        dungeon.biome,
        dungeonRun.currentFloor,
        currentRoom.type
      );

      // Marcar sala como saqueada
      currentRoom.looted = true;
      
      // Atualizar dados da dungeon
      await updateDungeonData(discordId, dungeon);

      // Calcular recompensas
      let totalCoins = lootResult.coins;
      const items = lootResult.items;
      
      // Adicionar valor dos itens às moedas (sistema simplificado)
      const itemsValue = itemManager.calculateItemsValue(items);
      totalCoins += Math.floor(itemsValue);

      // Atualizar saldo do usuário
      if (totalCoins > 0) {
        await updateUserBalance(discordId, totalCoins, 0);
      }

      // Criar embed de resultado
      const resultEmbed = await this.createLootResultEmbed(
        message.author,
        lootResult,
        totalCoins,
        dungeonRun.currentFloor
      );

      // Atualizar mensagem
      setTimeout(async () => {
        await loadingMessage.edit({ embeds: [resultEmbed] });
      }, 1500);
      
    } catch (error) {
      console.error("Erro no comando loot:", error);
      
      const errorEmbed = {
        color: config.colors.error,
        title: `${config.emojis.error} Erro`,
        description: "Ocorreu um erro ao coletar o tesouro. Tente novamente.",
      };
      
      await message.reply({ embeds: [errorEmbed] });
    }
  },

  async createLootResultEmbed(author, lootResult, totalCoins, currentFloor) {
    const embed = {
      color: config.colors.success,
      title: "💰 Tesouro Coletado!",
      description: "Você examinou cuidadosamente a área e encontrou:",
      fields: [],
      footer: {
        text: `${author.tag} • Andar ${currentFloor}`,
        icon_url: author.displayAvatarURL({ dynamic: true }),
      },
      timestamp: new Date().toISOString(),
    };

    // Adicionar moedas se houver
    if (totalCoins > 0) {
      embed.fields.push({
        name: "💰 Moedas de Ouro",
        value: `**+${totalCoins}** moedas`,
        inline: true,
      });
    }

    // Adicionar itens se houver
    if (lootResult.items.length > 0) {
      const itemsList = itemManager.formatItemsList(lootResult.items);
      embed.fields.push({
        name: `🎒 Itens Encontrados (${lootResult.items.length})`,
        value: itemsList,
        inline: false,
      });
    }

    // Adicionar informações sobre o bioma
    embed.fields.push({
      name: "🗺️ Local",
      value: `${this.getBiomeName(lootResult.biome)} - Andar ${currentFloor}`,
      inline: true,
    });

    // Se não encontrou nada
    if (totalCoins === 0 && lootResult.items.length === 0) {
      embed.description = "Você vasculhou a área, mas infelizmente não encontrou nada de valor...";
      embed.color = config.colors.warning;
      embed.fields.push({
        name: "😔 Sem Sorte",
        value: "Às vezes os tesouros já foram saqueados por outros aventureiros.",
        inline: false,
      });
    }

    return embed;
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

// Função auxiliar para atualizar dados da dungeon
async function updateDungeonData(discordId, dungeonData) {
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
}