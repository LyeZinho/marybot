// Sistema de renderização visual para inventários
// Gera interfaces de inventário em SVG e converte para PNG
import sharp from 'sharp';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class InventoryRenderer {
  constructor() {
    this.config = {
      // Dimensões da imagem
      width: 800,
      height: 600,
      padding: 20,
      
      // Grid de itens
      itemsPerRow: 8,
      itemSize: 64,
      itemSpacing: 8,
      
      // Cores e estilos
      backgroundColor: '#1a1a2e',
      gridColor: '#16213e',
      borderColor: '#0f3460',
      textColor: '#eee',
      
      // Cores por raridade
      rarityColors: {
        COMMON: '#9ca3af',     // Cinza
        UNCOMMON: '#22c55e',   // Verde
        RARE: '#3b82f6',       // Azul
        EPIC: '#a855f7',       // Roxo
        LEGENDARY: '#f97316',  // Laranja
        MYTHIC: '#eab308'      // Dourado
      },
      
      // Cores por categoria
      categoryColors: {
        WEAPON: '#ef4444',     // Vermelho
        ARMOR: '#6366f1',      // Azul índigo
        ACCESSORY: '#8b5cf6',  // Violeta
        CONSUMABLE: '#10b981', // Esmeralda
        MATERIAL: '#78716c',   // Cinza pedra
        QUEST: '#f59e0b'       // Âmbar
      },
      
      // Ícones por categoria (emoji/unicode)
      categoryIcons: {
        WEAPON: '⚔️',
        ARMOR: '🛡️',
        ACCESSORY: '💍',
        CONSUMABLE: '🧪',
        MATERIAL: '🔨',
        QUEST: '📜'
      }
    };
  }

  /**
   * Gera uma imagem visual do inventário
   * @param {Object} inventoryData - Dados do inventário
   * @param {Object} options - Opções de renderização
   * @returns {Buffer} Buffer da imagem PNG
   */
  async generateInventoryImage(inventoryData, options = {}) {
    const config = { ...this.config, ...options };
    
    try {
      // Gerar SVG do inventário
      const svg = this.createInventorySVG(inventoryData, config);
      
      // Converter SVG para PNG
      const pngBuffer = await sharp(Buffer.from(svg))
        .png({ quality: 90 })
        .toBuffer();
      
      return pngBuffer;
    } catch (error) {
      console.error('Erro ao gerar imagem do inventário:', error);
      throw error;
    }
  }

  /**
   * Cria o SVG do inventário
   * @param {Object} inventoryData - Dados do inventário
   * @param {Object} config - Configurações
   * @returns {string} SVG como string
   */
  createInventorySVG(inventoryData, config) {
    const { items, equippedItems, stats, username } = inventoryData;
    
    let svgContent = `
      <svg width="${config.width}" height="${config.height}" xmlns="http://www.w3.org/2000/svg">
        <defs>
          ${this.createGradientDefs(config)}
          ${this.createFilterDefs()}
        </defs>
        
        <!-- Background -->
        <rect width="100%" height="100%" fill="${config.backgroundColor}"/>
        
        <!-- Header -->
        ${this.createHeader(username, config)}
        
        <!-- Equipment Slots -->
        ${this.createEquipmentSection(equippedItems, config)}
        
        <!-- Inventory Grid -->
        ${this.createInventoryGrid(items, config)}
        
        <!-- Stats Panel -->
        ${this.createStatsPanel(stats, config)}
        
        <!-- Footer -->
        ${this.createFooter(config)}
      </svg>
    `;
    
    return svgContent;
  }

  /**
   * Cria as definições de gradientes
   */
  createGradientDefs(config) {
    let gradients = '';
    
    // Gradiente para cada raridade
    Object.entries(config.rarityColors).forEach(([rarity, color]) => {
      gradients += `
        <linearGradient id="grad_${rarity.toLowerCase()}" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:${color};stop-opacity:0.8" />
          <stop offset="100%" style="stop-color:${color};stop-opacity:0.3" />
        </linearGradient>
      `;
    });
    
    return gradients;
  }

  /**
   * Cria as definições de filtros
   */
  createFilterDefs() {
    return `
      <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
        <feMerge>
          <feMergeNode in="coloredBlur"/>
          <feMergeNode in="SourceGraphic"/>
        </feMerge>
      </filter>
      
      <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="2" dy="2" stdDeviation="3" flood-color="#000" flood-opacity="0.3"/>
      </filter>
    `;
  }

  /**
   * Cria o cabeçalho do inventário
   */
  createHeader(username, config) {
    return `
      <g class="header">
        <!-- Título -->
        <rect x="10" y="10" width="${config.width - 20}" height="60" 
              fill="${config.gridColor}" stroke="${config.borderColor}" stroke-width="2" rx="8"/>
        
        <!-- Nome do usuário -->
        <text x="${config.width / 2}" y="35" text-anchor="middle" 
              fill="${config.textColor}" font-family="Arial, sans-serif" font-size="18" font-weight="bold">
          📦 Inventário de ${username}
        </text>
        
        <!-- Linha decorativa -->
        <line x1="30" y1="50" x2="${config.width - 30}" y2="50" 
              stroke="${config.borderColor}" stroke-width="1" opacity="0.5"/>
      </g>
    `;
  }

  /**
   * Cria a seção de equipamentos
   */
  createEquipmentSection(equippedItems, config) {
    const startY = 90;
    const equipSlots = ['WEAPON', 'ARMOR', 'ACCESSORY'];
    let equipmentSVG = `
      <g class="equipment">
        <!-- Título da seção -->
        <text x="30" y="${startY - 10}" fill="${config.textColor}" 
              font-family="Arial, sans-serif" font-size="14" font-weight="bold">
          ⚔️ Equipamentos
        </text>
    `;
    
    equipSlots.forEach((slot, index) => {
      const x = 30 + (index * 80);
      const y = startY;
      const equippedItem = equippedItems.find(item => this.getItemSlot(item) === slot);
      
      equipmentSVG += this.createEquipmentSlot(x, y, slot, equippedItem, config);
    });
    
    equipmentSVG += '</g>';
    return equipmentSVG;
  }

  /**
   * Cria um slot de equipamento
   */
  createEquipmentSlot(x, y, slot, item, config) {
    const slotColor = item ? config.rarityColors[item.rarity] : config.gridColor;
    const icon = config.categoryIcons[slot] || '📦';
    
    return `
      <g class="equipment-slot">
        <!-- Slot background -->
        <rect x="${x}" y="${y}" width="64" height="64" 
              fill="${slotColor}" stroke="${config.borderColor}" stroke-width="2" rx="8" 
              ${item ? 'filter="url(#glow)"' : ''}/>
        
        <!-- Item icon -->
        <text x="${x + 32}" y="${y + 40}" text-anchor="middle" 
              font-size="24" fill="${config.textColor}">
          ${item ? this.getItemIcon(item) : icon}
        </text>
        
        <!-- Slot label -->
        <text x="${x + 32}" y="${y + 80}" text-anchor="middle" 
              fill="${config.textColor}" font-family="Arial, sans-serif" font-size="10">
          ${this.formatSlotName(slot)}
        </text>
        
        ${item ? this.createItemQuantityBadge(x + 45, y + 5, item.quantity || 1, config) : ''}
      </g>
    `;
  }

  /**
   * Cria o grid principal do inventário
   */
  createInventoryGrid(items, config) {
    const startX = 30;
    const startY = 200;
    const maxRows = Math.ceil(40 / config.itemsPerRow); // Máximo 40 itens
    
    let gridSVG = `
      <g class="inventory-grid">
        <!-- Título da seção -->
        <text x="${startX}" y="${startY - 20}" fill="${config.textColor}" 
              font-family="Arial, sans-serif" font-size="14" font-weight="bold">
          🎒 Itens (${items.length}/40)
        </text>
    `;
    
    // Criar slots vazios primeiro
    for (let row = 0; row < maxRows; row++) {
      for (let col = 0; col < config.itemsPerRow; col++) {
        const x = startX + (col * (config.itemSize + config.itemSpacing));
        const y = startY + (row * (config.itemSize + config.itemSpacing));
        
        gridSVG += `
          <rect x="${x}" y="${y}" width="${config.itemSize}" height="${config.itemSize}" 
                fill="${config.gridColor}" stroke="${config.borderColor}" stroke-width="1" rx="4"/>
        `;
      }
    }
    
    // Adicionar itens
    items.slice(0, 40).forEach((item, index) => {
      const row = Math.floor(index / config.itemsPerRow);
      const col = index % config.itemsPerRow;
      const x = startX + (col * (config.itemSize + config.itemSpacing));
      const y = startY + (row * (config.itemSize + config.itemSpacing));
      
      gridSVG += this.createInventoryItem(x, y, item, config);
    });
    
    gridSVG += '</g>';
    return gridSVG;
  }

  /**
   * Cria um item do inventário
   */
  createInventoryItem(x, y, item, config) {
    const rarityColor = config.rarityColors[item.rarity] || config.rarityColors.COMMON;
    const icon = this.getItemIcon(item);
    
    return `
      <g class="inventory-item">
        <!-- Item background -->
        <rect x="${x}" y="${y}" width="${config.itemSize}" height="${config.itemSize}" 
              fill="url(#grad_${item.rarity.toLowerCase()})" 
              stroke="${rarityColor}" stroke-width="2" rx="6" 
              filter="url(#shadow)"/>
        
        <!-- Item icon -->
        <text x="${x + config.itemSize/2}" y="${y + config.itemSize/2 + 8}" 
              text-anchor="middle" font-size="20" fill="${config.textColor}">
          ${icon}
        </text>
        
        <!-- Quantity badge -->
        ${item.quantity > 1 ? this.createItemQuantityBadge(x + config.itemSize - 15, y + 5, item.quantity, config) : ''}
        
        <!-- Rarity indicator -->
        <rect x="${x}" y="${y + config.itemSize - 4}" width="${config.itemSize}" height="4" 
              fill="${rarityColor}" rx="2"/>
      </g>
    `;
  }

  /**
   * Cria badge de quantidade
   */
  createItemQuantityBadge(x, y, quantity, config) {
    if (quantity <= 1) return '';
    
    const badgeWidth = quantity >= 100 ? 24 : quantity >= 10 ? 20 : 16;
    
    return `
      <g class="quantity-badge">
        <rect x="${x - badgeWidth/2}" y="${y}" width="${badgeWidth}" height="14" 
              fill="#000" stroke="${config.borderColor}" stroke-width="1" rx="7" opacity="0.8"/>
        <text x="${x}" y="${y + 10}" text-anchor="middle" 
              fill="#fff" font-family="Arial, sans-serif" font-size="10" font-weight="bold">
          ${quantity > 999 ? '999+' : quantity}
        </text>
      </g>
    `;
  }

  /**
   * Cria painel de estatísticas
   */
  createStatsPanel(stats, config) {
    const startX = config.width - 180;
    const startY = 200;
    
    return `
      <g class="stats-panel">
        <!-- Background -->
        <rect x="${startX - 10}" y="${startY - 30}" width="170" height="200" 
              fill="${config.gridColor}" stroke="${config.borderColor}" stroke-width="2" rx="8"/>
        
        <!-- Título -->
        <text x="${startX}" y="${startY - 10}" fill="${config.textColor}" 
              font-family="Arial, sans-serif" font-size="14" font-weight="bold">
          📊 Estatísticas
        </text>
        
        <!-- Stats -->
        ${this.createStatBar(startX, startY + 10, '❤️ HP', stats.hp, stats.maxHp, '#ef4444', config)}
        ${this.createStatBar(startX, startY + 35, '⚔️ ATK', stats.atk, 999, '#f97316', config)}
        ${this.createStatBar(startX, startY + 60, '🛡️ DEF', stats.def, 999, '#3b82f6', config)}
        ${this.createStatBar(startX, startY + 85, '⚡ SPD', stats.spd, 999, '#10b981', config)}
        ${this.createStatBar(startX, startY + 110, '🍀 LCK', stats.lck, 999, '#8b5cf6', config)}
        
        <!-- Level and XP -->
        <text x="${startX}" y="${startY + 145}" fill="${config.textColor}" 
              font-family="Arial, sans-serif" font-size="12">
          🌟 Nível ${stats.level}
        </text>
        <text x="${startX}" y="${startY + 160}" fill="${config.textColor}" 
              font-family="Arial, sans-serif" font-size="10">
          💰 ${stats.coins} moedas
        </text>
      </g>
    `;
  }

  /**
   * Cria uma barra de estatística
   */
  createStatBar(x, y, label, current, max, color, config) {
    const barWidth = 120;
    const percentage = Math.min(current / max, 1);
    const fillWidth = barWidth * percentage;
    
    return `
      <g class="stat-bar">
        <!-- Label -->
        <text x="${x}" y="${y - 2}" fill="${config.textColor}" 
              font-family="Arial, sans-serif" font-size="11">
          ${label}
        </text>
        
        <!-- Background bar -->
        <rect x="${x}" y="${y + 2}" width="${barWidth}" height="12" 
              fill="#2a2a2a" stroke="${config.borderColor}" stroke-width="1" rx="6"/>
        
        <!-- Fill bar -->
        <rect x="${x + 1}" y="${y + 3}" width="${fillWidth - 2}" height="10" 
              fill="${color}" rx="5"/>
        
        <!-- Value text -->
        <text x="${x + barWidth + 5}" y="${y + 12}" fill="${config.textColor}" 
              font-family="Arial, sans-serif" font-size="10">
          ${current}${max !== 999 ? `/${max}` : ''}
        </text>
      </g>
    `;
  }

  /**
   * Cria o rodapé
   */
  createFooter(config) {
    return `
      <g class="footer">
        <text x="${config.width / 2}" y="${config.height - 20}" text-anchor="middle" 
              fill="${config.textColor}" font-family="Arial, sans-serif" font-size="10" opacity="0.7">
          MaryBot • Sistema de Inventário Visual
        </text>
      </g>
    `;
  }

  /**
   * Obtém o ícone de um item baseado na categoria
   */
  getItemIcon(item) {
    const icons = {
      // Armas
      sword: '⚔️', bow: '🏹', staff: '🪄', dagger: '🗡️',
      // Armaduras
      helmet: '⛑️', chestplate: '🦺', boots: '🥾', shield: '🛡️',
      // Acessórios
      ring: '💍', necklace: '📿', amulet: '🧿',
      // Consumíveis
      potion: '🧪', food: '🍖', scroll: '📜',
      // Materiais
      ore: '🪨', gem: '💎', crystal: '🔮'
    };
    
    // Tentar encontrar por ID do item
    for (const [key, icon] of Object.entries(icons)) {
      if (item.id.toLowerCase().includes(key)) {
        return icon;
      }
    }
    
    // Fallback para categoria
    return this.config.categoryIcons[item.category] || '📦';
  }

  /**
   * Obtém o slot de um item
   */
  getItemSlot(item) {
    if (item.category === 'WEAPON') return 'WEAPON';
    if (item.category === 'ARMOR') return 'ARMOR';
    if (item.category === 'ACCESSORY') return 'ACCESSORY';
    return null;
  }

  /**
   * Formata o nome do slot
   */
  formatSlotName(slot) {
    const names = {
      WEAPON: 'Arma',
      ARMOR: 'Armadura',
      ACCESSORY: 'Acessório'
    };
    return names[slot] || slot;
  }
}

// Instância global do renderizador de inventário
export const inventoryRenderer = new InventoryRenderer();