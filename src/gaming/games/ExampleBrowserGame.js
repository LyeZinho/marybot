/**
 * 🕸️ Jogo de Exemplo para Browser
 * Demonstração de jogo web usando automação
 */

import { BaseGame } from '../BaseGame.js';
import { logger } from '../../utils/logger.js';

class ExampleBrowserGame extends BaseGame {
  constructor(gameUrl, options = {}) {
    super('browser_example', {
      type: 'browser',
      name: 'Exemplo Browser Game',
      description: 'Jogo de exemplo executado no browser',
      config: {
        maxPlayers: 1,
        timeLimit: 300000, // 5 minutos
        ...options.config
      },
      ...options
    });

    this.gameUrl = gameUrl;
    this.browserEngine = null;
    this.currentPage = null;
    
    // Elementos específicos do jogo
    this.gameElements = {
      startButton: null,
      gameArea: null,
      scoreElement: null,
      statusElement: null
    };

    // Estado específico do browser game
    this.browserState = {
      isLoaded: false,
      currentUrl: null,
      lastScreenshot: null,
      elementCache: new Map()
    };
  }

  /**
   * Inicialização específica do browser game
   */
  async onInitialize() {
    try {
      logger.info(`🕸️ Carregando página do jogo: ${this.gameUrl}`);
      
      // Obter página do browser engine (será injetado pelo GamingManager)
      if (!this.browserEngine) {
        throw new Error('Browser engine não foi injetado');
      }

      this.currentPage = await this.browserEngine.createPageForSession(this.gameId);
      
      // Navegar para a página do jogo
      await this.currentPage.goto(this.gameUrl, {
        waitUntil: 'networkidle2',
        timeout: 30000
      });

      this.browserState.isLoaded = true;
      this.browserState.currentUrl = this.gameUrl;

      // Aguardar elementos do jogo carregarem
      await this.waitForGameElements();
      
      logger.success(`✅ Página do jogo carregada: ${this.gameUrl}`);

    } catch (error) {
      logger.error('❌ Erro ao inicializar browser game:', error);
      throw error;
    }
  }

  /**
   * Aguardar elementos do jogo
   */
  async waitForGameElements() {
    try {
      // Aguardar elementos básicos do jogo
      await this.currentPage.waitForSelector('body', { timeout: 10000 });
      
      // Tentar encontrar elementos comuns de jogos
      const commonSelectors = [
        'canvas', 
        '#game', 
        '.game-area', 
        '#gameArea',
        '.start-button',
        '#startButton',
        'button[onclick*="start"]',
        'button[onclick*="play"]'
      ];

      for (const selector of commonSelectors) {
        try {
          const element = await this.currentPage.$(selector);
          if (element) {
            logger.info(`🎯 Elemento encontrado: ${selector}`);
            
            if (selector.includes('start') || selector.includes('play')) {
              this.gameElements.startButton = selector;
            } else if (selector.includes('game') || selector === 'canvas') {
              this.gameElements.gameArea = selector;
            }
          }
        } catch (e) {
          // Elemento não encontrado, continuar
        }
      }

      // Procurar elementos de pontuação
      const scoreSelectors = [
        '#score',
        '.score',
        '[id*="score"]',
        '[class*="score"]',
        '#points',
        '.points'
      ];

      for (const selector of scoreSelectors) {
        try {
          const element = await this.currentPage.$(selector);
          if (element) {
            this.gameElements.scoreElement = selector;
            logger.info(`📊 Elemento de pontuação encontrado: ${selector}`);
            break;
          }
        } catch (e) {
          // Elemento não encontrado
        }
      }

    } catch (error) {
      logger.warn('⚠️ Alguns elementos do jogo podem não ter sido encontrados:', error.message);
    }
  }

  /**
   * Início específico do browser game
   */
  async onStart() {
    try {
      // Tentar iniciar o jogo clicando no botão start
      if (this.gameElements.startButton) {
        logger.info('🎯 Clicando no botão de iniciar...');
        await this.currentPage.click(this.gameElements.startButton);
        await this.currentPage.waitForTimeout(1000);
      }

      // Tirar screenshot inicial
      await this.takeScreenshot();
      
      // Começar monitoramento do estado do jogo
      this.startGameMonitoring();

    } catch (error) {
      logger.error('❌ Erro ao iniciar browser game:', error);
      throw error;
    }
  }

