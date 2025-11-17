/**
 * 🎤 Sistema de Interação por Voz
 * Gerencia conexões de voz, captura de áudio e conversão speech-to-text
 */

import { 
  joinVoiceChannel, 
  createAudioPlayer, 
  createAudioResource,
  getVoiceConnection,
  VoiceConnectionStatus,
  AudioPlayerStatus,
  EndBehaviorType
} from '@discordjs/voice';
import { createWriteStream, unlinkSync, existsSync, mkdirSync } from 'fs';
import { pipeline } from 'stream';
import { promisify } from 'util';
import path from 'path';
import { logger } from './logger.js';
import { speechToTextService } from './SpeechToTextService.js';
import { textToSpeechService } from './TextToSpeechService.js';
import { handleConversation } from './conversationManager.js';
import { voiceConversationService } from './VoiceConversationService.js';

const pipelineAsync = promisify(pipeline);

class VoiceInteractionManager {
  constructor(client) {
    this.client = client;
    this.activeConnections = new Map();
    this.listeningUsers = new Map();
    this.audioStreams = new Map();
    
    // Configurações
    this.config = {
      maxRecordingTime: 30000, // 30 segundos máximo
      silenceThreshold: 1000, // 1 segundo de silêncio para parar
      audioFormat: 'opus',
      sampleRate: 48000,
      channels: 2,
      tempDir: path.join(process.cwd(), 'temp', 'voice'),
    };
    
    this.initializeTempDir();
  }

  /**
   * 📁 Inicializar diretório temporário
   */
  initializeTempDir() {
    try {
      if (!existsSync(this.config.tempDir)) {
        mkdirSync(this.config.tempDir, { recursive: true });
        logger.info(`📁 Diretório temporário criado: ${this.config.tempDir}`);
      }
    } catch (error) {
      logger.error('❌ Erro ao criar diretório temporário:', error.message || error);
      // Criar diretório alternativo se falhar
      try {
        this.config.tempDir = path.join(process.cwd(), 'src', 'temp');
        if (!existsSync(this.config.tempDir)) {
          mkdirSync(this.config.tempDir, { recursive: true });
        }
        logger.info(`📁 Usando diretório temporário alternativo: ${this.config.tempDir}`);
      } catch (fallbackError) {
        logger.error('❌ Erro ao criar diretório temporário alternativo:', fallbackError.message || fallbackError);
      }
    }
  }

  /**
   * 🎵 Conectar ao canal de voz
   */
  async joinChannel(guildId, channelId, adapterCreator) {
    try {
      logger.info(`🎵 Conectando ao canal de voz: ${channelId}`);

      // Verificar se já existe uma conexão
      const existingConnection = this.activeConnections.get(guildId);
      if (existingConnection && existingConnection.connection.state.status !== VoiceConnectionStatus.Destroyed) {
        logger.info(`🔄 Reutilizando conexão existente para guild ${guildId}`);
        return existingConnection.connection;
      }

      const connection = joinVoiceChannel({
        channelId,
        guildId,
        adapterCreator,
        selfDeaf: false,
        selfMute: false,
      });

      // Aguardar conexão
      await this.waitForConnection(connection);
      
      this.activeConnections.set(guildId, {
        connection,
        channelId,
        connectedAt: Date.now(),
        isListening: false,
        continuousListening: true
      });

      // 🎯 Iniciar escuta contínua automaticamente após 2 segundos
      setTimeout(() => {
        this.startContinuousListening(guildId);
      }, 2000);

      logger.success(`✅ Conectado ao canal de voz ${channelId} com escuta contínua ativada`);
      return connection;

    } catch (error) {
      logger.error('❌ Erro ao conectar ao canal de voz:', error.message || error);
      // Limpar conexão falhada
      this.activeConnections.delete(guildId);
      throw new Error(`Erro de conexão: ${error.message || 'Erro desconhecido'}`);
    }
  }

