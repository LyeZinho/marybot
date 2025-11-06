// Renderizador de mensagens de boas-vindas personalizadas
// Gera imagens com fundo, avatar e texto de boas-vindas
import sharp from "sharp";

export class WelcomeRenderer {
  constructor() {
    this.width = 1200;
    this.height = 400;
    this.colors = {
      defaultBg: "#1a1a2e",
      overlay: "rgba(0, 0, 0, 0.5)",
      text: "#ffffff",
      accent: "#e94560",
      border: "#533483"
    };
  }

  /**
   * Renderiza a imagem de boas-vindas
   * @param {Object} member - Membro do Discord
   * @param {Object} config - Configurações de boas-vindas
   * @returns {Promise<Buffer>} Buffer da imagem PNG
   */
  async renderWelcome(member, config = {}) {
    try {
      const username = member.user.username;
      const displayName = member.displayName || username;
      const avatarUrl = member.user.displayAvatarURL({ extension: 'png', size: 256 });
      
      // Configurações customizáveis
      const message = config.welcomeMessage || `Bem-vindo(a)!`;
      const backgroundColor = config.welcomeBackgroundColor || this.colors.defaultBg;
      const backgroundUrl = config.welcomeBackgroundUrl || null;

      // Gerar SVG da imagem de boas-vindas
      const svg = await this.generateWelcomeSVG(
        username,
        displayName,
        avatarUrl,
        message,
        backgroundColor,
        backgroundUrl
      );

      // Converter SVG para PNG
      const pngBuffer = await sharp(Buffer.from(svg))
        .png()
        .toBuffer();

      return pngBuffer;
    } catch (error) {
      console.error("Erro ao renderizar boas-vindas:", error);
      throw error;
    }
  }

  /**
   * Gera o SVG da imagem de boas-vindas
   */
  async generateWelcomeSVG(username, displayName, avatarUrl, message, bgColor, bgUrl) {
    // Baixar avatar
    const avatarBuffer = await this.fetchAvatar(avatarUrl);
    const avatarBase64 = avatarBuffer.toString('base64');

    // Baixar background se fornecido
    let backgroundImage = '';
    if (bgUrl) {
      try {
        const bgBuffer = await this.fetchImage(bgUrl);
        const bgBase64 = bgBuffer.toString('base64');
        backgroundImage = `
          <image 
            href="data:image/png;base64,${bgBase64}" 
            width="${this.width}" 
            height="${this.height}"
            preserveAspectRatio="xMidYMid slice"
          />
        `;
      } catch (error) {
        console.error("Erro ao baixar background, usando cor sólida:", error);
      }
    }

    // Truncar mensagem se muito longa
    const truncatedMessage = message.length > 50 
      ? message.substring(0, 47) + '...' 
      : message;

    const svg = `
      <svg width="${this.width}" height="${this.height}" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <!-- Gradiente de fundo -->
          <linearGradient id="bgGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:${bgColor};stop-opacity:1" />
            <stop offset="100%" style="stop-color:${this.darkenColor(bgColor)};stop-opacity:1" />
          </linearGradient>

          <!-- Filtros -->
          <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
            <feDropShadow dx="0" dy="4" stdDeviation="8" flood-opacity="0.6"/>
          </filter>

          <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="3" />
            <feComponentTransfer>
              <feFuncA type="discrete" tableValues="1 1"/>
            </feComponentTransfer>
            <feColorMatrix values="0 0 0 0 0.91  0 0 0 0 0.27  0 0 0 0 0.38  0 0 0 1 0"/>
            <feMerge>
              <feMergeNode/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>

          <!-- Clip path circular para avatar -->
          <clipPath id="avatarClip">
            <circle cx="${this.width / 2}" cy="150" r="80"/>
          </clipPath>
        </defs>

        <!-- Background -->
        ${backgroundImage || `<rect width="${this.width}" height="${this.height}" fill="url(#bgGradient)"/>`}
        
        <!-- Overlay escuro se houver imagem de fundo -->
        ${backgroundImage ? `<rect width="${this.width}" height="${this.height}" fill="${this.colors.overlay}"/>` : ''}

        <!-- Decoração superior -->
        <rect x="0" y="0" width="${this.width}" height="4" fill="${this.colors.accent}"/>
        <rect x="0" y="${this.height - 4}" width="${this.width}" height="4" fill="${this.colors.accent}"/>

        <!-- Container do avatar com borda -->
        <circle 
          cx="${this.width / 2}" 
          cy="150" 
          r="85" 
          fill="none" 
          stroke="${this.colors.border}" 
          stroke-width="4"
          filter="url(#shadow)"
        />
        <circle 
          cx="${this.width / 2}" 
          cy="150" 
          r="82" 
          fill="none" 
          stroke="${this.colors.accent}" 
          stroke-width="2"
        />

        <!-- Avatar do usuário -->
        <image 
          href="data:image/png;base64,${avatarBase64}" 
          x="${this.width / 2 - 80}" 
          y="70" 
          width="160" 
          height="160"
          clip-path="url(#avatarClip)"
        />

        <!-- Mensagem de boas-vindas -->
        <text 
          x="${this.width / 2}" 
          y="270" 
          text-anchor="middle" 
          font-family="Arial, sans-serif" 
          font-size="42" 
          font-weight="bold" 
          fill="${this.colors.accent}"
          filter="url(#glow)"
        >${this.escapeXml(truncatedMessage)}</text>

        <!-- Nome do usuário -->
        <text 
          x="${this.width / 2}" 
          y="320" 
          text-anchor="middle" 
          font-family="Arial, sans-serif" 
          font-size="36" 
          font-weight="600" 
          fill="${this.colors.text}"
          filter="url(#shadow)"
        >${this.escapeXml(displayName)}</text>

        <!-- Decoração inferior -->
        <g transform="translate(${this.width / 2 - 100}, 350)">
          <rect x="0" y="0" width="200" height="3" fill="${this.colors.accent}" rx="1.5"/>
          <circle cx="100" cy="1.5" r="6" fill="${this.colors.accent}"/>
        </g>
      </svg>
    `;

    return svg;
  }