  /**
   * Processar ação específica do browser game
   */
  async onAction(action, data) {
    try {
      let result = {
        success: false,
        message: 'Ação não reconhecida',
        scoreChange: 0
      };

      switch (action) {
        case 'click':
          result = await this.handleClick(data);
          break;
          
        case 'key':
          result = await this.handleKeypress(data);
          break;
          
        case 'move':
          result = await this.handleMouseMove(data);
          break;
          
        case 'screenshot':
          result = await this.takeScreenshot();
          break;
          
        case 'scroll':
          result = await this.handleScroll(data);
          break;
          
        case 'wait':
          result = await this.handleWait(data);
          break;
          
        case 'analyze':
          result = await this.analyzeGameState();
          break;
          
        default:
          // Tentar ações personalizadas do jogo
          result = await this.handleCustomAction(action, data);
      }

      // Atualizar estado do jogo após a ação
      await this.updateGameState();

      return result;

    } catch (error) {
      logger.error(`❌ Erro ao processar ação ${action}:`, error);
      return {
        success: false,
        message: error.message,
        scoreChange: 0
      };
    }
  }

  /**
   * Lidar com cliques
   */
  async handleClick(data) {
    try {
      const { x, y, selector, element } = data;
      
      if (selector) {
        // Clicar em seletor CSS
        await this.currentPage.click(selector);
        logger.info(`🖱️ Clique em seletor: ${selector}`);
        
      } else if (x !== undefined && y !== undefined) {
        // Clicar em coordenadas
        await this.currentPage.mouse.click(x, y);
        logger.info(`🖱️ Clique em coordenadas: (${x}, ${y})`);
        
      } else if (element) {
        // Clicar em elemento específico
        const gameArea = await this.currentPage.$(this.gameElements.gameArea || 'body');
        if (gameArea) {
          await gameArea.click();
          logger.info(`🖱️ Clique na área do jogo`);
        }
      }
      
      await this.currentPage.waitForTimeout(100);
      
      return {
        success: true,
        message: 'Clique executado',
        scoreChange: 0
      };
      
    } catch (error) {
      return {
        success: false,
        message: `Erro no clique: ${error.message}`,
        scoreChange: 0
      };
    }
  }

  /**
   * Lidar com teclas
   */
  async handleKeypress(data) {
    try {
      const { key, keys, text } = data;
      
      if (key) {
        await this.currentPage.keyboard.press(key);
        logger.info(`⌨️ Tecla pressionada: ${key}`);
        
      } else if (keys) {
        for (const k of keys) {
          await this.currentPage.keyboard.press(k);
          await this.currentPage.waitForTimeout(50);
        }
        logger.info(`⌨️ Sequência de teclas: ${keys.join(', ')}`);
        
      } else if (text) {
        await this.currentPage.keyboard.type(text);
        logger.info(`⌨️ Texto digitado: ${text}`);
      }
      
      return {
        success: true,
        message: 'Tecla processada',
        scoreChange: 0
      };
      
    } catch (error) {
      return {
        success: false,
        message: `Erro na tecla: ${error.message}`,
        scoreChange: 0
      };
    }
  }

  /**
   * Lidar com movimento do mouse
   */
  async handleMouseMove(data) {
    try {
      const { x, y, steps = 1 } = data;
      
      await this.currentPage.mouse.move(x, y, { steps });
      
      return {
        success: true,
        message: `Mouse movido para (${x}, ${y})`,
        scoreChange: 0
      };
      
    } catch (error) {
      return {
        success: false,
        message: `Erro no movimento: ${error.message}`,
        scoreChange: 0
      };
    }
  }

  /**
   * Tirar screenshot
   */
  async takeScreenshot() {
    try {
      const screenshot = await this.currentPage.screenshot({
        type: 'png',
        fullPage: false
      });
      
      this.browserState.lastScreenshot = {
        data: screenshot,
        timestamp: Date.now()
      };
      
      return {
        success: true,
        message: 'Screenshot capturado',
        data: screenshot,
        scoreChange: 0
      };
      
    } catch (error) {
      return {
        success: false,
        message: `Erro no screenshot: ${error.message}`,
        scoreChange: 0
      };
    }
  }

  /**
   * Lidar com scroll
   */
  async handleScroll(data) {
    try {
      const { deltaY = 100, deltaX = 0 } = data;
      
      await this.currentPage.mouse.wheel({ deltaX, deltaY });
      
      return {
        success: true,
        message: `Scroll executado: ${deltaY}`,
        scoreChange: 0
      };
      
    } catch (error) {
      return {
        success: false,
        message: `Erro no scroll: ${error.message}`,
        scoreChange: 0
      };
    }
  }

