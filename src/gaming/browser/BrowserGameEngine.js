/**
 * 🌐 Motor de Jogos no Browser
 * Controla jogos via automação do navegador
 */

import puppeteer from 'puppeteer';
import { logger } from '../../utils/logger.js';

class BrowserGameEngine {
  constructor() {
    this.browser = null;
    this.pages = new Map(); // sessionId -> page
    this.isReady = false;
    
    this.config = {
      headless: true, // Mudar para false para ver o browser
      defaultTimeout: 30000,
      viewport: {
        width: 1280,
        height: 720
      },
      userAgent: 'MaryBot Gaming Engine 1.0'
    };
  }

  /**
   * Inicializar motor do browser
   */
  async initialize() {
    try {
      logger.info('🌐 Iniciando motor do browser...');

      this.browser = await puppeteer.launch({
        headless: this.config.headless,
        defaultViewport: this.config.viewport,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--disable-gpu'
        ]
      });

      this.isReady = true;
      logger.success('✅ Motor do browser inicializado');

    } catch (error) {
      logger.error('❌ Erro ao inicializar motor do browser:', error);
      throw error;
    }
  }

  /**
   * Criar nova página para sessão
   */
  async createPageForSession(sessionId, url = null) {
    if (!this.isReady) {
      throw new Error('Motor do browser não está inicializado');
    }

    try {
      const page = await this.browser.newPage();
      
      // Configurar página
      await page.setUserAgent(this.config.userAgent);
      await page.setDefaultTimeout(this.config.defaultTimeout);
      
      // Configurar interceptação de console
      page.on('console', msg => {
        logger.info(`[BROWSER-${sessionId}] Console: ${msg.text()}`);
      });

      // Configurar interceptação de erros
      page.on('pageerror', error => {
        logger.error(`[BROWSER-${sessionId}] Page Error:`, error.message);
      });

      // Navegar para URL se fornecida
      if (url) {
        await page.goto(url, { waitUntil: 'networkidle0' });
      }

      this.pages.set(sessionId, page);
      logger.info(`🌐 Página criada para sessão ${sessionId}`);
      
      return page;

    } catch (error) {
      logger.error(`❌ Erro ao criar página para sessão ${sessionId}:`, error);
      throw error;
    }
  }

  /**
   * Obter página da sessão
   */
  getPageForSession(sessionId) {
    return this.pages.get(sessionId);
  }

  /**
   * Navegar para URL
   */
  async navigateToUrl(sessionId, url, options = {}) {
    const page = this.getPageForSession(sessionId);
    if (!page) {
      throw new Error(`Página não encontrada para sessão ${sessionId}`);
    }

    try {
      await page.goto(url, {
        waitUntil: 'networkidle0',
        ...options
      });

      logger.info(`🌐 Navegado para ${url} na sessão ${sessionId}`);
      
    } catch (error) {
      logger.error(`❌ Erro ao navegar para ${url}:`, error);
      throw error;
    }
  }

  /**
   * Executar JavaScript na página
   */
  async executeScript(sessionId, script) {
    const page = this.getPageForSession(sessionId);
    if (!page) {
      throw new Error(`Página não encontrada para sessão ${sessionId}`);
    }

    try {
      return await page.evaluate(script);
    } catch (error) {
      logger.error(`❌ Erro ao executar script na sessão ${sessionId}:`, error);
      throw error;
    }
  }

  /**
   * Clicar em elemento
   */
  async clickElement(sessionId, selector, options = {}) {
    const page = this.getPageForSession(sessionId);
    if (!page) {
      throw new Error(`Página não encontrada para sessão ${sessionId}`);
    }

    try {
      await page.waitForSelector(selector, { timeout: 5000 });
      await page.click(selector, options);
      
      logger.info(`🖱️ Clicado em ${selector} na sessão ${sessionId}`);
      
    } catch (error) {
      logger.error(`❌ Erro ao clicar em ${selector}:`, error);
      throw error;
    }
  }

  /**
   * Digitar texto
   */
  async typeText(sessionId, selector, text, options = {}) {
    const page = this.getPageForSession(sessionId);
    if (!page) {
      throw new Error(`Página não encontrada para sessão ${sessionId}`);
    }

    try {
      await page.waitForSelector(selector, { timeout: 5000 });
      await page.type(selector, text, options);
      
      logger.info(`⌨️ Digitado "${text}" em ${selector} na sessão ${sessionId}`);
      
    } catch (error) {
      logger.error(`❌ Erro ao digitar em ${selector}:`, error);
      throw error;
    }
  }

  /**
   * Pressionar tecla
   */
  async pressKey(sessionId, key, options = {}) {
    const page = this.getPageForSession(sessionId);
    if (!page) {
      throw new Error(`Página não encontrada para sessão ${sessionId}`);
    }

    try {
      await page.keyboard.press(key, options);
      logger.info(`⌨️ Pressionado ${key} na sessão ${sessionId}`);
      
    } catch (error) {
      logger.error(`❌ Erro ao pressionar ${key}:`, error);
      throw error;
    }
  }

  /**
   * Capturar screenshot
   */
  async takeScreenshot(sessionId, options = {}) {
    const page = this.getPageForSession(sessionId);
    if (!page) {
      throw new Error(`Página não encontrada para sessão ${sessionId}`);
    }

    try {
      return await page.screenshot({
        type: 'png',
        fullPage: false,
        ...options
      });
      
    } catch (error) {
      logger.error(`❌ Erro ao capturar screenshot:`, error);
      throw error;
    }
  }

  /**
   * Obter conteúdo da página
   */
  async getPageContent(sessionId, selector = null) {
    const page = this.getPageForSession(sessionId);
    if (!page) {
      throw new Error(`Página não encontrada para sessão ${sessionId}`);
    }

    try {
      if (selector) {
        return await page.$eval(selector, el => el.textContent);
      } else {
        return await page.content();
      }
      
    } catch (error) {
      logger.error(`❌ Erro ao obter conteúdo da página:`, error);
      throw error;
    }
  }

  /**
   * Aguardar elemento
   */
  async waitForElement(sessionId, selector, timeout = 10000) {
    const page = this.getPageForSession(sessionId);
    if (!page) {
      throw new Error(`Página não encontrada para sessão ${sessionId}`);
    }

    try {
      await page.waitForSelector(selector, { timeout });
      
    } catch (error) {
      logger.error(`❌ Elemento ${selector} não encontrado:`, error);
      throw error;
    }
  }

  /**
   * Verificar se elemento existe
   */
  async elementExists(sessionId, selector) {
    const page = this.getPageForSession(sessionId);
    if (!page) {
      throw new Error(`Página não encontrada para sessão ${sessionId}`);
    }

    try {
      const element = await page.$(selector);
      return element !== null;
      
    } catch (error) {
      return false;
    }
  }

  /**
   * Obter atributo de elemento
   */
  async getElementAttribute(sessionId, selector, attribute) {
    const page = this.getPageForSession(sessionId);
    if (!page) {
      throw new Error(`Página não encontrada para sessão ${sessionId}`);
    }

    try {
      return await page.$eval(selector, (el, attr) => el.getAttribute(attr), attribute);
      
    } catch (error) {
      logger.error(`❌ Erro ao obter atributo ${attribute}:`, error);
      throw error;
    }
  }

  /**
   * Fechar página da sessão
   */
  async closePageForSession(sessionId) {
    const page = this.pages.get(sessionId);
    
    if (page) {
      try {
        await page.close();
        this.pages.delete(sessionId);
        logger.info(`🌐 Página fechada para sessão ${sessionId}`);
        
      } catch (error) {
        logger.error(`❌ Erro ao fechar página da sessão ${sessionId}:`, error);
      }
    }
  }

  /**
   * Obter estatísticas do motor
   */
  getStats() {
    return {
      isReady: this.isReady,
      activePagesCount: this.pages.size,
      activePages: Array.from(this.pages.keys())
    };
  }

  /**
   * Encerrar motor do browser
   */
  async shutdown() {
    try {
      logger.info('🌐 Encerrando motor do browser...');

      // Fechar todas as páginas ativas
      for (const [sessionId, page] of this.pages) {
        try {
          await page.close();
        } catch (error) {
          logger.error(`Erro ao fechar página ${sessionId}:`, error);
        }
      }

      this.pages.clear();

      // Fechar browser
      if (this.browser) {
        await this.browser.close();
        this.browser = null;
      }

      this.isReady = false;
      logger.success('✅ Motor do browser encerrado');

    } catch (error) {
      logger.error('❌ Erro ao encerrar motor do browser:', error);
    }
  }
}

export { BrowserGameEngine };