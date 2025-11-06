// Renderizador de calendário de anime
import sharp from 'sharp';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class CalendarRenderer {
  constructor() {
    this.width = 1400;
    this.height = 1000;
    this.cellSize = 160;
    this.padding = 20;
    this.headerHeight = 120;
    
    // Cores do tema
    this.colors = {
      background: '#1a1a2e',
      header: '#16213e',
      cellBg: '#0f3460',
      cellBgHover: '#533483',
      text: '#eaeaea',
      accent: '#e94560',
      border: '#533483',
      today: '#00d9ff'
    };
  }

  /**
   * Renderiza o calendário do mês atual
   */
  async renderCalendar(month, year, characterData, todayDay = null) {
    const svg = this.generateCalendarSVG(month, year, characterData, todayDay);
    
    // Converter SVG para PNG usando sharp
    const buffer = await sharp(Buffer.from(svg))
      .png()
      .toBuffer();
    
    return buffer;
  }

  /**
   * Gera o SVG do calendário
   */
  generateCalendarSVG(month, year, characterData, todayDay) {
    const monthNames = [
      'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];
    
    const daysInMonth = new Date(year, month, 0).getDate();
    const firstDay = new Date(year, month - 1, 1).getDay();
    
    // Calcular dimensões
    const rows = Math.ceil((daysInMonth + firstDay) / 7);
    const calendarHeight = this.headerHeight + (rows * this.cellSize) + this.padding * 2;
    
    let svg = `
      <svg width="${this.width}" height="${calendarHeight}" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="headerGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" style="stop-color:${this.colors.header};stop-opacity:1" />
            <stop offset="100%" style="stop-color:${this.colors.accent};stop-opacity:0.8" />
          </linearGradient>
          
          <filter id="shadow">
            <feDropShadow dx="0" dy="2" stdDeviation="4" flood-opacity="0.3"/>
          </filter>
        </defs>
        
        <!-- Background -->
        <rect width="${this.width}" height="${calendarHeight}" fill="${this.colors.background}"/>
        
        <!-- Header -->
        <rect width="${this.width}" height="${this.headerHeight}" fill="url(#headerGrad)" filter="url(#shadow)"/>
        <text x="${this.width / 2}" y="50" 
              font-family="Arial, sans-serif" 
              font-size="36" 
              font-weight="bold" 
              fill="${this.colors.text}" 
              text-anchor="middle">
          🎌 Calendário de Anime - ${monthNames[month - 1]} ${year}
        </text>
        <text x="${this.width / 2}" y="90" 
              font-family="Arial, sans-serif" 
              font-size="16" 
              fill="${this.colors.text}" 
              text-anchor="middle"
              opacity="0.8">
          Cada dia um personagem especial
        </text>
        
        <!-- Days of week header -->
        ${this.renderWeekDays()}
        
        <!-- Calendar grid -->
        ${this.renderCalendarDays(daysInMonth, firstDay, characterData, todayDay)}
      </svg>
    `;
    
    return svg;
  }

  /**
   * Renderiza os dias da semana
   */
  renderWeekDays() {
    const days = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    const startY = this.headerHeight + this.padding;
    
    return days.map((day, i) => {
      const x = this.padding + (i * this.cellSize) + (this.cellSize / 2);
      return `
        <text x="${x}" y="${startY + 25}" 
              font-family="Arial, sans-serif" 
              font-size="14" 
              font-weight="bold"
              fill="${this.colors.accent}" 
              text-anchor="middle">
          ${day}
        </text>
      `;
    }).join('');
  }

  /**
   * Renderiza os dias do calendário
   */
  renderCalendarDays(daysInMonth, firstDay, characterData, todayDay) {
    const startY = this.headerHeight + this.padding + 40;
    let svgContent = '';
    
    for (let day = 1; day <= daysInMonth; day++) {
      const position = day + firstDay - 1;
      const row = Math.floor(position / 7);
      const col = position % 7;
      
      const x = this.padding + (col * this.cellSize);
      const y = startY + (row * this.cellSize);
      
      const isToday = day === todayDay;
      const character = characterData[day.toString()];
      
      svgContent += this.renderDay(x, y, day, character, isToday);
    }
    
    return svgContent;
  }

  /**
   * Renderiza um dia individual
   */
  renderDay(x, y, day, character, isToday) {
    const cellColor = isToday ? this.colors.today : this.colors.cellBg;
    const borderColor = isToday ? this.colors.today : this.colors.border;
    const borderWidth = isToday ? 3 : 1;
    
    // Truncar nome se muito longo
    const characterName = character ? this.truncateText(character.name, 18) : '';
    const animeName = character ? this.truncateText(character.anime, 16) : '';
    
    return `
      <g>
        <!-- Cell background -->
        <rect x="${x}" y="${y}" 
              width="${this.cellSize - 5}" 
              height="${this.cellSize - 5}" 
              fill="${cellColor}" 
              stroke="${borderColor}"
              stroke-width="${borderWidth}"
              rx="8"
              filter="url(#shadow)"/>
        
        <!-- Day number -->
        <text x="${x + 10}" y="${y + 25}" 
              font-family="Arial, sans-serif" 
              font-size="20" 
              font-weight="bold"
              fill="${isToday ? this.colors.background : this.colors.accent}">
          ${day}
        </text>
        
        ${character ? `
          <!-- Character icon -->
          <circle cx="${x + this.cellSize - 35}" cy="${y + 20}" r="12" fill="${this.colors.accent}" opacity="0.3"/>
          <text x="${x + this.cellSize - 35}" y="${y + 25}" 
                font-family="Arial, sans-serif" 
                font-size="14" 
                fill="${this.colors.text}"
                text-anchor="middle">
            🎭
          </text>
          
          <!-- Character name -->
          <text x="${x + 10}" y="${y + 55}" 
                font-family="Arial, sans-serif" 
                font-size="11" 
                font-weight="bold"
                fill="${this.colors.text}">
            ${characterName}
          </text>
          
          <!-- Anime name -->
          <text x="${x + 10}" y="${y + 75}" 
                font-family="Arial, sans-serif" 
                font-size="9" 
                fill="${this.colors.text}"
                opacity="0.7">
            ${animeName}
          </text>
          
          <!-- Trait -->
          <text x="${x + 10}" y="${y + 95}" 
                font-family="Arial, sans-serif" 
                font-size="8" 
                fill="${this.colors.accent}"
                opacity="0.9">
            ✨ ${character.trait}
          </text>
          
          <!-- Quote preview -->
          <text x="${x + 10}" y="${y + 115}" 
                font-family="Arial, sans-serif" 
                font-size="8" 
                fill="${this.colors.text}"
                opacity="0.6"
                font-style="italic">
            "${this.truncateText(character.quote, 22)}"
          </text>
        ` : ''}
      </g>
    `;
  }

  /**
   * Trunca texto para caber na célula
   */
  truncateText(text, maxLength) {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength - 3) + '...';
  }

  /**
   * Renderiza card de personagem individual
   */
  async renderCharacterCard(character, day, imageUrl = null) {
    const width = 800;
    const height = 600;
    
    const svg = `
      <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="cardGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:${this.colors.header};stop-opacity:1" />
            <stop offset="100%" style="stop-color:${this.colors.cellBg};stop-opacity:1" />
          </linearGradient>
          
          <filter id="shadow">
            <feDropShadow dx="0" dy="4" stdDeviation="6" flood-opacity="0.4"/>
          </filter>
        </defs>
        
        <!-- Background -->
        <rect width="${width}" height="${height}" fill="url(#cardGrad)"/>
        
        <!-- Header -->
        <rect x="20" y="20" width="${width - 40}" height="80" 
              fill="${this.colors.header}" rx="12" filter="url(#shadow)"/>
        
        <!-- Day badge -->
        <circle cx="80" cy="60" r="35" fill="${this.colors.accent}" filter="url(#shadow)"/>
        <text x="80" y="72" 
              font-family="Arial, sans-serif" 
              font-size="32" 
              font-weight="bold"
              fill="${this.colors.background}"
              text-anchor="middle">
          ${day}
        </text>
        
        <!-- Character name -->
        <text x="140" y="55" 
              font-family="Arial, sans-serif" 
              font-size="28" 
              font-weight="bold"
              fill="${this.colors.text}">
          ${character.name}
        </text>
        
        <!-- Anime name -->
        <text x="140" y="82" 
              font-family="Arial, sans-serif" 
              font-size="16" 
              fill="${this.colors.accent}">
          📺 ${character.anime}
        </text>
        
        <!-- Content area -->
        <rect x="20" y="120" width="${width - 40}" height="460" 
              fill="${this.colors.cellBg}" rx="12" filter="url(#shadow)" opacity="0.8"/>
        
        <!-- Description -->
        <text x="40" y="160" 
              font-family="Arial, sans-serif" 
              font-size="18" 
              fill="${this.colors.text}"
              font-weight="bold">
          ${character.description}
        </text>
        
        <!-- Trait -->
        <text x="40" y="210" 
              font-family="Arial, sans-serif" 
              font-size="16" 
              fill="${this.colors.accent}">
          ✨ Característica: ${character.trait}
        </text>
        
        <!-- Birthday -->
        ${character.birthday !== 'Desconhecido' ? `
          <text x="40" y="245" 
                font-family="Arial, sans-serif" 
                font-size="14" 
                fill="${this.colors.text}"
                opacity="0.8">
            🎂 Aniversário: ${character.birthday}
          </text>
        ` : ''}
        
        <!-- Quote -->
        <rect x="40" y="270" width="${width - 80}" height="120" 
              fill="${this.colors.header}" rx="8" opacity="0.6"/>
        
        <text x="60" y="300" 
              font-family="Arial, sans-serif" 
              font-size="12" 
              fill="${this.colors.accent}"
              font-weight="bold">
          💬 FRASE ICÔNICA
        </text>
        
        <!-- Quote text (wrapped) -->
        ${this.wrapText(character.quote, 60, 320, 16, width - 120)}
        
        <!-- Footer -->
        <text x="${width / 2}" y="560" 
              font-family="Arial, sans-serif" 
              font-size="12" 
              fill="${this.colors.text}"
              text-anchor="middle"
              opacity="0.5">
          MaryBot • Calendário de Anime 2025
        </text>
      </svg>
    `;
    
    const buffer = await sharp(Buffer.from(svg))
      .png()
      .toBuffer();
    
    return buffer;
  }

  /**
   * Quebra texto em múltiplas linhas
   */
  wrapText(text, x, y, fontSize, maxWidth) {
    const words = text.split(' ');
    const lines = [];
    let currentLine = '';
    
    // Estimativa simples: ~7 pixels por caractere
    const charWidth = fontSize * 0.6;
    const maxChars = Math.floor(maxWidth / charWidth);
    
    for (const word of words) {
      if ((currentLine + word).length <= maxChars) {
        currentLine += word + ' ';
      } else {
        lines.push(currentLine.trim());
        currentLine = word + ' ';
      }
    }
    if (currentLine) lines.push(currentLine.trim());
    
    return lines.map((line, i) => `
      <text x="${x}" y="${y + (i * (fontSize + 8))}" 
            font-family="Arial, sans-serif" 
            font-size="${fontSize}" 
            fill="${this.colors.text}"
            font-style="italic">
        "${line}"
      </text>
    `).join('');
  }
}

// Instância global
export const calendarRenderer = new CalendarRenderer();