  /**
   * Aguardar
   */
  async handleWait(data) {
    try {
      const { time = 1000, selector, condition } = data;
      
      if (selector) {
        await this.currentPage.waitForSelector(selector, { timeout: time });
      } else if (condition) {
        await this.currentPage.waitForFunction(condition, { timeout: time });
      } else {
        await this.currentPage.waitForTimeout(time);
      }
      
      return {
        success: true,
        message: `Aguardou ${time}ms`,
        scoreChange: 0
      };
      
    } catch (error) {
      return {
        success: false,
        message: `Erro na espera: ${error.message}`,
        scoreChange: 0
      };
    }
  }

  /**
   * Analisar estado do jogo
   */
  async analyzeGameState() {
    try {
      const analysis = {
        url: this.currentPage.url(),
        title: await this.currentPage.title(),
        viewport: this.currentPage.viewport(),
        elements: {},
        score: await this.getCurrentScore(),
        timestamp: Date.now()
      };
      
      // Analisar elementos importantes
      if (this.gameElements.scoreElement) {
        try {
          const scoreText = await this.currentPage.$eval(
            this.gameElements.scoreElement, 
            el => el.textContent
          );
          analysis.elements.score = scoreText;
        } catch (e) {
          // Elemento não encontrado ou erro
        }
      }
      
      // Contar elementos interativos
      const buttons = await this.currentPage.$$('button');
      const inputs = await this.currentPage.$$('input');
      const links = await this.currentPage.$$('a');
      
      analysis.elements.interactiveCount = {
        buttons: buttons.length,
        inputs: inputs.length,
        links: links.length
      };
      
      return {
        success: true,
        message: 'Estado analisado',
        data: analysis,
        scoreChange: 0
      };
      
    } catch (error) {
      return {
        success: false,
        message: `Erro na análise: ${error.message}`,
        scoreChange: 0
      };
    }
  }

  /**
   * Lidar com ações customizadas
   */
  async handleCustomAction(action, data) {
    // Implementar ações específicas do jogo
    return {
      success: false,
      message: `Ação customizada '${action}' não implementada`,
      scoreChange: 0
    };
  }

  /**
   * Atualizar estado do jogo
   */
  async updateGameState() {
    try {
      // Atualizar pontuação
      const currentScore = await this.getCurrentScore();
      if (currentScore !== null) {
        this.state.score = currentScore;
      }
      
      // Atualizar tempo
      if (this.startTime) {
        this.state.time = Date.now() - this.startTime;
      }
      
    } catch (error) {
      logger.error('❌ Erro ao atualizar estado do jogo:', error);
    }
  }

  /**
   * Obter pontuação atual
   */
  async getCurrentScore() {
    if (!this.gameElements.scoreElement) {
      return null;
    }
    
    try {
      const scoreText = await this.currentPage.$eval(
        this.gameElements.scoreElement, 
        el => el.textContent || el.innerText || el.value
      );
      
      // Tentar extrair número da pontuação
      const scoreMatch = scoreText.match(/\d+/);
      return scoreMatch ? parseInt(scoreMatch[0]) : 0;
      
    } catch (error) {
      return null;
    }
  }

  /**
   * Iniciar monitoramento do jogo
   */
  startGameMonitoring() {
    // Monitorar mudanças a cada segundo
    this.gameMonitorInterval = setInterval(async () => {
      if (this.isRunning && !this.isPaused) {
        await this.updateGameState();
      }
    }, 1000);
  }

  /**
   * Finalização específica do browser game
   */
  async onEnd(reason) {
    try {
      // Parar monitoramento
      if (this.gameMonitorInterval) {
        clearInterval(this.gameMonitorInterval);
      }
      
      // Tirar screenshot final
      await this.takeScreenshot();
      
      // Fechar página se necessário
      if (this.currentPage && this.browserEngine) {
        await this.browserEngine.closePageForSession(this.gameId);
      }
      
      logger.info(`🏁 Browser game finalizado: ${reason}`);
      
    } catch (error) {
      logger.error('❌ Erro ao finalizar browser game:', error);
    }
  }

  /**
   * Injetar browser engine
   */
  setBrowserEngine(browserEngine) {
    this.browserEngine = browserEngine;
  }

  /**
   * Obter screenshot atual
   */
  getCurrentScreenshot() {
    return this.browserState.lastScreenshot;
  }

  /**
   * Obter estado do browser
   */
  getBrowserState() {
    return this.browserState;
  }
}

export { ExampleBrowserGame };