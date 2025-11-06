// Sistema de gerenciamento de canais de voz extensíveis
// Cria automaticamente novos canais quando usuários entram no canal principal
import { logger } from '../utils/logger.js';
import { configManager } from '../utils/configManager.js';
import { ChannelType, PermissionFlagsBits } from 'discord.js';

export class VoiceManager {
  constructor() {
    this.client = null;
    this.isInitialized = false;
    this.activeChannels = new Map(); // guildId -> { parentChannelId, createdChannels[] }
    this.channelQueue = new Map(); // guildId -> channelIds[] (canais livres)
    this.userChannelMap = new Map(); // userId -> channelId (rastreamento)
  }

  /**
   * Inicializa o gerenciador de voz
   */
  async initialize(client) {
    if (this.isInitialized) return;
    
    this.client = client;
    this.isInitialized = true;
    
    // Recuperar canais ativos e limpar órfãos se necessário
    await this.recoverActiveChannels();
    
    logger.info('✅ VoiceManager inicializado com sucesso!');
  }

  /**
   * Processa entrada/saída de usuário em canal de voz
   */
  async handleVoiceStateUpdate(oldState, newState) {
    try {
      const guild = newState.guild || oldState.guild;
      if (!guild) return;

      // Obter configurações do servidor
      const guildConfig = await configManager.getConfig(guild.id);
      const voiceConfig = guildConfig.voiceSettings || {};
      
      if (!voiceConfig.enabled) return;

      // Processar entrada em canal
      if (newState.channelId && !oldState.channelId) {
        await this.handleUserJoin(newState, voiceConfig);
      }
      // Processar mudança de canal
      else if (newState.channelId && oldState.channelId && newState.channelId !== oldState.channelId) {
        await this.handleUserMove(oldState, newState, voiceConfig);
      }
      // Processar saída de canal
      else if (!newState.channelId && oldState.channelId) {
        await this.handleUserLeave(oldState, voiceConfig);
      }

    } catch (error) {
      logger.error('Erro ao processar mudança de estado de voz:', error);
    }
  }

  /**
   * Processa entrada de usuário em canal de voz
   */
  async handleUserJoin(voiceState, voiceConfig) {
    const { member, channel } = voiceState;
    
    logger.info(`🔍 Verificando canal: ${channel.id} vs configurado: ${voiceConfig.parentChannelId}`);
    
    // Verificar se é o canal pai configurado
    if (channel.id === voiceConfig.parentChannelId) {
      logger.info(`🎯 Canal pai detectado! Processando ${member.displayName}`);
      
      const newChannel = await this.createOrAssignChannel(member.guild, voiceConfig, member);
      
      if (newChannel) {
        // Mover usuário para o novo canal
        try {
          await member.voice.setChannel(newChannel);
          this.userChannelMap.set(member.id, newChannel.id);
          
          logger.info(`🎤 Usuário ${member.displayName} movido para canal dinâmico: ${newChannel.name}`);
        } catch (error) {
          logger.error(`Erro ao mover usuário ${member.displayName}:`, error.message);
        }
      }
    }
  }

  /**
   * Processa mudança de canal do usuário
   */
  async handleUserMove(oldState, newState, voiceConfig) {
    // Primeiro processar a saída do canal anterior
    await this.handleUserLeave(oldState, voiceConfig);
    
    // Depois processar a entrada no novo canal
    await this.handleUserJoin(newState, voiceConfig);
  }

  /**
   * Processa saída de usuário do canal de voz
   */
  async handleUserLeave(voiceState, voiceConfig) {
    const { member, channel } = voiceState;
    
    if (!channel) return;

    // Remover do mapeamento
    this.userChannelMap.delete(member.id);

    // Verificar se é um canal criado dinamicamente
    const guildChannels = this.activeChannels.get(member.guild.id);
    if (!guildChannels) return;

    const channelData = guildChannels.createdChannels.find(c => c.channelId === channel.id);
    if (!channelData) return;

    // Se o canal ficou vazio, processar limpeza
    if (channel.members.size === 0) {
      await this.handleEmptyChannel(channel, voiceConfig);
    }
  }

