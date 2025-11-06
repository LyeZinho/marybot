// Sistema de gerenciamento de crafting para dungeons
// Carrega e gerencia receitas, validações e produção de itens
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { itemManager } from './itemManager.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class CraftingManager {
  constructor() {
    this.recipes = new Map();
    this.craftingStations = new Map();
    this.difficulties = new Map();
    this.isInitialized = false;
  }

  /**
   * Inicializa o sistema de crafting
   */
  async initialize() {
    try {
      await this.loadCraftingData();
      console.log('✅ Sistema de crafting inicializado com sucesso!');
      this.isInitialized = true;
    } catch (error) {
      console.error('❌ Erro ao inicializar sistema de crafting:', error);
      throw error;
    }
  }

  /**
   * Carrega dados de crafting do arquivo JSON
   */
  async loadCraftingData() {
    const dataPath = path.join(__dirname, '../data/craftingRecipes.json');
    
    try {
      const data = await fs.readFile(dataPath, 'utf8');
      const craftingData = JSON.parse(data);
      
      // Carregar estações de crafting
      for (const [stationId, stationData] of Object.entries(craftingData.craftingStations)) {
        this.craftingStations.set(stationId, stationData);
      }
      
      // Carregar receitas
      for (const [recipeId, recipeData] of Object.entries(craftingData.recipes)) {
        this.recipes.set(recipeId, recipeData);
      }
      
      // Carregar dificuldades
      for (const [difficultyId, difficultyData] of Object.entries(craftingData.craftingDifficulties)) {
        this.difficulties.set(difficultyId, difficultyData);
      }
      
      console.log(`📋 Carregadas ${this.recipes.size} receitas de crafting`);
      console.log(`🏗️ Carregadas ${this.craftingStations.size} estações de crafting`);
      
    } catch (error) {
      console.error('Erro ao carregar dados de crafting:', error);
      throw error;
    }
  }

  /**
   * Obtém todas as receitas disponíveis
   */
  getAllRecipes() {
    return Array.from(this.recipes.values());
  }

  /**
   * Obtém receitas por categoria
   */
  getRecipesByCategory(category) {
    return Array.from(this.recipes.values()).filter(recipe => recipe.category === category);
  }

  /**
   * Obtém receitas que o jogador pode fazer
   */
  getAvailableRecipes(playerLevel, inventory, currentStation = null) {
    const availableRecipes = [];
    
    for (const recipe of this.recipes.values()) {
      // Verificar nível necessário
      if (recipe.levelRequired > playerLevel) continue;
      
      // Verificar estação necessária (se especificada)
      if (currentStation && recipe.station !== currentStation) continue;
      
      // Verificar se tem materiais
      const canCraft = this.canCraftRecipe(recipe, inventory);
      
      availableRecipes.push({
        ...recipe,
        canCraft,
        materialsMissing: this.getMissingMaterials(recipe, inventory)
      });
    }
    
    return availableRecipes;
  }

  /**
   * Verifica se uma receita pode ser craftada
   */
  canCraftRecipe(recipe, inventory) {
    for (const ingredient of recipe.ingredients) {
      const playerItem = inventory.find(item => item.itemId === ingredient.itemId);
      if (!playerItem || playerItem.quantity < ingredient.quantity) {
        return false;
      }
    }
    return true;
  }

  /**
   * Obtém materiais faltantes para uma receita
   */
  getMissingMaterials(recipe, inventory) {
    const missing = [];
    
    for (const ingredient of recipe.ingredients) {
      const playerItem = inventory.find(item => item.itemId === ingredient.itemId);
      const playerQuantity = playerItem ? playerItem.quantity : 0;
      
      if (playerQuantity < ingredient.quantity) {
        const itemData = itemManager.getItemById(ingredient.itemId);
        missing.push({
          itemId: ingredient.itemId,
          itemName: itemData?.name || 'Item Desconhecido',
          needed: ingredient.quantity,
          have: playerQuantity,
          missing: ingredient.quantity - playerQuantity
        });
      }
    }
    
    return missing;
  }

  /**
   * Executa o processo de crafting
   */
  async craftItem(recipeId, inventory, playerLevel, playerStats = {}) {
    const recipe = this.recipes.get(recipeId);
    if (!recipe) {
      throw new Error('Receita não encontrada');
    }

    // Validações
    if (recipe.levelRequired > playerLevel) {
      throw new Error(`Nível ${recipe.levelRequired} necessário para esta receita`);
    }

    if (!this.canCraftRecipe(recipe, inventory)) {
      const missing = this.getMissingMaterials(recipe, inventory);
      const missingText = missing.map(m => `${m.missing}x ${m.itemName}`).join(', ');
      throw new Error(`Materiais insuficientes: ${missingText}`);
    }

    // Calcular chance de sucesso
    const difficulty = this.difficulties.get(recipe.difficulty);
    const baseSuccessChance = difficulty?.successChance || 50;
    
    // Bônus baseado em stats do jogador (se implementado)
    let successChance = baseSuccessChance;
    if (playerStats.crafting) {
      successChance += Math.min(playerStats.crafting * 2, 30); // Max +30%
    }

    // Determinar sucesso
    const roll = Math.random() * 100;
    const isSuccess = roll <= successChance;
    const isPerfect = roll <= 5; // 5% chance de craft perfeito
    
    // Consumir materiais
    const materialsConsumed = this.consumeMaterials(recipe, inventory, isSuccess);
    
    // Resultado
    const result = {
      success: isSuccess,
      perfect: isPerfect,
      recipe: recipe,
      materialsConsumed: materialsConsumed,
      experience: 0,
      itemsProduced: []
    };

    if (isSuccess) {
      // Craft bem-sucedido
      let quantity = recipe.result.quantity;
      if (isPerfect) {
        quantity += 1; // Bônus de quantidade para craft perfeito
        result.experience = recipe.experience + 50;
      } else {
        result.experience = recipe.experience;
      }

      result.itemsProduced.push({
        itemId: recipe.result.itemId,
        quantity: quantity,
        enhanced: isPerfect
      });

    } else {
      // Craft falhado
      result.experience = Math.floor(recipe.experience * 0.25); // XP reduzida em falha
    }

    return result;
  }

  /**
   * Consome materiais do inventário
   */
  consumeMaterials(recipe, inventory, isSuccess) {
    const difficulty = this.difficulties.get(recipe.difficulty);
    const consumed = [];

    for (const ingredient of recipe.ingredients) {
      const playerItem = inventory.find(item => item.itemId === ingredient.itemId);
      if (!playerItem) continue;

      let quantityToConsume = ingredient.quantity;

      // Se falhou, consumir baseado na dificuldade
      if (!isSuccess) {
        const lossPercentage = this.getFailureLossPercentage(difficulty.failureConsequence);
        quantityToConsume = Math.ceil(ingredient.quantity * lossPercentage);
      }

      // Consumir do inventário
      const actualConsumed = Math.min(quantityToConsume, playerItem.quantity);
      playerItem.quantity -= actualConsumed;

      consumed.push({
        itemId: ingredient.itemId,
        quantity: actualConsumed
      });

      // Remover item se quantidade chegou a 0
      if (playerItem.quantity <= 0) {
        const index = inventory.indexOf(playerItem);
        inventory.splice(index, 1);
      }
    }

    return consumed;
  }

  /**
   * Calcula porcentagem de perda em falha
   */
  getFailureLossPercentage(consequence) {
    switch (consequence) {
      case 'MATERIALS_LOST_25': return 0.25;
      case 'MATERIALS_LOST_50': return 0.50;
      case 'MATERIALS_LOST_75': return 0.75;
      case 'MATERIALS_LOST_ALL': return 1.0;
      default: return 0.50;
    }
  }

  /**
   * Obtém receita por ID
   */
  getRecipeById(recipeId) {
    return this.recipes.get(recipeId);
  }

  /**
   * Obtém estação de crafting por ID
   */
  getStationById(stationId) {
    return this.craftingStations.get(stationId);
  }

  /**
   * Verifica se uma estação está disponível na sala atual
   */
  isStationAvailable(stationId, currentRoom) {
    const station = this.craftingStations.get(stationId);
    if (!station) return false;

    // Se não requer dungeon, sempre disponível
    if (!station.requiredInDungeon) return true;

    // Se requer dungeon, verificar tipo da sala
    if (currentRoom && currentRoom.type === station.dungeonRoomType) {
      return true;
    }

    return false;
  }

  /**
   * Obtém receitas por estação
   */
  getRecipesByStation(stationId) {
    return Array.from(this.recipes.values()).filter(recipe => recipe.station === stationId);
  }

  /**
   * Busca receitas por nome ou ingrediente
   */
  searchRecipes(query) {
    const searchTerm = query.toLowerCase();
    return Array.from(this.recipes.values()).filter(recipe => {
      return recipe.name.toLowerCase().includes(searchTerm) ||
             recipe.description.toLowerCase().includes(searchTerm) ||
             recipe.ingredients.some(ing => {
               const item = itemManager.getItemById(ing.itemId);
               return item?.name.toLowerCase().includes(searchTerm);
             });
    });
  }

  /**
   * Calcula tempo total de crafting (em segundos)
   */
  getCraftingTime(recipeId, playerStats = {}) {
    const recipe = this.recipes.get(recipeId);
    if (!recipe) return 0;

    let baseTime = recipe.craftingTime;
    
    // Redução de tempo baseada em skills (se implementado)
    if (playerStats.crafting) {
      const reduction = Math.min(playerStats.crafting * 2, 50); // Max 50% redução
      baseTime = Math.ceil(baseTime * (100 - reduction) / 100);
    }

    return baseTime;
  }

  /**
   * Valida se o sistema está inicializado
   */
  ensureInitialized() {
    if (!this.isInitialized) {
      throw new Error('Sistema de crafting não foi inicializado. Chame initialize() primeiro.');
    }
  }
}

// Instância global do gerenciador de crafting
export const craftingManager = new CraftingManager();