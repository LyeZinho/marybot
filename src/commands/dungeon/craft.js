// Comando de crafting para criar itens a partir de materiais
import { craftingManager } from '../../game/craftingManager.js';
import { itemManager } from '../../game/itemManager.js';
import { getOrCreateUser, getUserInventory, addItemToInventory } from '../../database/client.js';
import config from '../../config.js';

export default {
  name: "craft",
  aliases: ["crafting", "criar", "forjar"],
  description: "Interface de crafting para criar itens a partir de materiais.",
  category: "dungeon",
  usage: "craft [list|search|make] [categoria/receita/termo]",
  cooldown: 3000,
  
  async execute(client, message, args) {
    try {
      const discordId = message.author.id;
      
      // Garantir que o sistema está inicializado
      if (!craftingManager.isInitialized) {
        await craftingManager.initialize();
      }
      
      const user = await getOrCreateUser(discordId, message.author.username);
      const inventory = await getUserInventory(discordId);
      
      const action = args[0]?.toLowerCase();
      
      switch (action) {
        case 'list':
        case 'lista':
          await this.showRecipeList(message, args[1], user, inventory);
          break;
          
        case 'search':
        case 'buscar':
          if (!args[1]) {
            return message.reply('❌ Especifique um termo para buscar. Ex: `m.craft search ferro`');
          }
          await this.searchRecipes(message, args[1], user, inventory);
          break;
          
        case 'make':
        case 'criar':
        case 'forjar':
          if (!args[1]) {
            return message.reply('❌ Especifique uma receita para craftar. Ex: `m.craft make steel_sword_recipe`');
          }
          await this.craftItem(message, args[1], user, inventory);
          break;
          
        case 'stations':
        case 'estacoes':
          await this.showStations(message);
          break;
          
        case 'info':
          if (!args[1]) {
            return message.reply('❌ Especifique uma receita para ver detalhes. Ex: `m.craft info steel_sword_recipe`');
          }
          await this.showRecipeInfo(message, args[1], user, inventory);
          break;
          
        default:
          await this.showHelp(message, user, inventory);
          break;
      }
      
    } catch (error) {
      console.error('Erro no comando craft:', error);
      await message.reply('❌ Erro no sistema de crafting. Tente novamente.');
    }
  },

  async showHelp(message, user, inventory) {
    const totalRecipes = craftingManager.getAllRecipes().length;
    const availableRecipes = craftingManager.getAvailableRecipes(user.level || 1, inventory).filter(r => r.canCraft).length;
    
    const embed = {
      color: config.colors.primary,
      title: '🔨 Sistema de Crafting - MaryBot',
      description: 'Crie itens poderosos combinando materiais!',
      fields: [
        {
          name: '📋 Comandos Disponíveis',
          value: `\`m.craft list [categoria]\` - Lista receitas disponíveis
\`m.craft search <termo>\` - Busca receitas por nome/material
\`m.craft make <receita>\` - Crafta um item específico
\`m.craft info <receita>\` - Detalhes de uma receita
\`m.craft stations\` - Lista estações de crafting`,
          inline: false
        },
        {
          name: '🎯 Categorias de Receitas',
          value: `**WEAPONS** - Armas
**ARMOR** - Armaduras  
**ACCESSORIES** - Acessórios
**CONSUMABLES** - Poções e consumíveis
**QUEST_ITEMS** - Itens de missão
**MATERIALS** - Materiais refinados`,
          inline: true
        },
        {
          name: '📊 Seu Status',
          value: `**Nível:** ${user.level || 1}
**Receitas Disponíveis:** ${availableRecipes}/${totalRecipes}
**Experiência:** ${user.experience || 0}`,
          inline: true
        },
        {
          name: '💡 Dicas',
          value: '• Algumas receitas precisam de estações especiais nas dungeons\n• Craft perfeitos (5% chance) dão itens extras\n• Levels mais altos desbloqueiam receitas avançadas',
          inline: false
        }
      ],
      footer: {
        text: `Use m.craft list para ver receitas que você pode fazer`
      }
    };

    await message.reply({ embeds: [embed] });
  },

  async showRecipeList(message, category, user, inventory) {
    let recipes;
    
    if (category) {
      const categoryUpper = category.toUpperCase();
      recipes = craftingManager.getRecipesByCategory(categoryUpper);
      if (recipes.length === 0) {
        return message.reply(`❌ Categoria "${category}" não encontrada. Use: WEAPONS, ARMOR, ACCESSORIES, CONSUMABLES, QUEST_ITEMS, MATERIALS`);
      }
    } else {
      recipes = craftingManager.getAvailableRecipes(user.level || 1, inventory);
    }

    if (recipes.length === 0) {
      return message.reply('❌ Nenhuma receita disponível para seu nível atual.');
    }

    // Paginar resultados
    const itemsPerPage = 10;
    const pages = Math.ceil(recipes.length / itemsPerPage);
    const currentPage = 1;
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const currentRecipes = recipes.slice(startIndex, endIndex);

    const embed = {
      color: config.colors.primary,
      title: `🔨 Receitas de Crafting${category ? ` - ${category}` : ''}`,
      description: `Mostrando ${currentRecipes.length} de ${recipes.length} receitas`,
      fields: [],
      footer: {
        text: `Página ${currentPage}/${pages} • Use m.craft info <receita> para detalhes`
      }
    };

    for (const recipe of currentRecipes) {
      const canCraft = recipe.canCraft !== undefined ? recipe.canCraft : craftingManager.canCraftRecipe(recipe, inventory);
      const station = craftingManager.getStationById(recipe.station);
      const resultItem = itemManager.getItemById(recipe.result.itemId);
      
      const status = canCraft ? '✅' : '❌';
      const difficulty = recipe.difficulty === 'EASY' ? '🟢' : 
                        recipe.difficulty === 'MEDIUM' ? '🟡' : 
                        recipe.difficulty === 'HARD' ? '🟠' : '🔴';
                        
      embed.fields.push({
        name: `${status} ${recipe.name} ${difficulty}`,
        value: `**Resultado:** ${recipe.result.quantity}x ${resultItem?.name || 'Item'}
**Nível:** ${recipe.levelRequired} | **XP:** ${recipe.experience}
**Estação:** ${station?.icon || '🔧'} ${station?.name || recipe.station}
**ID:** \`${recipe.id}\``,
        inline: true
      });
    }

    await message.reply({ embeds: [embed] });
  },

  async searchRecipes(message, searchTerm, user, inventory) {
    const recipes = craftingManager.searchRecipes(searchTerm);
    
    if (recipes.length === 0) {
      return message.reply(`❌ Nenhuma receita encontrada para "${searchTerm}"`);
    }

    const availableRecipes = recipes.filter(recipe => 
      recipe.levelRequired <= (user.level || 1)
    ).slice(0, 5); // Limitar a 5 resultados

    if (availableRecipes.length === 0) {
      return message.reply(`❌ Nenhuma receita encontrada para "${searchTerm}" no seu nível atual.`);
    }

    const embed = {
      color: config.colors.primary,
      title: `🔍 Busca por: "${searchTerm}"`,
      description: `Encontradas ${availableRecipes.length} receitas`,
      fields: [],
      footer: {
        text: 'Use m.craft info <receita> para ver detalhes completos'
      }
    };

    for (const recipe of availableRecipes) {
      const canCraft = craftingManager.canCraftRecipe(recipe, inventory);
      const resultItem = itemManager.getItemById(recipe.result.itemId);
      const status = canCraft ? '✅ Pode craftar' : '❌ Materiais insuficientes';
      
      embed.fields.push({
        name: `${recipe.name}`,
        value: `${status}
**Resultado:** ${recipe.result.quantity}x ${resultItem?.name || 'Item'}
**Nível:** ${recipe.levelRequired} | **ID:** \`${recipe.id}\``,
        inline: true
      });
    }

    await message.reply({ embeds: [embed] });
  },

  async showRecipeInfo(message, recipeId, user, inventory) {
    const recipe = craftingManager.getRecipeById(recipeId);
    
    if (!recipe) {
      return message.reply(`❌ Receita "${recipeId}" não encontrada.`);
    }

    const canCraft = craftingManager.canCraftRecipe(recipe, inventory);
    const missingMaterials = craftingManager.getMissingMaterials(recipe, inventory);
    const resultItem = itemManager.getItemById(recipe.result.itemId);
    const station = craftingManager.getStationById(recipe.station);
    const difficulty = craftingManager.difficulties.get(recipe.difficulty);

    const embed = {
      color: canCraft ? config.colors.success : config.colors.warning,
      title: `🔨 ${recipe.name}`,
      description: recipe.description,
      fields: [
        {
          name: '📦 Resultado',
          value: `${recipe.result.quantity}x **${resultItem?.name || 'Item Desconhecido'}**`,
          inline: true
        },
        {
          name: '⚡ Requisitos',
          value: `**Nível:** ${recipe.levelRequired}
**Estação:** ${station?.icon || '🔧'} ${station?.name || recipe.station}
**Tempo:** ${recipe.craftingTime}s`,
          inline: true
        },
        {
          name: '🎯 Dificuldade',
          value: `**${difficulty?.name || recipe.difficulty}**
Chance: ${difficulty?.successChance || 50}%
XP: ${recipe.experience}`,
          inline: true
        }
      ]
    };

    // Ingredientes
    let ingredientsText = '';
    for (const ingredient of recipe.ingredients) {
      const itemData = itemManager.getItemById(ingredient.itemId);
      const playerItem = inventory.find(item => item.itemId === ingredient.itemId);
      const playerQuantity = playerItem ? playerItem.quantity : 0;
      
      const status = playerQuantity >= ingredient.quantity ? '✅' : '❌';
      ingredientsText += `${status} ${ingredient.quantity}x ${itemData?.name || ingredient.itemId} (você tem: ${playerQuantity})\n`;
    }
    
    embed.fields.push({
      name: '🧪 Ingredientes Necessários',
      value: ingredientsText || 'Nenhum',
      inline: false
    });

    // Materiais faltantes
    if (missingMaterials.length > 0) {
      const missingText = missingMaterials.map(m => `${m.missing}x ${m.itemName}`).join('\n');
      embed.fields.push({
        name: '❌ Materiais Faltantes',
        value: missingText,
        inline: false
      });
    }

    // Avisos especiais
    if (recipe.warning) {
      embed.fields.push({
        name: '⚠️ Aviso',
        value: recipe.warning,
        inline: false
      });
    }

    const actionText = canCraft ? 
      `\n\n✅ **Você pode craftar este item!**\nUse: \`m.craft make ${recipe.id}\`` :
      '\n\n❌ **Você não pode craftar este item ainda.**';
    
    embed.description += actionText;

    await message.reply({ embeds: [embed] });
  },

  async craftItem(message, recipeId, user, inventory) {
    try {
      const recipe = craftingManager.getRecipeById(recipeId);
      
      if (!recipe) {
        return message.reply(`❌ Receita "${recipeId}" não encontrada.`);
      }

      // Executar crafting
      const result = await craftingManager.craftItem(recipeId, inventory, user.level || 1);
      
      const embed = {
        color: result.success ? config.colors.success : config.colors.error,
        title: result.success ? 
          (result.perfect ? '🌟 Craft Perfeito!' : '✅ Craft Bem-sucedido!') : 
          '❌ Craft Falhado!',
        fields: []
      };

      if (result.success) {
        // Adicionar itens ao inventário
        for (const producedItem of result.itemsProduced) {
          await addItemToInventory(user.discordId, producedItem.itemId, producedItem.quantity);
          
          const itemData = itemManager.getItemById(producedItem.itemId);
          const enhancedText = producedItem.enhanced ? ' **[APRIMORADO]**' : '';
          
          embed.fields.push({
            name: '🎁 Item Criado',
            value: `${producedItem.quantity}x **${itemData?.name || 'Item'}**${enhancedText}`,
            inline: true
          });
        }
        
        embed.description = `Você craftou com sucesso: **${recipe.name}**!`;
        
        if (result.perfect) {
          embed.description += '\n🌟 **Craft Perfeito!** Você recebeu itens extras!';
        }
        
      } else {
        embed.description = `Falha ao craftar **${recipe.name}**.`;
        
        const difficulty = craftingManager.difficulties.get(recipe.difficulty);
        if (difficulty?.failureConsequence) {
          const lossText = {
            'MATERIALS_LOST_25': '25% dos materiais foram perdidos.',
            'MATERIALS_LOST_50': '50% dos materiais foram perdidos.',
            'MATERIALS_LOST_75': '75% dos materiais foram perdidos.',
            'MATERIALS_LOST_ALL': 'Todos os materiais foram perdidos.'
          }[difficulty.failureConsequence] || 'Alguns materiais foram perdidos.';
          
          embed.description += `\n💔 ${lossText}`;
        }
      }

      // Materiais consumidos
      if (result.materialsConsumed.length > 0) {
        const consumedText = result.materialsConsumed.map(item => {
          const itemData = itemManager.getItemById(item.itemId);
          return `${item.quantity}x ${itemData?.name || item.itemId}`;
        }).join('\n');
        
        embed.fields.push({
          name: '📦 Materiais Consumidos',
          value: consumedText,
          inline: true
        });
      }

      // Experiência ganha
      if (result.experience > 0) {
        embed.fields.push({
          name: '⭐ Experiência',
          value: `+${result.experience} XP`,
          inline: true
        });
        
        // TODO: Adicionar XP ao usuário no banco
      }

      await message.reply({ embeds: [embed] });
      
    } catch (error) {
      console.error('Erro ao craftar item:', error);
      await message.reply(`❌ **Erro:** ${error.message}`);
    }
  },

  async showStations(message) {
    const stations = Array.from(craftingManager.craftingStations.values());
    
    const embed = {
      color: config.colors.primary,
      title: '🏗️ Estações de Crafting',
      description: 'Estações necessárias para diferentes tipos de crafting',
      fields: []
    };

    for (const station of stations) {
      // Encontrar ID da estação
      let stationId = null;
      for (const [id, stationData] of craftingManager.craftingStations.entries()) {
        if (stationData === station) {
          stationId = id;
          break;
        }
      }
      
      const recipes = stationId ? craftingManager.getRecipesByStation(stationId) : [];
      const availability = station.requiredInDungeon ? 
        `🏰 Apenas em dungeons (${station.dungeonRoomType})` : 
        '🌍 Sempre disponível';
      
      embed.fields.push({
        name: `${station.icon} ${station.name}`,
        value: `${station.description}
**Disponibilidade:** ${availability}
**Receitas:** ${recipes.length}`,
        inline: true
      });
    }

    embed.footer = {
      text: 'Explore dungeons para encontrar estações especiais!'
    };

    await message.reply({ embeds: [embed] });
  }
};