  /**
   * Baixa o avatar do usuário
   */
  async fetchAvatar(url) {
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const buffer = await response.arrayBuffer();
      
      // Redimensionar e converter para PNG
      return await sharp(Buffer.from(buffer))
        .resize(256, 256)
        .png()
        .toBuffer();
    } catch (error) {
      console.error("Erro ao baixar avatar:", error);
      // Retornar avatar padrão (círculo cinza)
      return await this.createDefaultAvatar();
    }
  }

  /**
   * Baixa imagem de background
   */
  async fetchImage(url) {
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const buffer = await response.arrayBuffer();
      
      // Redimensionar para as dimensões da imagem de boas-vindas
      return await sharp(Buffer.from(buffer))
        .resize(this.width, this.height, { fit: 'cover' })
        .png()
        .toBuffer();
    } catch (error) {
      console.error("Erro ao baixar imagem:", error);
      throw error;
    }
  }

  /**
   * Cria avatar padrão
   */
  async createDefaultAvatar() {
    const svg = `
      <svg width="256" height="256" xmlns="http://www.w3.org/2000/svg">
        <circle cx="128" cy="128" r="128" fill="#7289da"/>
        <text 
          x="128" 
          y="150" 
          text-anchor="middle" 
          font-family="Arial" 
          font-size="100" 
          fill="#ffffff"
        >?</text>
      </svg>
    `;
    
    return await sharp(Buffer.from(svg)).png().toBuffer();
  }

  /**
   * Escurece uma cor hex
   */
  darkenColor(hex, percent = 20) {
    // Remove # se presente
    hex = hex.replace('#', '');
    
    // Converte para RGB
    let r = parseInt(hex.substring(0, 2), 16);
    let g = parseInt(hex.substring(2, 4), 16);
    let b = parseInt(hex.substring(4, 6), 16);
    
    // Escurece
    r = Math.max(0, Math.floor(r * (1 - percent / 100)));
    g = Math.max(0, Math.floor(g * (1 - percent / 100)));
    b = Math.max(0, Math.floor(b * (1 - percent / 100)));
    
    // Converte de volta para hex
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
  }

  /**
   * Escapa caracteres XML
   */
  escapeXml(text) {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }
}

// Instância global
export const welcomeRenderer = new WelcomeRenderer();