  /**
   * Cria ou designa um canal disponível para o usuário
   */
  async createOrAssignChannel(guild, voiceConfig, member) {
    try {
      // Primeiro, tentar usar canal da fila (canal vazio existente)
      const queuedChannels = this.channelQueue.get(guild.id) || [];
      
      if (queuedChannels.length > 0) {
        const channelId = queuedChannels.shift();
        const channel = guild.channels.cache.get(channelId);
        
        if (channel && channel.members.size === 0) {
          this.channelQueue.set(guild.id, queuedChannels);
          return channel;
        }
      }

      // Se não há canais livres, criar novo
      const parentChannel = guild.channels.cache.get(voiceConfig.parentChannelId);
      if (!parentChannel) return null;

      // Contar canais existentes para numeração
      const guildChannels = this.activeChannels.get(guild.id) || { 
        parentChannelId: voiceConfig.parentChannelId, 
        createdChannels: [] 
      };
      
      const channelNumber = guildChannels.createdChannels.length + 1;
      const channelName = voiceConfig.channelNameTemplate
        .replace('{number}', channelNumber)
        .replace('{user}', member.displayName);

      // Criar novo canal de voz
      const newChannel = await guild.channels.create({
        name: channelName,
        type: ChannelType.GuildVoice,
        parent: parentChannel.parentId, // Mesma categoria do canal pai
        userLimit: voiceConfig.userLimit || 0,
        bitrate: voiceConfig.bitrate || 64000,
        position: parentChannel.position + channelNumber,
        permissionOverwrites: this.buildChannelPermissions(voiceConfig, member)
      });

      // Registrar o canal
      guildChannels.createdChannels.push({
        channelId: newChannel.id,
        createdAt: Date.now(),
        createdBy: member.id,
        temporary: voiceConfig.deleteWhenEmpty
      });

      this.activeChannels.set(guild.id, guildChannels);

      logger.info(`🎤 Canal de voz criado: ${newChannel.name} por ${member.displayName}`);
      
      return newChannel;

    } catch (error) {
      logger.error('Erro ao criar canal de voz:', error);
      return null;
    }
  }

  /**
   * Constrói permissões para o canal baseado na configuração
   */
  buildChannelPermissions(voiceConfig, creator) {
    const permissions = [];

    // Permissões para o criador (se habilitado)
    if (voiceConfig.giveCreatorPermissions) {
      permissions.push({
        id: creator.id,
        allow: [
          PermissionFlagsBits.Connect,
          PermissionFlagsBits.Speak,
          PermissionFlagsBits.MoveMembers,
          PermissionFlagsBits.ManageChannels
        ]
      });
    }

    // Permissões para roles específicas
    if (voiceConfig.allowedRoles && voiceConfig.allowedRoles.length > 0) {
      for (const roleId of voiceConfig.allowedRoles) {
        permissions.push({
          id: roleId,
          allow: [PermissionFlagsBits.Connect, PermissionFlagsBits.Speak]
        });
      }
    }

    return permissions;
  }

  /**
   * Processa canal vazio (limpeza ou reutilização)
   */
  async handleEmptyChannel(channel, voiceConfig) {
    const guildId = channel.guild.id;
    
    if (voiceConfig.deleteWhenEmpty) {
      // Deletar canal após delay
      setTimeout(async () => {
        try {
          // Verificar novamente se ainda está vazio
          const currentChannel = channel.guild.channels.cache.get(channel.id);
          if (currentChannel && currentChannel.members.size === 0) {
            await currentChannel.delete('Canal de voz temporário vazio');
            
            // Remover dos registros
            this.removeChannelFromRecords(guildId, channel.id);
            
            logger.info(`🗑️ Canal de voz temporário deletado: ${channel.name}`);
          }
        } catch (error) {
          logger.error('Erro ao deletar canal vazio:', error);
        }
      }, voiceConfig.emptyTimeout || 30000); // 30 segundos padrão

    } else {
      // Adicionar à fila de reutilização
      const queue = this.channelQueue.get(guildId) || [];
      if (!queue.includes(channel.id)) {
        queue.push(channel.id);
        this.channelQueue.set(guildId, queue);
      }
    }
  }

