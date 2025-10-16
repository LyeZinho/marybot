// Sistema de gerenciamento de itens para dungeons
// Carrega e gerencia dados de itens do arquivo JSON

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class ItemManager {
  constructor() {
    this.items = new Map();
    this.lootTables = new Map();
    this.rarityTypes = new Map();
    this.itemCategories = new Map();
    this.biomeModifiers = new Map();
    this.initialized = false;
  }

  /**
   * Carrega dados dos itens do arquivo JSON
   */
  async loadItemData() {
    try {
      const itemsPath = path.join(__dirname, '../data/items.json');
      const rawData = fs.readFileSync(itemsPath, 'utf8');
      const data = JSON.parse(rawData);
      
      // Carregar itens
      for (const [itemId, itemData] of Object.entries(data.items)) {
        this.items.set(itemId, { ...itemData, id: itemId });
      }
      
      // Carregar loot tables
      for (const [tableId, table] of Object.entries(data.lootTables)) {
        this.lootTables.set(tableId, table);
      }
      
      // Carregar tipos de raridade
      for (const [rarityId, rarityData] of Object.entries(data.rarityTypes)) {
        this.rarityTypes.set(rarityId, rarityData);
      }
      
      // Carregar categorias
      for (const [categoryId, description] of Object.entries(data.itemCategories)) {
        this.itemCategories.set(categoryId, description);
      }
      
      // Carregar modificadores de bioma
      for (const [biome, modifier] of Object.entries(data.biomeItemModifiers)) {
        this.biomeModifiers.set(biome, modifier);
      }
      
      this.initialized = true;
      console.log(`✅ Sistema de itens inicializado com sucesso! ${this.items.size} itens carregados.`);
      
    } catch (error) {
      console.error('❌ Erro ao carregar dados dos itens:', error);
      throw error;
    }
  }

  /**
   * Retorna um item pelo ID
   * @param {string} itemId - ID do item
   */
  getItemById(itemId) {
    return this.items.get(itemId);
  }

  /**
   * Retorna todos os itens de uma categoria
   * @param {string} category - Categoria dos itens
   */
  getItemsByCategory(category) {
    return Array.from(this.items.values()).filter(item => item.category === category);
  }

  /**
   * Retorna todos os itens de uma raridade
   * @param {string} rarity - Raridade dos itens
   */
  getItemsByRarity(rarity) {
    return Array.from(this.items.values()).filter(item => item.rarity === rarity);
  }

  /**
   * Gera loot para uma sala de tesouro
   * @param {string} biome - Bioma atual
   * @param {number} floorLevel - Nível do andar
   * @param {string} roomType - Tipo da sala (para determinar loot table)
   */
  generateRoomLoot(biome = 'CRYPT', floorLevel = 1, roomType = 'LOOT') {
    if (!this.initialized) {
      console.warn('ItemManager não foi inicializado!');
      return { items: [], coins: 0 };
    }

    // Determinar loot table baseada no tipo de sala e andar
    let lootTableId = 'common_loot';
    
    if (floorLevel >= 5) {
      lootTableId = 'rare_loot';
    } else if (floorLevel >= 3) {
      lootTableId = 'uncommon_loot';
    }
    
    // Boss rooms sempre usam boss_loot
    if (roomType === 'BOSS') {
      lootTableId = 'boss_loot';
    }

    const lootTable = this.lootTables.get(lootTableId);
    if (!lootTable) {
      console.warn(`Loot table ${lootTableId} não encontrada!`);
      return { items: [], coins: 0 };
    }

    const generatedItems = [];
    let totalCoins = 0;

    // Aplicar modificadores de bioma
    const biomeModifier = this.biomeModifiers.get(biome);
    const bonusChance = biomeModifier?.bonusChance || 0;

    // Processar cada entrada da loot table
    for (const lootEntry of lootTable) {
      let chance = lootEntry.chance;
      
      // Aplicar bônus de bioma para itens preferidos
      if (biomeModifier?.preferredItems.includes(lootEntry.item)) {
        chance += bonusChance;
      }

      // Verificar se o item deve ser dropado
      if (Math.random() < chance) {
        const item = this.getItemById(lootEntry.item);
        if (!item) {
          console.warn(`Item ${lootEntry.item} não encontrado!`);
          continue;
        }

        // Calcular quantidade
        let quantity = lootEntry.quantity;
        if (Array.isArray(quantity)) {
          quantity = Math.floor(Math.random() * (quantity[1] - quantity[0] + 1)) + quantity[0];
        }

        // Se for moeda, adicionar ao total de moedas
        if (item.autoSell) {
          totalCoins += Math.floor(item.baseValue * quantity);
        } else {
          generatedItems.push({
            ...item,
            quantity: quantity
          });
        }
      }
    }

    // Adicionar itens bonus para andares mais altos
    if (floorLevel >= 3 && Math.random() < 0.2) {
      const bonusItem = this.generateBonusItem(biome, floorLevel);
      if (bonusItem) {
        generatedItems.push(bonusItem);
      }
    }

    return {
      items: generatedItems,
      coins: totalCoins,
      floorLevel: floorLevel,
      biome: biome
    };
  }

  /**
   * Gera um item bônus para andares altos
   * @param {string} biome - Bioma atual
   * @param {number} floorLevel - Nível do andar
   */
  generateBonusItem(biome, floorLevel) {
    const rarityChances = {
      1: { COMMON: 0.7, UNCOMMON: 0.25, RARE: 0.05 },
      3: { COMMON: 0.4, UNCOMMON: 0.4, RARE: 0.15, EPIC: 0.05 },
      5: { UNCOMMON: 0.3, RARE: 0.4, EPIC: 0.25, LEGENDARY: 0.05 },
      7: { RARE: 0.3, EPIC: 0.4, LEGENDARY: 0.25, MYTHIC: 0.05 }
    };

    const floorRange = Math.min(Math.floor((floorLevel - 1) / 2) * 2 + 1, 7);
    const chances = rarityChances[floorRange];

    // Determinar raridade
    const roll = Math.random();
    let cumulativeChance = 0;
    let selectedRarity = 'COMMON';

    for (const [rarity, chance] of Object.entries(chances)) {
      cumulativeChance += chance;
      if (roll <= cumulativeChance) {
        selectedRarity = rarity;
        break;
      }
    }

    // Buscar itens da raridade selecionada
    const candidateItems = this.getItemsByRarity(selectedRarity)
      .filter(item => !item.autoSell && item.category !== 'QUEST');

    if (candidateItems.length === 0) {
      return null;
    }

    const selectedItem = candidateItems[Math.floor(Math.random() * candidateItems.length)];
    return {
      ...selectedItem,
      quantity: 1
    };
  }

  /**
   * Calcula o valor total de uma lista de itens
   * @param {Array} items - Lista de itens com quantidade
   */
  calculateItemsValue(items) {
    return items.reduce((total, item) => {
      const baseValue = item.baseValue || 0;
      const quantity = item.quantity || 1;
      const rarity = this.rarityTypes.get(item.rarity);
      const multiplier = rarity?.sellMultiplier || 1;
      
      return total + (baseValue * quantity * multiplier);
    }, 0);
  }

  /**
   * Formata um item para exibição
   * @param {Object} item - Dados do item
   * @param {number} quantity - Quantidade do item
   */
  formatItemDisplay(item, quantity = 1) {
    const rarity = this.rarityTypes.get(item.rarity);
    const rarityIcon = rarity?.icon || '⚫';
    const rarityName = rarity?.name || 'Comum';
    
    let display = `${rarityIcon} **${item.name}**`;
    
    if (quantity > 1) {
      display += ` x${quantity}`;
    }
    
    display += ` *(${rarityName})*`;
    
    if (item.baseValue > 0) {
      const value = Math.floor(item.baseValue * (rarity?.sellMultiplier || 1));
      display += ` - ${value}g`;
    }
    
    return display;
  }

  /**
   * Formata lista de itens para embed
   * @param {Array} items - Lista de itens
   */
  formatItemsList(items) {
    if (items.length === 0) {
      return 'Nenhum item encontrado.';
    }

    return items
      .map(item => this.formatItemDisplay(item, item.quantity))
      .join('\n');
  }

  /**
   * Verifica se o ItemManager foi inicializado
   */
  isInitialized() {
    return this.initialized;
  }

  /**
   * Retorna estatísticas do sistema de itens
   */
  getStats() {
    return {
      totalItems: this.items.size,
      lootTables: this.lootTables.size,
      rarityTypes: this.rarityTypes.size,
      categories: this.itemCategories.size,
      biomes: this.biomeModifiers.size
    };
  }
}

// Instância global do gerenciador de itens
export const itemManager = new ItemManager();