// Sistema de renderização visual para combates
// Gera interfaces de batalha em SVG e converte para PNG
import Sharp from 'sharp';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class CombatRenderer {
  constructor() {
    this.baseWidth = 800;
    this.baseHeight = 600;
    this.assetsPath = path.join(__dirname, '../../assets');
    
    // Cores temáticas para diferentes tipos de combate
    this.themes = {
      default: {
        background: '#2c3e50',
        playerArea: '#3498db',
        mobArea: '#e74c3c',
        hpBar: '#27ae60',
        hpBarLow: '#f39c12',
        hpBarCritical: '#e74c3c',
        manaBar: '#9b59b6',
        text: '#ffffff',
        border: '#34495e'
      },
      forest: {
        background: '#1e3a2e',
        playerArea: '#2ecc71',
        mobArea: '#8e44ad',
        hpBar: '#27ae60',
        hpBarLow: '#f39c12',
        hpBarCritical: '#e74c3c',
        manaBar: '#3498db',
        text: '#ffffff',
        border: '#16a085'
      },
      volcano: {
        background: '#8B0000',
        playerArea: '#FF4500',
        mobArea: '#DC143C',
        hpBar: '#FF6347',
        hpBarLow: '#FF8C00',
        hpBarCritical: '#B22222',
        manaBar: '#4169E1',
        text: '#FFFACD',
        border: '#A0522D'
      },
      crypt: {
        background: '#2F2F2F',
        playerArea: '#696969',
        mobArea: '#8B008B',
        hpBar: '#32CD32',
        hpBarLow: '#FFD700',
        hpBarCritical: '#FF0000',
        manaBar: '#9370DB',
        text: '#F0F8FF',
        border: '#708090'
      },
      glacier: {
        background: '#1E90FF',
        playerArea: '#87CEEB',
        mobArea: '#4682B4',
        hpBar: '#00CED1',
        hpBarLow: '#20B2AA',
        hpBarCritical: '#FF69B4',
        manaBar: '#8A2BE2',
        text: '#F0FFFF',
        border: '#B0C4DE'
      }
    };
  }

  /**
   * Gera uma imagem de combate completa
   * @param {Object} battleState - Estado atual da batalha
   * @param {string} biome - Bioma atual para tema visual
   * @param {Object} options - Opções de renderização
   */
  async generateBattleImage(battleState, biome = 'default', options = {}) {
    const theme = this.themes[biome.toLowerCase()] || this.themes.default;
    const svg = this.generateBattleSVG(battleState, theme, options);
    
    return await this.svgToPng(svg, {
      width: this.baseWidth,
      height: this.baseHeight,
      quality: 90
    });
  }

  /**
   * Gera SVG da interface de batalha
   */
  generateBattleSVG(battleState, theme, options = {}) {
    const { player, mob, turn, logs } = battleState;
    const showLogs = options.showLogs !== false;
    const logCount = options.logCount || 6;
    
    // Calcular porcentagens de HP/MP
    const playerHpPercent = Math.max(0, (player.currentHp / player.maxHp) * 100);
    const mobHpPercent = Math.max(0, (mob.currentHp / mob.maxHp) * 100);
    
    // Determinar cores das barras de HP
    const playerHpColor = this.getHpBarColor(playerHpPercent, theme);
    const mobHpColor = this.getHpBarColor(mobHpPercent, theme);
    
    // Logs recentes para exibição
    const recentLogs = showLogs ? logs.slice(-logCount) : [];
    
    let svg = `
      <svg width="${this.baseWidth}" height="${this.baseHeight}" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="bgGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" style="stop-color:${theme.background};stop-opacity:1" />
            <stop offset="100%" style="stop-color:${this.darkenColor(theme.background, 0.3)};stop-opacity:1" />
          </linearGradient>
          <filter id="glow">
            <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
            <feMerge> 
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>
        
        <!-- Background -->
        <rect width="100%" height="100%" fill="url(#bgGradient)"/>
        
        <!-- Header: Turn Info -->
        ${this.generateTurnHeader(turn, theme)}
        
        <!-- Player Area (Left) -->
        ${this.generatePlayerArea(player, playerHpPercent, playerHpColor, theme)}
        
        <!-- VS Divider -->
        ${this.generateVSDivider(theme)}
        
        <!-- Mob Area (Right) -->
        ${this.generateMobArea(mob, mobHpPercent, mobHpColor, theme)}
        
        <!-- Battle Logs (Bottom) -->
        ${showLogs ? this.generateBattleLogs(recentLogs, theme) : ''}
        
        <!-- Status Effects -->
        ${this.generateStatusEffects(player, mob, theme)}
      </svg>
    `;
    
    return svg;
  }

  generateTurnHeader(turn, theme) {
    return `
      <g id="turnHeader">
        <rect x="10" y="10" width="${this.baseWidth - 20}" height="50" 
              fill="${theme.border}" stroke="${theme.text}" stroke-width="2" rx="10"/>
        <text x="${this.baseWidth / 2}" y="35" text-anchor="middle" 
              fill="${theme.text}" font-family="Arial, sans-serif" font-size="20" font-weight="bold">
          ⚔️ TURNO ${turn} ⚔️
        </text>
      </g>
    `;
  }

  generatePlayerArea(player, hpPercent, hpColor, theme) {
    const areaWidth = 350;
    const areaHeight = 200;
    const x = 20;
    const y = 80;
    
    return `
      <g id="playerArea">
        <!-- Player Background -->
        <rect x="${x}" y="${y}" width="${areaWidth}" height="${areaHeight}" 
              fill="${theme.playerArea}" stroke="${theme.border}" stroke-width="3" rx="15" opacity="0.8"/>
        
        <!-- Player Name -->
        <text x="${x + 20}" y="${y + 30}" fill="${theme.text}" font-family="Arial, sans-serif" 
              font-size="18" font-weight="bold">👤 ${player.name || 'Jogador'}</text>
        
        <!-- HP Bar -->
        ${this.generateHPBar(x + 20, y + 40, 280, hpPercent, hpColor, theme)}
        
        <!-- HP Text -->
        <text x="${x + 20}" y="${y + 75}" fill="${theme.text}" font-family="Arial, sans-serif" font-size="14">
          HP: ${player.currentHp}/${player.maxHp}
        </text>
        
        <!-- Stats -->
        <text x="${x + 20}" y="${y + 95}" fill="${theme.text}" font-family="Arial, sans-serif" font-size="12">
          ⚔️ ATK: ${player.atk} 🛡️ DEF: ${player.def} ⚡ SPD: ${player.spd}
        </text>
        
        <!-- Level/Class Info -->
        <text x="${x + 20}" y="${y + 115}" fill="${theme.text}" font-family="Arial, sans-serif" font-size="12">
          📊 Nível ${player.level || 1} • ${player.playerClass || 'Aventureiro'}
        </text>
        
        <!-- Player Sprite Placeholder -->
        <rect x="${x + 200}" y="${y + 80}" width="120" height="100" 
              fill="${theme.border}" stroke="${theme.text}" stroke-width="2" rx="10"/>
        <text x="${x + 260}" y="${y + 135}" text-anchor="middle" fill="${theme.text}" 
              font-family="Arial, sans-serif" font-size="16">👤</text>
      </g>
    `;
  }

  generateMobArea(mob, hpPercent, hpColor, theme) {
    const areaWidth = 350;
    const areaHeight = 200;
    const x = 430;
    const y = 80;
    
    return `
      <g id="mobArea">
        <!-- Mob Background -->
        <rect x="${x}" y="${y}" width="${areaWidth}" height="${areaHeight}" 
              fill="${theme.mobArea}" stroke="${theme.border}" stroke-width="3" rx="15" opacity="0.8"/>
        
        <!-- Mob Name -->
        <text x="${x + 20}" y="${y + 30}" fill="${theme.text}" font-family="Arial, sans-serif" 
              font-size="18" font-weight="bold">👹 ${mob.name}</text>
        
        <!-- HP Bar -->
        ${this.generateHPBar(x + 20, y + 40, 280, hpPercent, hpColor, theme)}
        
        <!-- HP Text -->
        <text x="${x + 20}" y="${y + 75}" fill="${theme.text}" font-family="Arial, sans-serif" font-size="14">
          HP: ${mob.currentHp}/${mob.maxHp}
        </text>
        
        <!-- Stats -->
        <text x="${x + 20}" y="${y + 95}" fill="${theme.text}" font-family="Arial, sans-serif" font-size="12">
          ⚔️ ATK: ${mob.atk} 🛡️ DEF: ${mob.def} ⚡ SPD: ${mob.spd}
        </text>
        
        <!-- Type/Level Info -->
        <text x="${x + 20}" y="${y + 115}" fill="${theme.text}" font-family="Arial, sans-serif" font-size="12">
          📊 Nível ${mob.level || 1} • ${mob.type || 'Mob'} • ${mob.rarity || 'Common'}
        </text>
        
        <!-- Mob Sprite Placeholder -->
        <rect x="${x + 60}" y="${y + 80}" width="120" height="100" 
              fill="${theme.border}" stroke="${theme.text}" stroke-width="2" rx="10"/>
        <text x="${x + 120}" y="${y + 135}" text-anchor="middle" fill="${theme.text}" 
              font-family="Arial, sans-serif" font-size="16">👹</text>
      </g>
    `;
  }

  generateVSDivider(theme) {
    const centerX = this.baseWidth / 2;
    
    return `
      <g id="vsDivider">
        <circle cx="${centerX}" cy="180" r="40" fill="${theme.border}" stroke="${theme.text}" stroke-width="3"/>
        <text x="${centerX}" y="188" text-anchor="middle" fill="${theme.text}" 
              font-family="Arial, sans-serif" font-size="20" font-weight="bold">VS</text>
      </g>
    `;
  }

  generateHPBar(x, y, width, percent, color, theme) {
    const height = 20;
    const fillWidth = (width * percent) / 100;
    
    return `
      <g id="hpBar">
        <!-- Background -->
        <rect x="${x}" y="${y}" width="${width}" height="${height}" 
              fill="${theme.border}" stroke="${theme.text}" stroke-width="1" rx="10"/>
        
        <!-- HP Fill -->
        <rect x="${x + 2}" y="${y + 2}" width="${fillWidth - 4}" height="${height - 4}" 
              fill="${color}" rx="8"/>
        
        <!-- HP Percentage Text -->
        <text x="${x + width/2}" y="${y + height/2 + 5}" text-anchor="middle" 
              fill="${theme.text}" font-family="Arial, sans-serif" font-size="12" font-weight="bold">
          ${Math.round(percent)}%
        </text>
      </g>
    `;
  }

  generateBattleLogs(logs, theme) {
    const logAreaHeight = 150;
    const logY = this.baseHeight - logAreaHeight - 10;
    
    let logsHTML = `
      <g id="battleLogs">
        <!-- Logs Background -->
        <rect x="10" y="${logY}" width="${this.baseWidth - 20}" height="${logAreaHeight}" 
              fill="${theme.border}" stroke="${theme.text}" stroke-width="2" rx="10" opacity="0.9"/>
        
        <!-- Logs Title -->
        <text x="30" y="${logY + 25}" fill="${theme.text}" font-family="Arial, sans-serif" 
              font-size="16" font-weight="bold">📜 Log de Batalha:</text>
    `;
    
    // Adicionar cada log
    logs.forEach((log, index) => {
      const logY_pos = logY + 45 + (index * 18);
      // Limpar emojis e markdown para renderização SVG
      const cleanLog = log.replace(/[*_~`]/g, '').substring(0, 80);
      
      logsHTML += `
        <text x="30" y="${logY_pos}" fill="${theme.text}" font-family="Arial, sans-serif" 
              font-size="12">• ${cleanLog}</text>
      `;
    });
    
    logsHTML += `</g>`;
    return logsHTML;
  }

  generateStatusEffects(player, mob, theme) {
    let statusHTML = `<g id="statusEffects">`;
    
    // Status do jogador
    if (player.statusEffects && player.statusEffects.length > 0) {
      player.statusEffects.forEach((status, index) => {
        const x = 30 + (index * 30);
        const y = 300;
        statusHTML += `
          <rect x="${x}" y="${y}" width="25" height="25" fill="${theme.mobArea}" 
                stroke="${theme.text}" stroke-width="1" rx="5"/>
          <text x="${x + 12.5}" y="${y + 17}" text-anchor="middle" fill="${theme.text}" 
                font-family="Arial, sans-serif" font-size="12">${this.getStatusIcon(status.name)}</text>
        `;
      });
    }
    
    // Status do mob
    if (mob.statusEffects && mob.statusEffects.length > 0) {
      mob.statusEffects.forEach((status, index) => {
        const x = 740 - (index * 30);
        const y = 300;
        statusHTML += `
          <rect x="${x}" y="${y}" width="25" height="25" fill="${theme.playerArea}" 
                stroke="${theme.text}" stroke-width="1" rx="5"/>
          <text x="${x + 12.5}" y="${y + 17}" text-anchor="middle" fill="${theme.text}" 
                font-family="Arial, sans-serif" font-size="12">${this.getStatusIcon(status.name)}</text>
        `;
      });
    }
    
    statusHTML += `</g>`;
    return statusHTML;
  }

  getHpBarColor(percent, theme) {
    if (percent > 60) return theme.hpBar;
    if (percent > 25) return theme.hpBarLow;
    return theme.hpBarCritical;
  }

  getStatusIcon(statusName) {
    const icons = {
      'POISONED': '🟢',
      'BURNED': '🔥',
      'FROZEN': '🧊',
      'STUNNED': '💫',
      'BLEEDING': '🩸',
      'REGENERATING': '💚',
      'BLESSED': '✨',
      'CURSED': '💀',
      'HASTE': '⚡',
      'SLOW': '🐌'
    };
    return icons[statusName] || '❓';
  }

  darkenColor(color, percent) {
    // Função simples para escurecer uma cor hex
    const num = parseInt(color.replace("#", ""), 16);
    const amt = Math.round(2.55 * percent * 100);
    const R = (num >> 16) - amt;
    const G = (num >> 8 & 0x00FF) - amt;
    const B = (num & 0x0000FF) - amt;
    return "#" + (0x1000000 + (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 +
      (G < 255 ? G < 1 ? 0 : G : 255) * 0x100 +
      (B < 255 ? B < 1 ? 0 : B : 255)).toString(16).slice(1);
  }

  /**
   * Converte SVG para PNG usando Sharp
   */
  async svgToPng(svgString, options = {}) {
    try {
      const { width = 800, height = 600, quality = 90 } = options;
      
      const pngBuffer = await Sharp(Buffer.from(svgString))
        .resize(width, height, {
          fit: 'contain',
          background: { r: 0, g: 0, b: 0, alpha: 0 }
        })
        .png({ quality })
        .toBuffer();
      
      return pngBuffer;
    } catch (error) {
      console.error('Erro ao converter SVG para PNG:', error);
      throw error;
    }
  }

  /**
   * Gera uma imagem simplificada de status da batalha
   */
  async generateQuickStatus(player, mob, theme = 'default') {
    const themeColors = this.themes[theme] || this.themes.default;
    const playerHpPercent = Math.max(0, (player.currentHp / player.maxHp) * 100);
    const mobHpPercent = Math.max(0, (mob.currentHp / mob.maxHp) * 100);
    
    const svg = `
      <svg width="400" height="200" xmlns="http://www.w3.org/2000/svg">
        <rect width="100%" height="100%" fill="${themeColors.background}"/>
        
        <!-- Player HP -->
        <text x="20" y="30" fill="${themeColors.text}" font-family="Arial" font-size="14">
          👤 ${player.name || 'Jogador'}
        </text>
        ${this.generateHPBar(20, 40, 160, playerHpPercent, this.getHpBarColor(playerHpPercent, themeColors), themeColors)}
        
        <!-- Mob HP -->
        <text x="220" y="30" fill="${themeColors.text}" font-family="Arial" font-size="14">
          👹 ${mob.name}
        </text>
        ${this.generateHPBar(220, 40, 160, mobHpPercent, this.getHpBarColor(mobHpPercent, themeColors), themeColors)}
        
        <!-- VS -->
        <text x="200" y="140" text-anchor="middle" fill="${themeColors.text}" 
              font-family="Arial" font-size="24" font-weight="bold">⚔️</text>
      </svg>
    `;
    
    return await this.svgToPng(svg, { width: 400, height: 200 });
  }
}

// Instância global do renderizador de combate
export const combatRenderer = new CombatRenderer();