  /**
   * Remove canal dos registros internos
   */
  removeChannelFromRecords(guildId, channelId) {
    const guildChannels = this.activeChannels.get(guildId);
    if (!guildChannels) return;

    guildChannels.createdChannels = guildChannels.createdChannels.filter(
      c => c.channelId !== channelId
    );

    // Remover da fila também
    const queue = this.channelQueue.get(guildId) || [];
    const filteredQueue = queue.filter(id => id !== channelId);
    this.channelQueue.set(guildId, filteredQueue);
  }

  /**
   * Configura canal pai para um servidor
   */
  async setupParentChannel(guildId, channelId) {
    try {
      const guild = this.client.guilds.cache.get(guildId);
      if (!guild) return { success: false, error: 'Servidor não encontrado' };

      const channel = guild.channels.cache.get(channelId);
      if (!channel || channel.type !== ChannelType.GuildVoice) {
        return { success: false, error: 'Canal de voz não encontrado' };
      }

      // Registrar como canal pai
      this.activeChannels.set(guildId, {
        parentChannelId: channelId,
        createdChannels: []
      });

      return { success: true };

    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Lista canais ativos de um servidor
   */
  getGuildActiveChannels(guildId) {
    const guildData = this.activeChannels.get(guildId);
    if (!guildData) return [];

    return guildData.createdChannels;
  }

  /**
   * Recupera canais ativos após restart
   */
  async recoverActiveChannels() {
    // Implementação para recuperar canais após restart
    // Por enquanto, começar limpo - canais órfãos serão limpos gradualmente
    logger.info('🔄 Sistema de voz iniciado - canais órfãos serão limpos automaticamente');
  }

  /**
   * Limpeza de emergência - remove todos os canais temporários
   */
  async emergencyCleanup(guildId = null) {
    try {
      const guildsToClean = guildId ? [guildId] : Array.from(this.activeChannels.keys());

      for (const gId of guildsToClean) {
        const guildData = this.activeChannels.get(gId);
        if (!guildData) continue;

        const guild = this.client.guilds.cache.get(gId);
        if (!guild) continue;

        for (const channelData of guildData.createdChannels) {
          try {
            const channel = guild.channels.cache.get(channelData.channelId);
            if (channel) {
              await channel.delete('Limpeza de emergência');
            }
          } catch (error) {
            logger.error(`Erro ao deletar canal ${channelData.channelId}:`, error.message);
          }
        }

        // Limpar registros
        this.activeChannels.delete(gId);
        this.channelQueue.delete(gId);
      }

      logger.info(`🧹 Limpeza de canais de voz concluída para ${guildsToClean.length} servidor(es)`);

    } catch (error) {
      logger.error('Erro na limpeza de emergência dos canais de voz:', error);
    }
  }

  /**
   * Estatísticas do sistema
   */
  getStats() {
    let totalChannels = 0;
    let totalQueued = 0;

    for (const guildData of this.activeChannels.values()) {
      totalChannels += guildData.createdChannels.length;
    }

    for (const queue of this.channelQueue.values()) {
      totalQueued += queue.length;
    }

    return {
      activeGuilds: this.activeChannels.size,
      totalChannels,
      queuedChannels: totalQueued,
      activeUsers: this.userChannelMap.size,
      isInitialized: this.isInitialized
    };
  }
}

// Instância global do gerenciador de voz
export const voiceManager = new VoiceManager();