/**
 * 🎤 Comando Voice Interaction
 * Sistema completo de interação por voz com Speech-to-Text
 */

import { EmbedBuilder, PermissionFlagsBits } from 'discord.js';
import { VoiceInteractionManager } from '../../utils/VoiceInteractionManager.js';
import { logger } from '../../utils/logger.js';

// Instância global do gerenciador de voz
let voiceManager = null;

export default {
  name: 'voice',
  description: '🎤 Sistema de interação por voz com Speech-to-Text',
  usage: 'voice <join|leave|listen|stop|status>',
  category: 'voice',
  cooldown: 3,
  permissions: ['Connect', 'Speak'],

  async execute(client, message, args, guildConfig) {
    try {
      logger.info(`🎤 Comando voice executado por ${message.author.tag} com args: [${args.join(', ')}]`);
      
      // Inicializar voice manager se não existir
      if (!voiceManager) {
        logger.info('🔄 Inicializando VoiceInteractionManager...');
        voiceManager = new VoiceInteractionManager(client);
      }

      const subCommand = args[0]?.toLowerCase();
      logger.info(`🎯 Subcomando: ${subCommand || 'help'}`);

      switch (subCommand) {
        case 'join':
          return await this.handleJoin(message, voiceManager);
        
        case 'leave':
          return await this.handleLeave(message, voiceManager);
        
        case 'listen':
          return await this.handleListen(message, args, voiceManager);
        
        case 'stop':
          return await this.handleStopListening(message, voiceManager);
        
        case 'status':
          return await this.handleStatus(message, voiceManager);
        
        case 'test':
          return await this.handleTest(message, voiceManager);
        
        case 'tts':
          return await this.handleTTS(message, args, voiceManager);
        
        default:
          return await this.showHelp(message);
      }

    } catch (error) {
      logger.error('❌ Erro no comando voice:', error);
      
      const errorEmbed = new EmbedBuilder()
        .setColor(0xff0000)
        .setTitle('❌ Erro no Sistema de Voz')
        .setDescription(`Ocorreu um erro: ${error.message}`)
        .setTimestamp();

      return message.reply({ embeds: [errorEmbed] });
    }
  },

  /**
   * 🎵 Entrar no canal de voz
   */
  async handleJoin(message, voiceManager) {
    logger.info(`🎵 Tentativa de conexão por ${message.author.tag} na guild ${message.guild.name}`);
    
    const member = message.member;
    const voiceChannel = member?.voice?.channel;

    if (!voiceChannel) {
      logger.warn(`❌ ${message.author.tag} não está em um canal de voz`);
      const embed = new EmbedBuilder()
        .setColor(0xff0000)
        .setTitle('❌ Erro')
        .setDescription('Você precisa estar em um canal de voz primeiro!')
        .setTimestamp();

      return message.reply({ embeds: [embed] });
    }

    logger.info(`🎯 Canal de destino: ${voiceChannel.name} (${voiceChannel.id})`);

    // Verificar permissões
    const permissions = voiceChannel.permissionsFor(message.client.user);
    if (!permissions.has(PermissionFlagsBits.Connect) || !permissions.has(PermissionFlagsBits.Speak)) {
      logger.warn(`❌ Sem permissões no canal ${voiceChannel.name}`);
      const embed = new EmbedBuilder()
        .setColor(0xff0000)
        .setTitle('❌ Sem Permissões')
        .setDescription('Não tenho permissões para conectar ou falar neste canal!')
        .setTimestamp();

      return message.reply({ embeds: [embed] });
    }

    try {
      logger.info(`🔄 Iniciando conexão com o canal ${voiceChannel.id}...`);
      
      if (!message.guild.voiceAdapterCreator) {
        throw new Error('VoiceAdapterCreator não disponível');
      }

      await voiceManager.joinChannel(
        message.guild.id,
        voiceChannel.id,
        message.guild.voiceAdapterCreator
      );

      const embed = new EmbedBuilder()
        .setColor(0x00ff00)
        .setTitle('🎵 Conectado ao Canal de Voz')
        .setDescription(`Conectei ao canal **${voiceChannel.name}**!`)
        .addFields(
          { name: '📋 Próximos Passos', value: '• Use `m.voice listen` para ativar a escuta\n• Fale no canal para interagir comigo\n• Use `m.voice status` para ver o status' },
          { name: '💡 Dica', value: 'Fale "Mary" seguido do comando para me chamar!' }
        )
        .setTimestamp();

      return message.reply({ embeds: [embed] });

    } catch (error) {
      const embed = new EmbedBuilder()
        .setColor(0xff0000)
        .setTitle('❌ Erro na Conexão')
        .setDescription(`Não foi possível conectar: ${error.message}`)
        .setTimestamp();

      return message.reply({ embeds: [embed] });
    }
  },

  /**
   * 🚪 Sair do canal de voz
   */
  async handleLeave(message, voiceManager) {
    const success = await voiceManager.leaveChannel(message.guild.id);

    const embed = new EmbedBuilder()
      .setColor(success ? 0x00ff00 : 0xff0000)
      .setTitle(success ? '🚪 Desconectado' : '❌ Erro')
      .setDescription(success ? 'Saí do canal de voz com sucesso!' : 'Não estou conectado a nenhum canal de voz.')
      .setTimestamp();

    return message.reply({ embeds: [embed] });
  },

  /**
   * 🎧 Iniciar escuta
   */
  async handleListen(message, args, voiceManager) {
    const targetUser = message.mentions.users.first() || message.author;
    
    try {
      await voiceManager.startListening(message.guild.id, targetUser.id);

      const embed = new EmbedBuilder()
        .setColor(0x0099ff)
        .setTitle('🎧 Escuta Ativada')
        .setDescription(`Agora estou escutando **${targetUser.username}**!`)
        .addFields(
          { name: '🗣️ Como Usar', value: '• Fale no canal de voz\n• Diga comandos naturalmente\n• Ex: "Mary, mostrar meu perfil"' },
          { name: '⏱️ Limite', value: 'Máximo de 30 segundos por comando' }
        )
        .setTimestamp();

      return message.reply({ embeds: [embed] });

    } catch (error) {
      const embed = new EmbedBuilder()
        .setColor(0xff0000)
        .setTitle('❌ Erro na Escuta')
        .setDescription(`Não foi possível iniciar a escuta: ${error.message}`)
        .setTimestamp();

      return message.reply({ embeds: [embed] });
    }
  },

  /**
   * 🛑 Parar escuta
   */
  async handleStopListening(message, voiceManager) {
    // Por agora, simplesmente confirma a parada
    const embed = new EmbedBuilder()
      .setColor(0xffaa00)
      .setTitle('🛑 Escuta Parada')
      .setDescription('Parei de escutar comandos de voz.')
      .setTimestamp();

    return message.reply({ embeds: [embed] });
  },

  /**
   * 🧪 Teste de captura de áudio
   */
  async handleTest(message, voiceManager) {
    try {
      await voiceManager.testAudioCapture(message.guild.id, message.author.id);

      const embed = new EmbedBuilder()
        .setColor(0x00ffff)
        .setTitle('🧪 Teste de Captura Iniciado')
        .setDescription('Fale no canal de voz agora para testar a captura!')
        .addFields(
          { name: '📝 O que fazer', value: '1. Fale algo no canal de voz\n2. Verifique os logs do console\n3. Procure por mensagens de "Usuário começou a falar"' }
        )
        .setTimestamp();

      return message.reply({ embeds: [embed] });

    } catch (error) {
      const embed = new EmbedBuilder()
        .setColor(0xff0000)
        .setTitle('❌ Erro no Teste')
        .setDescription(`Erro: ${error.message}`)
        .setTimestamp();

      return message.reply({ embeds: [embed] });
    }
  },

  /**
   * 📊 Status das conexões
   */
  async handleStatus(message, voiceManager) {
    const status = voiceManager.getConnectionStatus(message.guild.id);

    if (!status) {
      const embed = new EmbedBuilder()
        .setColor(0xff0000)
        .setTitle('📊 Status da Voz')
        .setDescription('Não estou conectado a nenhum canal de voz neste servidor.')
        .setTimestamp();

      return message.reply({ embeds: [embed] });
    }

    const channel = message.guild.channels.cache.get(status.channelId);
    const uptimeMinutes = Math.floor(status.uptime / 60000);

    const embed = new EmbedBuilder()
      .setColor(0x00ff00)
      .setTitle('📊 Status da Conexão de Voz')
      .addFields(
        { name: '🎵 Canal', value: channel?.name || 'Desconhecido', inline: true },
        { name: '⏱️ Tempo Online', value: `${uptimeMinutes} minutos`, inline: true },
        { name: '👂 Escutando', value: `${status.listeningUsers} usuário(s)`, inline: true },
        { name: '👥 Usuários Ativos', value: status.users.length > 0 ? status.users.map(id => `<@${id}>`).join(', ') : 'Nenhum' }
      )
      .setTimestamp();

    return message.reply({ embeds: [embed] });
  },

  /**
   * 🔊 Testar Text-to-Speech
   */
  async handleTTS(message, args, voiceManager) {
    const testText = args.slice(1).join(' ') || 'Olá! Este é um teste do sistema de voz feminina. Como você está hoje?';
    
    try {
      const success = await voiceManager.playVoiceResponse(message.guild.id, testText);
      
      const embed = new EmbedBuilder()
        .setColor(success ? 0x00ff00 : 0xff0000)
        .setTitle(success ? '🔊 TTS Testado' : '❌ Erro no TTS')
        .setDescription(success ? 
          `Reproduzindo por voz: "${testText}"` : 
          'Falha ao reproduzir áudio TTS'
        )
        .addFields(
          { name: '🎤 Texto', value: testText, inline: false },
          { name: '📊 Status', value: success ? 'Sucesso' : 'Falha', inline: true }
        )
        .setTimestamp();

      return message.reply({ embeds: [embed] });
      
    } catch (error) {
      const errorEmbed = new EmbedBuilder()
        .setColor(0xff0000)
        .setTitle('❌ Erro no Teste TTS')
        .setDescription(`Erro: ${error.message}`)
        .setTimestamp();

      return message.reply({ embeds: [errorEmbed] });
    }
  },

  /**
   * 📚 Mostrar ajuda
   */
  async showHelp(message) {
    const embed = new EmbedBuilder()
      .setColor(0x0099ff)
      .setTitle('🎤 Sistema de Interação por Voz')
      .setDescription('Controle completo do sistema de Speech-to-Text')
      .addFields(
        { 
          name: '📋 Comandos Disponíveis', 
          value: '`m.voice join` - Entrar no seu canal de voz\n' +
                 '`m.voice leave` - Sair do canal de voz\n' +
                 '`m.voice listen [@usuário]` - Ativar escuta (seu usuário ou mencionado)\n' +
                 '`m.voice stop` - Parar escuta ativa\n' +
                 '`m.voice status` - Ver status da conexão\n' +
                 '`m.voice tts <texto>` - Testar sistema de voz (TTS)'
        },
        { 
          name: '🗣️ Como Usar Comandos de Voz', 
          value: '• Entre em um canal de voz\n' +
                 '• Use `m.voice join` para me conectar\n' +
                 '• 🔄 **A escuta contínua é automática!**\n' +
                 '• Fale comandos naturalmente no canal\n' +
                 '• O bot detecta automaticamente quando você fala'
        },
        { 
          name: '💡 Exemplos de Comandos de Voz', 
          value: '• "Mary, mostrar meu saldo"\n' +
                 '• "Mary, status do servidor"\n' +
                 '• "Mary, ajuda com dungeons"'
        },
        {
          name: '🗣️ Conversação Natural',
          value: '• "Oi Mary, como você está?"\n' +
                 '• "Mary, me conte uma piada"\n' +
                 '• "Mary, vamos conversar"\n' +
                 '• O bot responde por voz com IA!'
        },
        { 
          name: '⚠️ Requisitos', 
          value: '• Estar em um canal de voz\n' +
                 '• Bot precisa de permissões de Conectar e Falar\n' +
                 '• Microfone funcionando'
        }
      )
      .setFooter({ text: 'Sistema Speech-to-Text • MaryBot' })
      .setTimestamp();

    return message.reply({ embeds: [embed] });
  }
};