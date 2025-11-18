/**
 * 🗣️ Serviço de API de Voz Externa (OpenTTS) - Versão Simplificada
 * Integração direta com GET: http://homelab.op:5500/api/tts?voice=espeak:pt&text=Olá
 */

import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';
import { logger } from './logger.js';

class ExternalVoiceService {
  constructor() {
    this.ttsApiUrl = process.env.TTS_API_URL || 'http://homelab.op:5500/api/tts';
    this.defaultVoice = process.env.TTS_VOICE || 'glow-speak:en-us_mary_ann';
    this.timeout = parseInt(process.env.TTS_TIMEOUT) || 10000;
    
    // Garantir que o diretório temp existe
    const tempDir = join(process.cwd(), 'temp');
    if (!existsSync(tempDir)) {
      mkdirSync(tempDir, { recursive: true });
    }
    
    logger.info(`🗣️ Serviço de Voz configurado: ${this.ttsApiUrl}`);
  }

  /**
   * 🗣️ Sintetizar texto para fala (TTS) - Implementação Simples com Fallback
   */
  async synthesizeText(text, options = {}) {
    try {
      const voice = options.voice || this.defaultVoice;
      
      // Limpar texto básico
      const cleanedText = text.replace(/[<>]/g, '').trim();
      if (!cleanedText) {
        throw new Error('Texto vazio');
      }

      // Construir URL GET simples
      const params = new URLSearchParams({
        voice: voice,
        text: cleanedText
      });

      const requestUrl = `${this.ttsApiUrl}?${params.toString()}`;
      
      logger.info(`🗣️ Sintetizando: "${cleanedText.substring(0, 30)}..." com voz: ${voice}`);
      
      const response = await fetch(requestUrl, {
        method: 'GET',
        signal: AbortSignal.timeout(this.timeout)
      });
      
      if (!response.ok) {
        throw new Error(`API TTS erro ${response.status}`);
      }
      
      const audioBuffer = await response.arrayBuffer();
      
      if (!audioBuffer || audioBuffer.byteLength === 0) {
        throw new Error('Áudio vazio da API');
      }

      // Salvar arquivo com timestamp
      const outputPath = join(process.cwd(), 'temp', `tts_${Date.now()}.wav`);
      writeFileSync(outputPath, Buffer.from(audioBuffer));
      
      logger.success(`✅ Áudio criado: ${outputPath} (${Math.round(audioBuffer.byteLength/1024)}KB)`);
      return outputPath;

    } catch (error) {
      logger.error(`❌ Erro TTS: ${error.message}`);
      throw error; // Sem fallback - queremos saber quando falha
    }
  }

  /**
   * 📊 Status do serviço
   */
  getStatus() {
    return {
      apiUrl: this.ttsApiUrl,
      defaultVoice: this.defaultVoice,
      timeout: this.timeout
    };
  }

  /**
   * 🔍 Teste básico de conectividade
   */
  async testConnection() {
    try {
      const testPath = await this.synthesizeText('teste', { voice: this.defaultVoice });
      return {
        connected: true,
        testFile: testPath
      };
    } catch (error) {
      return {
        connected: false,
        error: error.message
      };
    }
  }
}

// Instância singleton
const externalVoiceService = new ExternalVoiceService();

export { externalVoiceService, ExternalVoiceService };
export default externalVoiceService;