// Sistema de renderização visual para estatísticas e equipamentos
// Gera interface focada em stats do jogador em SVG e converte para PNG
import sharp from 'sharp';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class StatsRenderer {
  constructor() {
    this.config = {
      width: 400,
      height: 300,
      backgroundColor: '#2f3136',
      borderColor: '#40444b',
      textColor: '#ffffff',
      accentColor: '#5865f2',
      successColor: '#57f287',
      warningColor: '#fee75c',
      errorColor: '#ed4245',
      fonts: {
        title: { size: 16, weight: 'bold' },
        subtitle: { size: 14, weight: 'normal' },
        body: { size: 12, weight: 'normal' },
        small: { size: 10, weight: 'normal' }
      }
    };

    this.rarityColors = {
      'COMMON': '#9e9e9e',
      'UNCOMMON': '#4caf50', 
      'RARE': '#2196f3',
      'EPIC': '#9c27b0',
      'LEGENDARY': '#ff9800',
      'MYTHIC': '#e6cc80'
    };
  }

  /**
   * Gera uma imagem visual das estatísticas e equipamentos
   * @param {Object} playerData - Dados do jogador
   * @param {Object} options - Opções de renderização
   * @returns {Buffer} Buffer da imagem PNG
   */
  async generateStatsImage(playerData, options = {}) {
    const config = { ...this.config, ...options };
    
    try {
      // Gerar SVG das estatísticas
      const svg = this.createStatsSVG(playerData, config);
      
      // Converter SVG para PNG
      const pngBuffer = await sharp(Buffer.from(svg))
        .png({ quality: 90 })
        .toBuffer();
      
      return pngBuffer;
    } catch (error) {
      console.error('Erro ao gerar imagem das estatísticas:', error);
      throw error;
    }
  }

  /**
   * Cria o SVG das estatísticas
   * @param {Object} playerData - Dados do jogador
   * @param {Object} config - Configurações
   * @returns {string} SVG como string
   */
  createStatsSVG(playerData, config) {
    const { stats, equippedItems, username } = playerData;
    
    // Escapar caracteres especiais XML/HTML
    const safeName = this.escapeXML(username || 'Jogador');
    
    let svgContent = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${config.width}" height="${config.height}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    ${this.createGradientDefs(config)}
    ${this.createFilterDefs()}
  </defs>
  
  <!-- Background -->
  <rect width="100%" height="100%" fill="${config.backgroundColor}" rx="8"/>
  <rect x="2" y="2" width="${config.width-4}" height="${config.height-4}" 
        fill="none" stroke="${config.borderColor}" stroke-width="2" rx="6"/>
  
  <!-- Header -->
  <rect x="10" y="10" width="${config.width-20}" height="30" fill="${config.accentColor}" rx="4"/>
  <text x="20" y="30" fill="white" font-size="${config.fonts.title.size}" font-weight="${config.fonts.title.weight}">
    Stats e Equipamentos - ${safeName}
  </text>
  
  ${this.renderStatsPanel(stats, config)}
  ${this.renderEquipmentPanel(equippedItems, config)}
</svg>`;
    
    return svgContent;
  }

  /**
   * Renderiza o painel de estatísticas
   */
  renderStatsPanel(stats, config) {
    const startY = 55;
    const lineHeight = 18;
    
    const statsList = [
      { label: 'Nivel:', value: stats?.level || 1, color: config.successColor },
      { label: 'XP:', value: `${stats?.experience || 0}`, color: config.textColor },
      { label: 'HP:', value: `${stats?.health || 100}`, color: config.errorColor },
      { label: 'MP:', value: `${stats?.mana || 50}`, color: config.accentColor },
      { label: 'Ataque:', value: stats?.attack || 10, color: config.warningColor },
      { label: 'Defesa:', value: stats?.defense || 5, color: config.successColor },
      { label: 'Ouro:', value: `${stats?.gold || 0} moedas`, color: config.warningColor }
    ];

    let statsContent = `
  <!-- Stats Panel -->
  <text x="20" y="${startY}" fill="${config.accentColor}" font-size="${config.fonts.subtitle.size}" font-weight="bold">
    Estatisticas
  </text>
`;

    statsList.forEach((stat, index) => {
      const y = startY + 25 + (index * lineHeight);
      const safeLabel = this.escapeXML(stat.label);
      const safeValue = this.escapeXML(String(stat.value));
      
      statsContent += `
  <text x="30" y="${y}" fill="${config.textColor}" font-size="${config.fonts.body.size}">
    ${safeLabel}
  </text>
  <text x="120" y="${y}" fill="${stat.color}" font-size="${config.fonts.body.size}" font-weight="bold">
    ${safeValue}
  </text>
`;
    });

    return statsContent;
  }

  /**
   * Renderiza o painel de equipamentos
   */
  renderEquipmentPanel(equippedItems, config) {
    const startY = 55;
    const startX = 220;
    
    let equipContent = `
  <!-- Equipment Panel -->
  <text x="${startX}" fill="${config.accentColor}" y="${startY}" font-size="${config.fonts.subtitle.size}" font-weight="bold">
    Equipamentos
  </text>
`;

    const equipmentSlots = [
      { slot: 'HELMET', icon: 'Capacete', label: 'Capacete' },
      { slot: 'ARMOR', icon: 'Armadura', label: 'Armadura' },
      { slot: 'WEAPON', icon: 'Arma', label: 'Arma' },
      { slot: 'ACCESSORY', icon: 'Acessorio', label: 'Acessorio' }
    ];

    equipmentSlots.forEach((slotInfo, index) => {
      const y = startY + 25 + (index * 20);
      const equippedItem = equippedItems?.find(item => item.slot === slotInfo.slot);
      
      if (equippedItem) {
        const rarity = equippedItem.item?.rarity || 'COMMON';
        const color = this.rarityColors[rarity] || config.textColor;
        const safeName = this.escapeXML(equippedItem.item?.name || 'Item');
        
        equipContent += `
  <text x="${startX + 10}" y="${y}" fill="${config.textColor}" font-size="${config.fonts.small.size}">
    ${slotInfo.label}:
  </text>
  <text x="${startX + 10}" y="${y + 12}" fill="${color}" font-size="${config.fonts.small.size}" font-weight="bold">
    ${safeName}
  </text>
`;
      } else {
        equipContent += `
  <text x="${startX + 10}" y="${y}" fill="${config.textColor}" font-size="${config.fonts.small.size}">
    ${slotInfo.label}:
  </text>
  <text x="${startX + 10}" y="${y + 12}" fill="#666" font-size="${config.fonts.small.size}">
    Vazio
  </text>
`;
      }
    });

    return equipContent;
  }

  /**
   * Cria definições de gradientes
   */
  createGradientDefs(config) {
    return `
<linearGradient id="headerGradient" x1="0%" y1="0%" x2="100%" y2="0%">
  <stop offset="0%" style="stop-color:${config.accentColor};stop-opacity:1" />
  <stop offset="100%" style="stop-color:${config.accentColor}88;stop-opacity:1" />
</linearGradient>

<linearGradient id="statsGradient" x1="0%" y1="0%" x2="0%" y2="100%">
  <stop offset="0%" style="stop-color:${config.backgroundColor};stop-opacity:1" />
  <stop offset="100%" style="stop-color:#36393f;stop-opacity:1" />
</linearGradient>
    `;
  }

  /**
   * Cria definições de filtros
   */
  createFilterDefs() {
    return `
<filter id="dropShadow" x="-20%" y="-20%" width="140%" height="140%">
  <feDropShadow dx="2" dy="2" stdDeviation="3" flood-opacity="0.3"/>
</filter>

<filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
  <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
  <feMerge> 
    <feMergeNode in="coloredBlur"/>
    <feMergeNode in="SourceGraphic"/>
  </feMerge>
</filter>
    `;
  }

  /**
   * Escapa caracteres especiais para XML/SVG
   * @param {string} text - Texto para escapar
   * @returns {string} Texto escapado
   */
  escapeXML(text) {
    if (!text) return '';
    return String(text)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;')
      .replace(/[\u{1F000}-\u{1F9FF}]/gu, '') // Remove emojis que causam problemas
      .replace(/[\u{2600}-\u{26FF}]/gu, '') // Remove símbolos diversos
      .replace(/[\u{2700}-\u{27BF}]/gu, ''); // Remove dingbats
  }
}

// Instância global do renderizador de estatísticas
export const statsRenderer = new StatsRenderer();