  /**
   * ⏳ Aguardar conexão estável
   */
  async waitForConnection(connection) {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        connection.removeAllListeners();
        reject(new Error('Timeout na conexão de voz (10s)'));
      }, 10000);

      const cleanup = () => {
        clearTimeout(timeout);
        connection.removeAllListeners(VoiceConnectionStatus.Ready);
        connection.removeAllListeners(VoiceConnectionStatus.Destroyed);
        connection.removeAllListeners(VoiceConnectionStatus.Disconnected);
      };

      // Se já está pronto
      if (connection.state.status === VoiceConnectionStatus.Ready) {
        cleanup();
        return resolve();
      }

      connection.once(VoiceConnectionStatus.Ready, () => {
        cleanup();
        logger.info('🎵 Conexão de voz estabelecida');
        resolve();
      });

      connection.once(VoiceConnectionStatus.Destroyed, () => {
        cleanup();
        reject(new Error('Conexão de voz foi destruída'));
      });

      connection.once(VoiceConnectionStatus.Disconnected, () => {
        cleanup();
        reject(new Error('Conexão de voz foi desconectada'));
      });

      connection.on(VoiceConnectionStatus.Disconnected, () => {
        clearTimeout(timeout);
        reject(new Error('Desconectado do canal de voz'));
      });
    });
  }

  /**
   * 🎧 Iniciar escuta de usuário específico
   */
  async startListening(guildId, userId) {
    try {
      const connectionData = this.activeConnections.get(guildId);
      if (!connectionData) {
        throw new Error('Bot não está conectado a um canal de voz neste servidor');
      }

      logger.info(`🎧 Iniciando escuta do usuário: ${userId}`);

      const connection = connectionData.connection;
      const receiver = connection.receiver;

      logger.info(`📡 Receiver obtido: ${receiver ? 'OK' : 'FALHA'}`);

      // Criar stream de áudio para o usuário com configurações otimizadas
      const audioStream = receiver.subscribe(userId, {
        end: {
          behavior: EndBehaviorType.AfterSilence,
          duration: this.config.silenceThreshold || 1000, // 1 segundo de silêncio
        },
        mode: 'pcm', // Formato PCM para melhor compatibilidade
        channels: 1,  // Mono
        sampleRate: 48000, // Taxa padrão do Discord
      });

      logger.info(`🎵 AudioStream criado: ${audioStream ? 'OK' : 'FALHA'}`);

      // Criar arquivo temporário
      const audioFile = path.join(
        this.config.tempDir, 
        `${guildId}_${userId}_${Date.now()}.pcm`
      );

      logger.info(`📁 Arquivo de áudio: ${audioFile}`);

      // Gravar áudio
      const writeStream = createWriteStream(audioFile);
      
      const recordingSession = {
        userId,
        guildId,
        audioFile,
        writeStream,
        audioStream,
        startTime: Date.now(),
        isRecording: true
      };

      this.listeningUsers.set(`${guildId}_${userId}`, recordingSession);

      // Adicionar logs e controle para eventos do audioStream
      let totalBytesReceived = 0;
      let dataChunks = 0;

      audioStream.on('data', (chunk) => {
        totalBytesReceived += chunk.length;
        dataChunks++;
        logger.info(`📊 Áudio recebido: chunk ${dataChunks} (${chunk.length} bytes) - Total: ${totalBytesReceived} bytes`);
      });

      audioStream.on('end', () => {
        logger.info(`⏹️ Stream finalizado para ${userId} - Total: ${totalBytesReceived} bytes em ${dataChunks} chunks`);
      });

      audioStream.on('error', (error) => {
        logger.error(`❌ Erro no stream de áudio:`, error);
        recordingSession.isRecording = false;
      });

      audioStream.on('close', () => {
        logger.info(`🔒 Stream de áudio fechado para usuário ${userId}`);
      });

      // Configurar timeout para gravação
      const recordingTimeout = setTimeout(() => {
        logger.info(`⏰ Timeout de gravação para usuário ${userId} - 30s`);
        if (recordingSession.isRecording) {
          recordingSession.isRecording = false;
          writeStream.end();
        }
      }, 30000); // 30 segundos

      // Pipeline de gravação
      await pipelineAsync(audioStream, writeStream);

      // Limpar timeout
      clearTimeout(recordingTimeout);

      // Processar áudio gravado
      await this.processRecordedAudio(recordingSession);

    } catch (error) {
      logger.error(`❌ Erro ao escutar usuário ${userId}:`, error);
      throw error;
    }
  }

  /**
   * 🔄 Processar áudio gravado
   */
  async processRecordedAudio(session) {
    try {
      logger.info(`🔄 Processando áudio de ${session.userId}`);
      
      // Transcrever áudio para texto
      const transcribedText = await this.speechToText(session.audioFile);
      
      if (transcribedText && transcribedText.trim()) {
        logger.info(`💬 Texto transcrito: "${transcribedText}"`);
        
        // Processar apenas como conversa natural (comandos removidos)
        logger.info('💭 Processando como conversa natural...');
        
        const conversationResult = await this.processNaturalConversation(
          session.guildId, 
          session.userId, 
          transcribedText
        );
        
        if (conversationResult && conversationResult.success) {
          logger.success('✅ Conversa natural processada com sucesso');
        } else {
          logger.warn('⚠️ Não foi possível processar a conversa');
        }
      }

      // Limpar arquivo temporário
      this.cleanupAudioFile(session.audioFile);
      
    } catch (error) {
      logger.error('❌ Erro ao processar áudio:', error);
    } finally {
      // Remover sessão
      this.listeningUsers.delete(`${session.guildId}_${session.userId}`);
    }
  }

  /**
   * 🗣️ Conversão Speech-to-Text
   */
  async speechToText(audioFile) {
    return await speechToTextService.transcribeAudio(audioFile);
  }

  /**
   * 🔄 Iniciar escuta contínua para todos os usuários
   */
  async startContinuousListening(guildId) {
    try {
      const connectionData = this.activeConnections.get(guildId);
      if (!connectionData || !connectionData.continuousListening) {
        return;
      }

      logger.info(`🔄 Sistema de escuta contínua ativado para guild ${guildId}`);

      const connection = connectionData.connection;
      const receiver = connection.receiver;

      // Monitorar eventos de speaking para todos os usuários
      receiver.speaking.on('start', async (userId) => {
        logger.info(`🗣️ Usuário ${userId} começou a falar - iniciando captura automática`);
        
        // Verificar se já está escutando este usuário
        const sessionKey = `${guildId}_${userId}`;
        if (this.listeningUsers.has(sessionKey)) {
          logger.info(`⚠️ Já escutando usuário ${userId}, ignorando...`);
          return;
        }

        // Iniciar escuta automática
        await this.startAutoListening(guildId, userId);
      });

      receiver.speaking.on('end', (userId) => {
        logger.info(`🤫 Usuário ${userId} parou de falar`);
      });

      // Marcar como escuta contínua ativa
      connectionData.isListening = true;
      
    } catch (error) {
      logger.error('❌ Erro ao iniciar escuta contínua:', error);
    }
  }

  /**
   * 🎧 Escuta automática para usuário específico
   */
  async startAutoListening(guildId, userId) {
    try {
      const connectionData = this.activeConnections.get(guildId);
      if (!connectionData) return;

      const connection = connectionData.connection;
      const receiver = connection.receiver;

      // Criar stream otimizado para captura contínua
      const audioStream = receiver.subscribe(userId, {
        end: {
          behavior: EndBehaviorType.AfterSilence,
          duration: 800, // Reduzir para 800ms de silêncio
        },
        mode: 'pcm',
        channels: 1,
        sampleRate: 48000,
      });

      const audioFile = path.join(
        this.config.tempDir, 
        `auto_${guildId}_${userId}_${Date.now()}.pcm`
      );

      const writeStream = createWriteStream(audioFile);
      
      const recordingSession = {
        userId,
        guildId,
        audioFile,
        writeStream,
        audioStream,
        startTime: Date.now(),
        isRecording: true,
        isAutomatic: true // Marcar como escuta automática
      };

      this.listeningUsers.set(`${guildId}_${userId}`, recordingSession);

      // Timeout automático de 15 segundos
      const autoTimeout = setTimeout(() => {
        if (recordingSession.isRecording) {
          logger.info(`⏰ Timeout automático para usuário ${userId}`);
          recordingSession.isRecording = false;
          writeStream.end();
        }
      }, 15000);

      // Eventos do stream
      let totalBytes = 0;
      let chunks = 0;

      audioStream.on('data', (chunk) => {
        totalBytes += chunk.length;
        chunks++;
        // Logs reduzidos para não spam
        if (chunks % 20 === 0) {
          logger.info(`📊 Captura contínua: ${chunks} chunks, ${totalBytes} bytes`);
        }
      });

      audioStream.on('end', () => {
        clearTimeout(autoTimeout);
        logger.info(`⏹️ Captura automática finalizada: ${totalBytes} bytes em ${chunks} chunks`);
        this.processRecordedAudio(recordingSession);
      });

      audioStream.on('error', (error) => {
        clearTimeout(autoTimeout);
        logger.error('❌ Erro na captura automática:', error);
        recordingSession.isRecording = false;
        this.listeningUsers.delete(`${guildId}_${userId}`);
      });

      // Pipeline de gravação
      await pipelineAsync(audioStream, writeStream);
      
    } catch (error) {
      logger.error(`❌ Erro na escuta automática para usuário ${userId}:`, error);
    }
  }

  /**
   * 🔊 Reproduzir resposta por voz (TTS)
   */
  async playVoiceResponse(guildId, text, options = {}) {
    try {
      const connectionData = this.activeConnections.get(guildId);
      if (!connectionData) {
        logger.warn('⚠️ Não há conexão de voz ativa para reprodução TTS');
        return false;
      }

      logger.info(`🔊 Gerando resposta por voz: "${text.substring(0, 50)}${text.length > 50 ? '...' : ''}"`);
      
      // Gerar áudio TTS
      const audioPath = await textToSpeechService.synthesizeText(text, options);
      if (!audioPath) {
        logger.error('❌ Falha ao gerar áudio TTS');
        return false;
      }

      // Reproduzir áudio no canal de voz
      const success = await this.playAudioFile(guildId, audioPath);
      
      if (success) {
        logger.success(`✅ Resposta por voz reproduzida com sucesso`);
      } else {
        logger.error('❌ Falha ao reproduzir áudio no canal');
      }
      
      return success;
      
    } catch (error) {
      logger.error('❌ Erro ao reproduzir resposta por voz:', error);
      return false;
    }
  }

  /**
   * 🎧 Reproduzir arquivo de áudio no canal de voz
   */
  async playAudioFile(guildId, audioPath) {
    try {
      const connectionData = this.activeConnections.get(guildId);
      if (!connectionData || !connectionData.connection) {
        logger.warn('⚠️ Nenhuma conexão de voz disponível');
        return false;
      }

      const connection = connectionData.connection;
      
      // Criar player de áudio
      const resource = createAudioResource(audioPath, {
        inputType: StreamType.Arbitrary,
        inlineVolume: true
      });
      
      // Configurar volume
      resource.volume?.setVolume(0.8);
      
      const player = createAudioPlayer({
        behaviors: {
          noSubscriber: NoSubscriberBehavior.Pause,
        },
      });
      
      // Eventos do player
      player.on('error', error => {
        logger.error('❌ Erro no player de áudio:', error);
      });
      
      let isFinished = false;
      
      player.on(AudioPlayerStatus.Idle, () => {
        if (!isFinished) {
          logger.info('🎧 Reprodução de áudio finalizada');
          isFinished = true;
        }
      });
      
      // Reproduzir
      player.play(resource);
      connection.subscribe(player);
      
      logger.info('🎧 Iniciando reprodução de áudio...');
      
      // Aguardar conclusão ou timeout
      return new Promise((resolve) => {
        const timeout = setTimeout(() => {
          logger.warn('⏰ Timeout na reprodução de áudio');
          player.stop();
          resolve(false);
        }, 30000); // 30 segundos
        
        player.on(AudioPlayerStatus.Idle, () => {
          clearTimeout(timeout);
          resolve(true);
        });
        
        player.on('error', () => {
          clearTimeout(timeout);
          resolve(false);
        });
      });
      
    } catch (error) {
      logger.error('❌ Erro ao reproduzir arquivo de áudio:', error);
      return false;
    }
  }

  /**
   * 🧪 Testar captura de áudio (modo de desenvolvimento)
   */
  async testAudioCapture(guildId, userId) {
    const connectionData = this.activeConnections.get(guildId);
    if (!connectionData) {
      throw new Error('Bot não está conectado');
    }

    const receiver = connectionData.connection.receiver;
    logger.info(`🧪 Iniciando teste de captura para usuário ${userId}`);
    
    // Teste básico de receiver
    const users = receiver.speaking.users;
    logger.info(`👥 Usuários ativos no receiver: ${Array.from(users.keys()).join(', ')}`);
    
    // Monitorar eventos de speaking
    receiver.speaking.on('start', (userId) => {
      logger.info(`🗣️ Usuário ${userId} começou a falar`);
    });

    receiver.speaking.on('end', (userId) => {
      logger.info(`🤫 Usuário ${userId} parou de falar`);
    });

    return true;
  }

  /**
   * 💻 Processar comando de voz avançado (com TTS)
   */
  async processVoiceCommandAdvanced(guildId, userId, text) {
    try {
      logger.info(`💻 Processando comando de voz: "${text}"`);

      // Processar o comando de voz usando o serviço STT
      const command = speechToTextService.processVoiceCommand(text);
      
      if (!command) {
        logger.info('💭 Nenhum comando válido detectado');
        return { success: false, reason: 'Não é um comando válido' };
      }

      // Executar comando (aqui você integraria com o sistema de comandos real)
      const prefix = 'm.';
      const commandName = command;
      const fullCommand = `${prefix}${commandName}`;
      
      logger.success(`✅ Comando de voz executado: ${fullCommand}`);
      
      // Gerar resposta por voz para comando executado
      const responseText = this.generateCommandResponse(commandName, text);
      if (responseText) {
        setTimeout(() => {
          this.playVoiceResponse(guildId, responseText);
        }, 1000); // Delay de 1 segundo antes da resposta
      }
      
      return { success: true, command: fullCommand, originalText: text };
      
    } catch (error) {
      logger.error('❌ Erro ao processar comando de voz:', error);
      return { success: false, error: error.message, originalText: text };
    }
  }

  /**
   * 💻 Processar comando de voz (método legado)
   */
  async processVoiceCommand(guildId, userId, text) {
    try {
      logger.info(`💻 Processando comando de voz: "${text}"`);

      // Processar o comando de voz usando o serviço STT
      const command = speechToTextService.processVoiceCommand(text);
      
      if (!command) {
        logger.info('💭 Nenhum comando válido detectado');
        return;
      }

      const guild = this.client.guilds.cache.get(guildId);
      const user = guild?.members.cache.get(userId);
      
      if (!user) return;

      // Encontrar canal de texto para enviar confirmação
      const textChannel = guild.channels.cache.find(c => 
        c.type === 0 && c.permissionsFor(guild.members.me).has('SendMessages')
      );

      if (textChannel) {
        // Criar mensagem simulada para processamento
        const fakeMessage = {
          content: `m.${command}`,
          author: user.user,
          member: user,
          guild,
          channel: textChannel,
          reply: async (content) => {
            // Enviar resposta no canal de texto
            if (typeof content === 'string') {
              await textChannel.send(`🎤 **${user.user.username}** (comando de voz): ${content}`);
            } else {
              await textChannel.send({ 
                content: `🎤 **Comando de voz de ${user.user.username}**:`,
                ...content 
              });
            }
          }
        };

        // Simular execução do comando (aqui você integraria com o sistema real)
        logger.success(`✅ Comando de voz executado: m.${command}`);
        
        await textChannel.send(`🎤 **${user.user.username}** disse: "${text}" → Executando: \`m.${command}\``);
      }
      
    } catch (error) {
      logger.error('❌ Erro ao processar comando de voz:', error);
    }
  }

  /**
   * 📊 Obter status das conexões
   */
  getConnectionStatus(guildId) {
    const connection = this.activeConnections.get(guildId);
    if (!connection) return null;

    const listeningUsers = Array.from(this.listeningUsers.keys())
      .filter(key => key.startsWith(guildId))
      .map(key => key.split('_')[1]);

    return {
      channelId: connection.channelId,
      connectedAt: connection.connectedAt,
      uptime: Date.now() - connection.connectedAt,
      isListening: connection.isListening,
      listeningUsers: listeningUsers.length,
      users: listeningUsers
    };
  }

  /**
   * 🚪 Sair do canal de voz
   */
  async leaveChannel(guildId) {
    try {
      const connectionData = this.activeConnections.get(guildId);
      if (!connectionData) {
        return false;
      }

      logger.info(`🚪 Saindo do canal de voz: ${connectionData.channelId}`);

      // Parar todas as sessões de escuta
      const sessionsToStop = Array.from(this.listeningUsers.keys())
        .filter(key => key.startsWith(guildId));

      for (const sessionKey of sessionsToStop) {
        const session = this.listeningUsers.get(sessionKey);
        if (session && session.isRecording) {
          session.writeStream.end();
          session.audioStream.destroy();
        }
        this.listeningUsers.delete(sessionKey);
      }

      // Desconectar
      connectionData.connection.destroy();
      this.activeConnections.delete(guildId);

      logger.success('✅ Desconectado do canal de voz');
      return true;

    } catch (error) {
      logger.error('❌ Erro ao sair do canal:', error);
      return false;
    }
  }

  /**
   * 🔊 Reproduzir resposta por voz (TTS)
   */
  async playVoiceResponse(guildId, text, options = {}) {
    try {
      const connectionData = this.activeConnections.get(guildId);
      if (!connectionData) {
        logger.warn('⚠️ Não há conexão de voz ativa para reprodução TTS');
        return false;
      }

      logger.info(`🔊 Gerando resposta por voz: "${text.substring(0, 50)}${text.length > 50 ? '...' : ''}"`);
      
      // Gerar áudio TTS
      const audioPath = await textToSpeechService.synthesizeText(text, options);
      if (!audioPath) {
        logger.error('❌ Falha ao gerar áudio TTS');
        return false;
      }

      // Reproduzir áudio no canal de voz
      const success = await this.playAudioFile(guildId, audioPath);
      
      if (success) {
        logger.success('✅ Resposta por voz reproduzida com sucesso');
      } else {
        logger.error('❌ Falha ao reproduzir áudio no canal');
      }
      
      return success;
      
    } catch (error) {
      logger.error('❌ Erro ao reproduzir resposta por voz:', error);
      return false;
    }
  }

  /**
   * 🎧 Reproduzir arquivo de áudio no canal de voz
   */
  async playAudioFile(guildId, audioPath) {
    try {
      const connectionData = this.activeConnections.get(guildId);
      if (!connectionData || !connectionData.connection) {
        logger.warn('⚠️ Nenhuma conexão de voz disponível');
        return false;
      }

      const connection = connectionData.connection;
      
      // Importar dependências necessárias para reprodução
      const { createAudioPlayer, createAudioResource, StreamType, NoSubscriberBehavior, AudioPlayerStatus } = await import('@discordjs/voice');
      
      // Criar player de áudio
      const resource = createAudioResource(audioPath, {
        inputType: StreamType.Arbitrary,
        inlineVolume: true
      });
      
      // Configurar volume
      resource.volume?.setVolume(0.8);
      
      const player = createAudioPlayer({
        behaviors: {
          noSubscriber: NoSubscriberBehavior.Pause,
        },
      });
      
      // Eventos do player
      player.on('error', error => {
        logger.error('❌ Erro no player de áudio:', error);
      });
      
      let isFinished = false;
      
      player.on(AudioPlayerStatus.Idle, () => {
        if (!isFinished) {
          logger.info('🎧 Reprodução de áudio finalizada');
          isFinished = true;
        }
      });
      
      // Reproduzir
      player.play(resource);
      connection.subscribe(player);
      
      logger.info('🎧 Iniciando reprodução de áudio...');
      
      // Aguardar conclusão ou timeout
      return new Promise((resolve) => {
        const timeout = setTimeout(() => {
          logger.warn('⏰ Timeout na reprodução de áudio');
          player.stop();
          resolve(false);
        }, 30000); // 30 segundos
        
        player.on(AudioPlayerStatus.Idle, () => {
          clearTimeout(timeout);
          resolve(true);
        });
        
        player.on('error', () => {
          clearTimeout(timeout);
          resolve(false);
        });
      });
      
    } catch (error) {
      logger.error('❌ Erro ao reproduzir arquivo de áudio:', error);
      return false;
    }
  }

  /**
   * 💬 Processar conversa natural por voz
   */
  async processNaturalConversation(guildId, userId, text) {
    try {
      logger.info(`💬 Processando conversa natural: "${text}"`);
      
      // Obter dados do usuário e guild
      const guild = this.client.guilds.cache.get(guildId);
      const user = guild?.members.cache.get(userId);
      
      if (!user || !guild) {
        logger.warn('⚠️ Usuário ou guild não encontrado para conversa');
        return { success: false, reason: 'Usuário não encontrado' };
      }

      // Criar objeto message simulado para o conversationManager
      const mockMessage = {
        author: user.user,
        member: user,
        guild: guild,
        channel: {
          id: `voice_${guildId}`,
          name: 'Conversa por Voz',
          type: 0
        },
        content: `@${this.client.user.username} ${text}`,
        reply: async (response) => {
          // Callback para enviar resposta por voz
          if (typeof response === 'string') {
            await this.playVoiceResponse(guildId, response);
          } else if (response.content) {
            await this.playVoiceResponse(guildId, response.content);
          }
        }
      };

      // Usar serviço avançado de conversa por voz com IA
      try {
        // Contexto adicional sobre o servidor
        const guildContext = {
          guildId: guildId,
          guildName: guild.name,
          channelType: 'voice',
          userName: user.displayName || user.user.username
        };

        const aiResponse = await voiceConversationService.generateContextualResponse(
          userId, 
          text, 
          guildContext
        );

        if (aiResponse && aiResponse.success) {
          // Reproduzir resposta por voz
          await this.playVoiceResponse(guildId, aiResponse.response);
          
          logger.success(`✅ Resposta IA (${aiResponse.source}) gerada e reproduzida por voz`);
          return { 
            success: true, 
            response: aiResponse.response, 
            source: aiResponse.source,
            confidence: aiResponse.confidence 
          };
        }
      } catch (aiError) {
        logger.warn('⚠️ Serviço de IA não disponível:', aiError.message);
      }

      // Fallback para respostas simples locais
      const fallbackResponse = this.generateNaturalResponse(text, userId);
      if (fallbackResponse) {
        await this.playVoiceResponse(guildId, fallbackResponse);
        return { success: true, response: fallbackResponse, source: 'local-fallback' };
      }
      
      return { success: false, reason: 'Nenhuma resposta gerada' };
      
    } catch (error) {
      logger.error('❌ Erro no processamento de conversa natural:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * 🤖 Gerar resposta natural
   */
  generateNaturalResponse(text, userId) {
    const lowerText = text.toLowerCase();
    
    // Respostas para saudações
    if (lowerText.includes('oi') || lowerText.includes('olá') || lowerText.includes('hey')) {
      return 'Oi! Como você está? Como posso te ajudar hoje?';
    }
    
    // Respostas para perguntas sobre o bot
    if (lowerText.includes('como você está') || lowerText.includes('tudo bem')) {
      return 'Estou muito bem, obrigada por perguntar! E você, como está se sentindo?';
    }
    
    if (lowerText.includes('o que você faz') || lowerText.includes('para que serve')) {
      return 'Eu sou a Mary! Posso te ajudar com economia, dungeons, jogos e muito mais. Quer que eu te mostre alguns comandos?';
    }
    
    // Respostas para agradecimentos
    if (lowerText.includes('obrigad') || lowerText.includes('valeu')) {
      return 'De nada! Fico feliz em ajudar. Se precisar de mais alguma coisa, é só falar!';
    }
    
    // Respostas para despedidas
    if (lowerText.includes('tchau') || lowerText.includes('até logo')) {
      return 'Tchau! Foi um prazer conversar com você. Até a próxima!';
    }
    
    // Resposta padrão para conversas não classificadas
    if (text.length > 10) {
      return 'Interessante! Me conte mais sobre isso, ou posso te ajudar com algum comando específico?';
    }
    
    return null;
  }

  /**
   * 🗣️ Gerar resposta contextual para comando
   */
  generateCommandResponse(commandName, originalText) {
    const responses = {
      'help': [
        'Olá! Estou aqui para te ajudar. Você pode me pedir informações sobre comandos, economia ou dungeons.',
        'Oi! Como posso te auxiliar hoje? Posso explicar sobre os sistemas do bot.',
        'Oie! Precisa de ajuda com alguma coisa? Estou aqui para te ajudar!'
      ],
      'profile': [
        'Aqui está o seu perfil! Você pode ver suas informações e progresso.',
        'Mostrando seu perfil com todas as suas estatísticas.',
        'Seu perfil está pronto! Dá uma olhada nas suas conquistas.'
      ],
      'balance': [
        'Verificando seu saldo... Aqui estão suas moedas!',
        'Seu saldo foi atualizado! Confira quanto você tem.',
        'Mostrando suas moedas e economia atual.'
      ],
      'inventory': [
        'Abrindo seu inventário... Veja todos os seus itens!',
        'Aqui está sua mochila com todos os itens coletados.',
        'Inventário carregado! Confira seus equipamentos.'
      ],
      'dungeon': [
        'Entrando na dungeon... Prepare-se para a aventura!',
        'Dungeon ativada! Boa sorte na exploração.',
        'Iniciando sua jornada na dungeon. Cuidado com os monstros!'
      ],
      'ping': [
        'Pong! Estou funcionando perfeitamente.',
        'Oi! Estou online e pronta para te ajudar.',
        'Pong pong! Tudo funcionando por aqui.'
      ]
    };
    
    const commandResponses = responses[commandName];
    if (commandResponses && commandResponses.length > 0) {
      // Escolher resposta aleatória
      const randomIndex = Math.floor(Math.random() * commandResponses.length);
      return commandResponses[randomIndex];
    }
    
    // Resposta genérica
    return `Comando ${commandName} executado com sucesso!`;
  }

  /**
   * 🗑️ Limpar arquivo de áudio
   */
  cleanupAudioFile(filePath) {
    try {
      unlinkSync(filePath);
    } catch (error) {
      logger.error('❌ Erro ao limpar arquivo de áudio:', error);
    }
  }

  /**
   * 🧹 Limpar recursos
   */
  async cleanup() {
    logger.info('🧹 Limpando recursos de voz...');
    
    for (const guildId of this.activeConnections.keys()) {
      await this.leaveChannel(guildId);
    }
    
    logger.success('✅ Recursos de voz limpos');
  }
}

export { VoiceInteractionManager };