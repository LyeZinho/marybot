/**
 * 🗣️ Serviço de Text-to-Speech
 * Sistema para converter texto em áudio com voz feminina
 * Suporte para múltiplas engines: Windows SAPI, Azure Cognitive Services, ou local
 */

import { spawn, execSync } from 'child_process';
import { writeFileSync, readFileSync, existsSync, mkdirSync, statSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { logger } from './logger.js';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

class TextToSpeechService {
  constructor() {
    this.initialized = false;
    this.currentEngine = null;
    this.availableVoices = [];
    this.selectedVoice = null;
    
    // Configurações
    this.config = {
      // Prioridade de engines
      preferredEngines: ['windows-sapi', 'azure', 'local'],
      
      // Configurações de voz
      voice: {
        gender: 'female',
        language: 'pt-BR',
        rate: 0.1, // Velocidade: -1.0 a 1.0 (0 = normal)
        pitch: 0.2, // Tom: -1.0 a 1.0 (0 = normal, 0.2 = mais feminino)
        volume: 0.8, // Volume: 0.0 a 1.0
      },
      
      // Configurações de áudio
      audio: {
        format: 'wav', // wav, mp3
        sampleRate: 48000, // Compatible with Discord
        channels: 2, // Stereo
        bitRate: 128
      },
      
      // Diretórios
      outputDir: join(process.cwd(), 'temp', 'tts'),
      cacheDir: join(process.cwd(), 'temp', 'tts_cache')
    };
    
    this.initializeService();
  }

  /**
   * 🚀 Inicializar o serviço TTS
   */
  async initializeService() {
    try {
      logger.info('🚀 Inicializando serviço Text-to-Speech...');
      
      // Criar diretórios necessários
      this.ensureDirectories();
      
      // Detectar engine disponível
      await this.detectAvailableEngine();
      
      // Carregar vozes disponíveis
      await this.loadAvailableVoices();
      
      // Selecionar melhor voz feminina
      this.selectBestFemaleVoice();
      
      this.initialized = true;
      logger.success(`✅ TTS inicializado com engine: ${this.currentEngine}`);
      logger.success(`🎵 Voz selecionada: ${this.selectedVoice?.name || 'Padrão'}`);
      
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
   * 🔍 Detectar engine TTS disponível
   */
  async detectAvailableEngine() {
    // Testar Windows SAPI primeiro (melhor para Windows)
    if (await this.testWindowsSAPI()) {
      this.currentEngine = 'windows-sapi';
      logger.info('🎯 Engine detectada: Windows Speech API (SAPI)');
      return;
    }
    
    // Fallback para engine local simples
    this.currentEngine = 'local-fallback';
    logger.warn('⚠️ Usando engine local simples como fallback');
  }

  /**
   * 🪟 Testar Windows Speech API
   */
  async testWindowsSAPI() {
    try {
      // Testar se o PowerShell está disponível e pode usar SAPI
      const testScript = `
        Add-Type -AssemblyName System.Speech;
        $synth = New-Object System.Speech.Synthesis.SpeechSynthesizer;
        $synth.GetInstalledVoices() | ForEach-Object { $_.VoiceInfo.Name };
      `;
      
      const result = execSync(`powershell -Command "${testScript}"`, { 
        encoding: 'utf8',
        timeout: 5000 
      });
      
      return result.trim().length > 0;
    } catch (error) {
      logger.warn('⚠️ Windows SAPI não disponível:', error.message);
      return false;
    }
  }

  /**
   * 🎵 Carregar vozes disponíveis
   */
  async loadAvailableVoices() {
    if (this.currentEngine === 'windows-sapi') {
      await this.loadWindowsSAPIVoices();
    } else {
      // Vozes fallback
      this.availableVoices = [
        {
          name: 'Feminina-PT-BR',
          gender: 'female',
          language: 'pt-BR',
          quality: 'high',
          isDefault: true
        }
      ];
    }
    
    logger.info(`🎵 ${this.availableVoices.length} vozes carregadas`);
  }

  /**
   * 🪟 Carregar vozes do Windows SAPI
   */
  async loadWindowsSAPIVoices() {
    try {
      const script = `
        Add-Type -AssemblyName System.Speech;
        $synth = New-Object System.Speech.Synthesis.SpeechSynthesizer;
        $synth.GetInstalledVoices() | ForEach-Object { 
          $voice = $_.VoiceInfo;
          "$($voice.Name)|$($voice.Gender)|$($voice.Culture)|$($voice.Description)"
        };
      `;
      
      const result = execSync(`powershell -Command "${script}"`, { 
        encoding: 'utf8',
        timeout: 10000 
      });
      
      this.availableVoices = result.trim().split('\n')
        .filter(line => line.length > 0)
        .map(line => {
          const [name, gender, culture, description] = line.split('|');
          return {
            name: name?.trim(),
            gender: gender?.toLowerCase().trim(),
            language: culture?.trim(),
            description: description?.trim(),
            quality: 'high',
            engine: 'windows-sapi'
          };
        })
        .filter(voice => voice.name && voice.gender);
        
    } catch (error) {
      logger.error('❌ Erro ao carregar vozes Windows SAPI:', error);
      this.availableVoices = [];
    }
  }

  /**
   * 👩 Selecionar melhor voz feminina
   */
  selectBestFemaleVoice() {
    // Filtrar vozes femininas em português
    const femaleVoices = this.availableVoices.filter(voice => 
      voice.gender === 'female' && 
      (voice.language?.includes('pt') || voice.language?.includes('BR'))
    );
    
    if (femaleVoices.length > 0) {
      // Priorizar vozes brasileiras
      this.selectedVoice = femaleVoices.find(v => v.language?.includes('BR')) || femaleVoices[0];
    } else {
      // Fallback para qualquer voz feminina
      const anyFemale = this.availableVoices.find(v => v.gender === 'female');
      this.selectedVoice = anyFemale || this.availableVoices[0] || {
        name: 'Voz-Padrão-Feminina',
        gender: 'female',
        language: 'pt-BR',
        quality: 'medium'
      };
    }
    
    logger.info(`👩 Voz feminina selecionada: ${this.selectedVoice.name} (${this.selectedVoice.language})`);
  }

  /**
   * 🎤 Converter texto em áudio
   */
  async synthesizeText(text, options = {}) {
    try {
      if (!this.initialized) {
        logger.warn('⚠️ TTS não inicializado, tentando inicializar...');
        await this.initializeService();
      }

      // Limpar e validar texto
      const cleanText = this.cleanText(text);
      if (!cleanText || cleanText.length < 1) {
        logger.warn('⚠️ Texto vazio ou inválido para TTS');
        return null;
      }

      // Verificar cache
      const cacheKey = this.generateCacheKey(cleanText, options);
      const cachedFile = await this.getCachedAudio(cacheKey);
      if (cachedFile) {
        logger.info(`💾 Áudio encontrado no cache: ${cacheKey}`);
        return cachedFile;
      }

      // Gerar nome do arquivo
      const timestamp = Date.now();
      const filename = `tts_${timestamp}.${this.config.audio.format}`;
      const outputPath = join(this.config.outputDir, filename);

      // Sintetizar baseado na engine
      let success = false;
      if (this.currentEngine === 'windows-sapi') {
        success = await this.synthesizeWithWindowsSAPI(cleanText, outputPath, options);
      } else {
        success = await this.synthesizeWithFallback(cleanText, outputPath, options);
      }

      if (success && existsSync(outputPath)) {
        // Salvar no cache
        await this.cacheAudio(cacheKey, outputPath);
        
        logger.success(`🎵 TTS gerado: ${filename} (${(readFileSync(outputPath).length / 1024).toFixed(1)}KB)`);
        return outputPath;
      }

      logger.error('❌ Falha ao gerar áudio TTS');
      return null;

    } catch (error) {
      logger.error('❌ Erro na síntese de voz:', error);
      return null;
    }
  }

  /**
   * 🪟 Sintetizar com Windows SAPI
   */
  async synthesizeWithWindowsSAPI(text, outputPath, options = {}) {
    try {
      const voiceName = options.voice || this.selectedVoice?.name || '';
      const rate = options.rate !== undefined ? options.rate : this.config.voice.rate;
      const volume = options.volume !== undefined ? options.volume : this.config.voice.volume;
      
      // Converter rate (-1 a 1) para SAPI (0 a 10)
      const sapiRate = Math.round((rate + 1) * 5);
      const sapiVolume = Math.round(volume * 100);
      
      const script = `
        Add-Type -AssemblyName System.Speech;
        $synth = New-Object System.Speech.Synthesis.SpeechSynthesizer;
        
        # Configurar voz
        ${voiceName ? `$synth.SelectVoice("${voiceName}");` : ''}
        
        # Configurar rate e volume
        $synth.Rate = ${sapiRate};
        $synth.Volume = ${sapiVolume};
        
        # Gerar áudio
        $synth.SetOutputToWaveFile("${outputPath}");
        $synth.Speak("${text.replace(/"/g, '""')}");
        $synth.Dispose();
      `;
      
      await new Promise((resolve, reject) => {
        const process = spawn('powershell', ['-Command', script], {
          stdio: 'pipe'
        });
        
        let stderr = '';
        process.stderr.on('data', (data) => {
          stderr += data.toString();
        });
        
        process.on('close', (code) => {
          if (code === 0) {
            resolve();
          } else {
            reject(new Error(`PowerShell exit code ${code}: ${stderr}`));
          }
        });
        
        process.on('error', reject);
        
        // Timeout de 30 segundos
        setTimeout(() => {
          process.kill();
          reject(new Error('TTS timeout'));
        }, 30000);
      });
      
      return existsSync(outputPath);
      
    } catch (error) {
      logger.error('❌ Erro na síntese Windows SAPI:', error);
      return false;
    }
  }

  /**
   * 🔄 Síntese com fallback local - versão audível
   */
  async synthesizeWithFallback(text, outputPath, options = {}) {
    try {
      logger.info('🔄 Gerando áudio sintético audível');
      
      // Usar nova função de geração audível
      const audioBuffer = this.generateAudibleSynthVoice(text);
      writeFileSync(outputPath, audioBuffer);
      
      const stats = statSync(outputPath);
      logger.info(`🎵 Áudio sintético gerado: ${path.basename(outputPath)} (${(stats.size / 1024).toFixed(1)}KB)`);
      
      return true;
      
    } catch (error) {
      logger.error('❌ Erro na síntese fallback:', error);
      return false;
    }
  }

  /**
   * 🎵 Gerar áudio sintético audível
   */
  generateAudibleSynthVoice(text) {
    const sampleRate = 22050;
    const duration = Math.max(3, Math.min(8, text.length * 0.15)); // Duração adequada
    const samples = Math.floor(sampleRate * duration);
    const dataSize = samples * 2;
    const fileSize = dataSize + 44;
    
    const buffer = Buffer.alloc(fileSize);
    
    // WAV header
    buffer.write('RIFF', 0);
    buffer.writeUInt32LE(fileSize - 8, 4);
    buffer.write('WAVE', 8);
    buffer.write('fmt ', 12);
    buffer.writeUInt32LE(16, 16);
    buffer.writeUInt16LE(1, 20);  // PCM
    buffer.writeUInt16LE(1, 22);  // Mono
    buffer.writeUInt32LE(sampleRate, 24);
    buffer.writeUInt32LE(sampleRate * 2, 28);
    buffer.writeUInt16LE(2, 32);
    buffer.writeUInt16LE(16, 34);
    buffer.write('data', 36);
    buffer.writeUInt32LE(dataSize, 40);
    
    // Gerar voz feminina sintética audível
    const baseFreq = 300; // Frequência feminina mais alta
    const textHash = text.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const freqVariation = (textHash % 80) / 100;
    
    for (let i = 0; i < samples; i++) {
        const t = i / sampleRate;
        const frequency = baseFreq + (freqVariation * 60);
        
        // Múltiplos harmônicos para som mais rico
        const fundamental = Math.sin(2 * Math.PI * frequency * t);
        const harmonic2 = 0.5 * Math.sin(2 * Math.PI * frequency * 2 * t);
        const harmonic3 = 0.3 * Math.sin(2 * Math.PI * frequency * 3 * t);
        
        // Modulação de prosódia
        const prosodyMod = Math.sin(2 * Math.PI * 2 * t) * 0.3;
        const wave = (fundamental + harmonic2 + harmonic3) * (1 + prosodyMod);
        
        // Envelope suave
        let envelope = 1;
        const fadeTime = 0.15;
        if (t < fadeTime) {
            envelope = t / fadeTime;
        } else if (t > duration - fadeTime) {
            envelope = (duration - t) / fadeTime;
        }
        
        // Vibrato sutil
        const vibrato = 1 + 0.05 * Math.sin(2 * Math.PI * 5 * t);
        
        // Amplitude alta para garantir audibilidade
        const amplitude = wave * envelope * vibrato * 0.7;
        const sample = Math.round(amplitude * 28000); // Amplitude bem alta
        
        buffer.writeInt16LE(Math.max(-32767, Math.min(32767, sample)), 44 + i * 2);
    }
    
    return buffer;
  }

  /**
   * 🧹 Limpar texto para TTS
   */
  cleanText(text) {
    if (!text || typeof text !== 'string') return '';
    
    return text
      // Remover markdown e formatação Discord
      .replace(/\*\*(.*?)\*\*/g, '$1') // **bold**
      .replace(/\*(.*?)\*/g, '$1')     // *italic*
      .replace(/~~(.*?)~~/g, '$1')     // ~~strike~~
      .replace(/`(.*?)`/g, '$1')       // `code`
      .replace(/```[\s\S]*?```/g, '')  // ```code blocks```
      .replace(/<@!?\d+>/g, '')        // @mentions
      .replace(/<#\d+>/g, '')          // #channel
      .replace(/<:\w+:\d+>/g, '')      // :emoji:
      .replace(/https?:\/\/[^\s]+/g, '') // URLs
      
      // Limpar caracteres especiais
      .replace(/[^\w\sáàâãéèêíìîóòôõúùûçÁÀÂÃÉÈÊÍÌÎÓÒÔÕÚÙÛÇ.,!?;:\-]/g, '')
      
      // Normalizar espaços
      .replace(/\s+/g, ' ')
      .trim()
      
      // Limitar tamanho
      .substring(0, 500);
  }

  /**
   * 🔑 Gerar chave de cache
   */
  generateCacheKey(text, options = {}) {
    const key = `${text}_${JSON.stringify(options)}_${this.selectedVoice?.name || 'default'}`;
    return Buffer.from(key).toString('base64').replace(/[/+=]/g, '').substring(0, 32);
  }

  /**
   * 💾 Verificar cache de áudio
   */
  async getCachedAudio(cacheKey) {
    try {
      const cacheFile = join(this.config.cacheDir, `${cacheKey}.${this.config.audio.format}`);
      if (existsSync(cacheFile)) {
        return cacheFile;
      }
      return null;
    } catch (error) {
      return null;
    }
  }

  /**
   * 💾 Salvar áudio no cache
   */
  async cacheAudio(cacheKey, audioPath) {
    try {
      const cacheFile = join(this.config.cacheDir, `${cacheKey}.${this.config.audio.format}`);
      const audioData = readFileSync(audioPath);
      writeFileSync(cacheFile, audioData);
    } catch (error) {
      logger.warn('⚠️ Erro ao salvar no cache TTS:', error.message);
    }
  }

  /**
   * 🔇 Gerar áudio silencioso (fallback)
   */
  generateSilentAudio(durationMs = 1000) {
    // WAV header para áudio silencioso
    const sampleRate = this.config.audio.sampleRate;
    const channels = this.config.audio.channels;
    const samples = Math.floor(sampleRate * durationMs / 1000);
    const dataSize = samples * channels * 2; // 16-bit
    const fileSize = dataSize + 44;
    
    const buffer = Buffer.alloc(fileSize);
    
    // WAV header
    buffer.write('RIFF', 0);
    buffer.writeUInt32LE(fileSize - 8, 4);
    buffer.write('WAVE', 8);
    buffer.write('fmt ', 12);
    buffer.writeUInt32LE(16, 16); // fmt size
    buffer.writeUInt16LE(1, 20);  // audio format (PCM)
    buffer.writeUInt16LE(channels, 22);
    buffer.writeUInt32LE(sampleRate, 24);
    buffer.writeUInt32LE(sampleRate * channels * 2, 28); // byte rate
    buffer.writeUInt16LE(channels * 2, 32); // block align
    buffer.writeUInt16LE(16, 34); // bits per sample
    buffer.write('data', 36);
    buffer.writeUInt32LE(dataSize, 40);
    
    // Data (silence = zeros, já inicializado)
    
    return buffer;
  }

  /**
   * 🎵 Gerar voz sintética feminina (fallback)
   */
  generateSyntheticVoice(text) {
    const sampleRate = this.config.audio.sampleRate;
    const duration = Math.max(2, Math.min(8, text.length * 0.08)); // Duração baseada no texto
    const samples = Math.floor(sampleRate * duration);
    const dataSize = samples * 2; // 16-bit mono
    const fileSize = dataSize + 44;

    const buffer = Buffer.alloc(fileSize);

    // WAV header
    buffer.write('RIFF', 0);
    buffer.writeUInt32LE(fileSize - 8, 4);
    buffer.write('WAVE', 8);
    buffer.write('fmt ', 12);
    buffer.writeUInt32LE(16, 16);
    buffer.writeUInt16LE(1, 20);  // PCM
    buffer.writeUInt16LE(1, 22);  // Mono
    buffer.writeUInt32LE(sampleRate, 24);
    buffer.writeUInt32LE(sampleRate * 2, 28);
    buffer.writeUInt16LE(2, 32);
    buffer.writeUInt16LE(16, 34);
    buffer.write('data', 36);
    buffer.writeUInt32LE(dataSize, 40);

    // Gerar tom sintético feminino baseado no texto
    const baseFreq = 220; // Frequência base feminina (A3)
    const textHash = text.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const freqVariation = (textHash % 50) / 100; // Reduzir variação de frequência

    for (let i = 0; i < samples; i++) {
      const t = i / sampleRate;
      const frequency = baseFreq + (freqVariation * 30); // Reduzir variação de frequência

      // Onda senoidal com modulação mais suave
      const modulation = Math.sin(2 * Math.PI * 2 * t) * 0.2;
      const wave = Math.sin(2 * Math.PI * frequency * t + modulation);

      // Envelope para suavizar início e fim
      const fadeIn = Math.min(1, t * 5); // Envelope mais suave
      const fadeOut = Math.min(1, (duration - t) * 5);
      const envelope = fadeIn * fadeOut;

      // Prosódia ajustada para evitar distorções
      const prosody = 0.6 + 0.2 * Math.sin(2 * Math.PI * t * 0.5);
      const amplitude = wave * envelope * prosody * 0.5; // Volume ajustado

      const sample = Math.round(amplitude * 32767);
      buffer.writeInt16LE(Math.max(-32767, Math.min(32767, sample)), 44 + i * 2);
    }

    return buffer;
  }

  /**
   * 📊 Status do serviço
   */
  getStatus() {
    return {
      initialized: this.initialized,
      engine: this.currentEngine,
      selectedVoice: this.selectedVoice,
      availableVoices: this.availableVoices.length,
      config: this.config
    };
  }

  /**
   * 🎵 Listar vozes disponíveis
   */
  listVoices() {
    return this.availableVoices.map(voice => ({
      name: voice.name,
      gender: voice.gender,
      language: voice.language,
      quality: voice.quality
    }));
  }

  /**
   * 🎵 Gerar voz sintética feminina (fallback)
   */
  generateSyntheticVoice(text) {
    const sampleRate = this.config.audio.sampleRate;
    const duration = Math.max(2, Math.min(8, text.length * 0.08)); // Duração baseada no texto
    const samples = Math.floor(sampleRate * duration);
    const dataSize = samples * 2; // 16-bit mono
    const fileSize = dataSize + 44;

    const buffer = Buffer.alloc(fileSize);

    // WAV header
    buffer.write('RIFF', 0);
    buffer.writeUInt32LE(fileSize - 8, 4);
    buffer.write('WAVE', 8);
    buffer.write('fmt ', 12);
    buffer.writeUInt32LE(16, 16);
    buffer.writeUInt16LE(1, 20);  // PCM
    buffer.writeUInt16LE(1, 22);  // Mono
    buffer.writeUInt32LE(sampleRate, 24);
    buffer.writeUInt32LE(sampleRate * 2, 28);
    buffer.writeUInt16LE(2, 32);
    buffer.writeUInt16LE(16, 34);
    buffer.write('data', 36);
    buffer.writeUInt32LE(dataSize, 40);

    // Gerar tom sintético feminino baseado no texto
    const baseFreq = 220; // Frequência base feminina (A3)
    const textHash = text.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const freqVariation = (textHash % 100) / 100;
    
    for (let i = 0; i < samples; i++) {
      const t = i / sampleRate;
      const frequency = baseFreq + (freqVariation * 50);
      
      // Onda senoidal com modulação para simular prosódia
      const modulation = Math.sin(2 * Math.PI * 4 * t) * 0.3;
      const wave = Math.sin(2 * Math.PI * frequency * t + modulation);
      
      // Envelope para suavizar início e fim
      const fadeIn = Math.min(1, t * 10);
      const fadeOut = Math.min(1, (duration - t) * 10);
      const envelope = fadeIn * fadeOut;
      
      // Prosódia (variação de volume para simular fala natural)
      const prosody = 0.5 + 0.3 * Math.sin(2 * Math.PI * t * 0.8);
      const amplitude = wave * envelope * prosody * 0.4; // Volume moderado
      
      const sample = Math.round(amplitude * 32767);
      buffer.writeInt16LE(Math.max(-32767, Math.min(32767, sample)), 44 + i * 2);
    }
    
    return buffer;
  }

  /**
   * ⚙️ Configurar voz
   */
  setVoice(voiceName) {
    const voice = this.availableVoices.find(v => v.name === voiceName);
    if (voice) {
      this.selectedVoice = voice;
      logger.success(`🎵 Voz alterada para: ${voice.name}`);
      return true;
    }
    logger.warn(`⚠️ Voz não encontrada: ${voiceName}`);
    return false;
  }

  /**
   * 🗣️ Sintetizar com flite
   */
  async synthesizeWithFlite(text, outputPath) {
    try {
      const command = `flite -t \"${text}\" -o \"${outputPath}\"`;
      const exec = require('child_process').exec;

      await new Promise((resolve, reject) => {
        exec(command, (error, stdout, stderr) => {
          if (error) {
            logger.error(`❌ Erro ao executar flite: ${stderr}`);
            return reject(error);
          }
          logger.info(`🎵 Áudio gerado com flite: ${outputPath}`);
          resolve(stdout);
        });
      });

      return true;
    } catch (error) {
      logger.error(`❌ Falha ao gerar áudio com flite: ${error.message}`);
      return false;
    }
  }
}

// Instância singleton
const textToSpeechService = new TextToSpeechService();

export { textToSpeechService, TextToSpeechService };