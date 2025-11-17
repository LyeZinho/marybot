/**
 * 🗣️ Serviço de Text-to-Speech com Flite
 * Sistema simples e eficiente usando Festival Lite (flite)
 * Focado em qualidade e portabilidade
 */

import { spawn, exec } from 'child_process';
import { existsSync, mkdirSync, statSync, unlinkSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { logger } from './logger.js';
import crypto from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

class TextToSpeechService {
  constructor() {
    this.initialized = false;
    this.fliteAvailable = false;
    
    // Configurações
    this.config = {
      // Diretórios
      outputDir: join(process.cwd(), 'temp', 'tts'),
      cacheDir: join(process.cwd(), 'temp', 'tts_cache'),
      
      // Configurações de áudio do flite
      voice: 'slt', // Voz feminina do flite (default)
      audioFormat: 'wav',
      sampleRate: 48000, // Compatible with Discord
      
      // Cache
      enableCache: true,
      maxCacheSize: 100 * 1024 * 1024, // 100MB
      cacheExpiration: 7 * 24 * 60 * 60 * 1000, // 7 dias
    };
    
    this.initializeService();
  }

  /**
   * 🚀 Inicializar o serviço TTS
   */
  async initializeService() {
    try {
      logger.info('🚀 Inicializando serviço Text-to-Speech com Flite...');
      
      // Criar diretórios necessários
      this.ensureDirectories();
      
      // Verificar se flite está disponível
      await this.checkFliteAvailability();
      
      if (!this.fliteAvailable) {
        logger.warn('⚠️ Flite não encontrado, o TTS não funcionará');
        logger.info('💡 Para instalar flite:');
        logger.info('   Windows: Baixe de http://www.festvox.org/flite/');
        logger.info('   Linux: sudo apt-get install flite');
        logger.info('   macOS: brew install flite');
        return;
      }
      
      // Limpar cache antigo se necessário
      await this.cleanOldCache();
      
      this.initialized = true;
      logger.success('✅ TTS inicializado com Flite');
      logger.info(`🎵 Voz: ${this.config.voice}`);
      
    } catch (error) {
      logger.error('❌ Erro ao inicializar TTS:', error);
      this.initialized = false;
    }
  }

  /**
   * 📁 Garantir que os diretórios existam
   */
  ensureDirectories() {
    [this.config.outputDir, this.config.cacheDir].forEach(dir => {
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
        logger.info(`📁 Diretório criado: ${dir}`);
      }
    });
  }

  /**
   * 🔍 Verificar disponibilidade do Flite
   */
  async checkFliteAvailability() {
    return new Promise((resolve) => {
      exec('flite --version', (error, stdout, stderr) => {
        if (error) {
          logger.warn('⚠️ Flite não encontrado no sistema');
          this.fliteAvailable = false;
        } else {
          logger.info(`✅ Flite encontrado: ${stdout.trim()}`);
          this.fliteAvailable = true;
        }
        resolve();
      });
    });
  }

  /**
   * 🗣️ Converter texto em áudio usando Flite
   */
  async synthesizeText(text, options = {}) {
    if (!this.initialized || !this.fliteAvailable) {
      throw new Error('TTS não inicializado ou Flite não disponível');
    }

    if (!text || text.trim() === '') {
      throw new Error('Texto não pode estar vazio');
    }

    try {
      // Gerar hash do texto para cache
      const textHash = crypto.createHash('md5').update(text.trim()).digest('hex');
      const cacheFile = join(this.config.cacheDir, `${textHash}.wav`);
      
      // Verificar cache primeiro
      if (this.config.enableCache && existsSync(cacheFile)) {
        logger.info('💾 Áudio encontrado no cache');
        return cacheFile;
      }

      // Gerar nome único para o arquivo de saída
      const outputFile = join(this.config.outputDir, `tts_${Date.now()}_${Math.random().toString(36).substr(2, 9)}.wav`);
      
      // Executar flite
      await this.executeFlite(text, outputFile);
      
      // Copiar para cache se habilitado
      if (this.config.enableCache) {
        await this.copyToCache(outputFile, cacheFile);
      }
      
      logger.success(`🎵 Áudio gerado com sucesso: ${outputFile}`);
      return outputFile;
      
    } catch (error) {
      logger.error('❌ Erro ao gerar áudio com Flite:', error);
      throw error;
    }
  }

  /**
   * ⚡ Executar comando flite
   */
  async executeFlite(text, outputFile) {
    return new Promise((resolve, reject) => {
      // Limpar texto para evitar problemas com caracteres especiais
      const cleanText = text
        .replace(/[^\w\s\.\,\!\?\-]/g, ' ') // Remove caracteres especiais
        .replace(/\s+/g, ' ') // Remove espaços múltiplos
        .trim();

      // Construir comando flite
      const command = `flite`;
      const args = [
        '-voice', this.config.voice,
        '-t', cleanText,
        '-o', outputFile
      ];

      logger.info(`🔊 Gerando áudio: "${cleanText.substring(0, 50)}${cleanText.length > 50 ? '...' : ''}"`);

      const process = spawn(command, args, {
        stdio: ['pipe', 'pipe', 'pipe'],
        shell: true
      });

      let stdout = '';
      let stderr = '';

      process.stdout?.on('data', (data) => {
        stdout += data.toString();
      });

      process.stderr?.on('data', (data) => {
        stderr += data.toString();
      });

      process.on('close', (code) => {
        if (code === 0) {
          // Verificar se o arquivo foi criado e tem conteúdo
          if (existsSync(outputFile) && statSync(outputFile).size > 0) {
            resolve();
          } else {
            reject(new Error('Arquivo de áudio não foi gerado corretamente'));
          }
        } else {
          reject(new Error(`Flite falhou com código ${code}: ${stderr}`));
        }
      });

      process.on('error', (error) => {
        reject(new Error(`Erro ao executar flite: ${error.message}`));
      });

      // Timeout de 10 segundos
      setTimeout(() => {
        process.kill('SIGKILL');
        reject(new Error('Timeout: Flite demorou muito para responder'));
      }, 10000);
    });
  }

  /**
   * 📄 Copiar arquivo para cache
   */
  async copyToCache(sourceFile, cacheFile) {
    try {
      const fs = await import('fs/promises');
      await fs.copyFile(sourceFile, cacheFile);
      logger.info('💾 Arquivo salvo no cache');
    } catch (error) {
      logger.warn('⚠️ Erro ao salvar no cache:', error.message);
    }
  }

  /**
   * 🧹 Limpar cache antigo
   */
  async cleanOldCache() {
    try {
      const fs = await import('fs/promises');
      const files = await fs.readdir(this.config.cacheDir);
      const now = Date.now();
      let totalSize = 0;
      let deletedFiles = 0;

      for (const file of files) {
        const filePath = join(this.config.cacheDir, file);
        const stats = await fs.stat(filePath);
        
        totalSize += stats.size;
        
        // Deletar arquivos antigos
        if (now - stats.mtime.getTime() > this.config.cacheExpiration) {
          await fs.unlink(filePath);
          deletedFiles++;
        }
      }

      // Se cache muito grande, deletar arquivos mais antigos
      if (totalSize > this.config.maxCacheSize) {
        const remainingFiles = await fs.readdir(this.config.cacheDir);
        const fileStats = [];
        
        for (const file of remainingFiles) {
          const filePath = join(this.config.cacheDir, file);
          const stats = await fs.stat(filePath);
          fileStats.push({ file, path: filePath, mtime: stats.mtime, size: stats.size });
        }
        
        // Ordenar por data (mais antigos primeiro)
        fileStats.sort((a, b) => a.mtime - b.mtime);
        
        let currentSize = totalSize;
        for (const fileInfo of fileStats) {
          if (currentSize <= this.config.maxCacheSize * 0.8) break; // Manter 80% do limite
          
          await fs.unlink(fileInfo.path);
          currentSize -= fileInfo.size;
          deletedFiles++;
        }
      }

      if (deletedFiles > 0) {
        logger.info(`🧹 Cache limpo: ${deletedFiles} arquivos removidos`);
      }
      
    } catch (error) {
      logger.warn('⚠️ Erro ao limpar cache:', error.message);
    }
  }

  /**
   * 📊 Obter informações do serviço
   */
  getServiceInfo() {
    return {
      initialized: this.initialized,
      engine: this.fliteAvailable ? 'flite' : 'none',
      voice: this.config.voice,
      cacheEnabled: this.config.enableCache,
      outputDir: this.config.outputDir,
      cacheDir: this.config.cacheDir
    };
  }

  /**
   * 🔧 Definir configurações
   */
  setConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
    logger.info('⚙️ Configurações do TTS atualizadas');
  }

  /**
   * 🧹 Limpar arquivos temporários
   */
  async cleanup() {
    try {
      const fs = await import('fs/promises');
      const files = await fs.readdir(this.config.outputDir);
      
      for (const file of files) {
        if (file.startsWith('tts_')) {
          const filePath = join(this.config.outputDir, file);
          await fs.unlink(filePath);
        }
      }
      
      logger.info('🧹 Arquivos temporários limpos');
    } catch (error) {
      logger.warn('⚠️ Erro ao limpar arquivos temporários:', error.message);
    }
  }
}

// Instância singleton
const textToSpeechService = new TextToSpeechService();

export { textToSpeechService, TextToSpeechService };