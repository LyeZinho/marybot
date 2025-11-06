// Sistema de gerenciamento de threads temporárias
// Monitora atividade e limpa threads inativas automaticamente
import { logger } from '../utils/logger.js';
import { configManager } from '../utils/configManager.js';

export class ThreadManager {
  constructor() {
    this.activeRooms = new Map(); // threadId -> roomData
    this.timers = new Map(); // threadId -> timeout
    this.userRooms = new Map(); // userId-guildId -> count
    this.client = null;
    this.isInitialized = false;
  }

  /**
   * Inicializa o gerenciador de threads
   */
  async initialize(client) {
    if (this.isInitialized) return;
    
    this.client = client;
    this.isInitialized = true;
    
    // Recuperar threads ativas no restart (se necessário)
    await this.recoverActiveRooms();
    
    logger.info('✅ ThreadManager inicializado com sucesso!');
  }

  /**
   * Registra uma nova sala temporária
   */
  async registerRoom(thread, options = {}) {
    const roomData = {
      threadId: thread.id,
      guildId: thread.guild.id,
      channelId: thread.parentId,
      creatorId: options.creatorId,
      createdAt: options.createdAt || Date.now(),
      duration: options.duration || 30, // minutos
      lastActivity: Date.now(),
      members: new Set([options.creatorId]),
      isActive: true
    };

    this.activeRooms.set(thread.id, roomData);
    
    // Atualizar contador de salas do usuário
    const userKey = `${options.creatorId}-${thread.guild.id}`;
    const currentCount = this.userRooms.get(userKey) || 0;
    this.userRooms.set(userKey, currentCount + 1);

    // Iniciar timer de inatividade
    this.setInactivityTimer(thread.id, options.duration);

    logger.info(`🏠 Nova sala registrada: ${thread.name} (${thread.id})`);
    return roomData;
  }

  /**
   * Define timer de inatividade para uma thread
   */
  setInactivityTimer(threadId, durationMinutes) {
    // Limpar timer existente se houver
    this.clearInactivityTimer(threadId);

    const timeoutMs = durationMinutes * 60 * 1000; // converter para ms

    const timer = setTimeout(async () => {
      await this.closeRoom(threadId, 'Inatividade');
    }, timeoutMs);

    this.timers.set(threadId, timer);
  }

  /**
   * Limpa timer de inatividade
   */
  clearInactivityTimer(threadId) {
    const existingTimer = this.timers.get(threadId);
    if (existingTimer) {
      clearTimeout(existingTimer);
      this.timers.delete(threadId);
    }
  }

  /**
   * Registra atividade em uma thread (reseta timer)
   */
  async recordActivity(threadId, userId = null) {
    const roomData = this.activeRooms.get(threadId);
    if (!roomData) return false;

    // Atualizar último tempo de atividade
    roomData.lastActivity = Date.now();
    
    // Adicionar usuário aos membros se fornecido
    if (userId) {
      roomData.members.add(userId);
    }

    // Reiniciar timer de inatividade
    this.setInactivityTimer(threadId, roomData.duration);

    return true;
  }

  /**
   * Fecha uma sala temporária
   */
  async closeRoom(threadId, reason = 'Manual') {
    const roomData = this.activeRooms.get(threadId);
    if (!roomData) return false;

    try {
      // Buscar thread no Discord
      const guild = this.client.guilds.cache.get(roomData.guildId);
      if (!guild) return false;

      const channel = guild.channels.cache.get(roomData.channelId);
      if (!channel) return false;

      const thread = channel.threads.cache.get(threadId);
      if (!thread) return false;

      // Enviar mensagem de encerramento
      const closingEmbed = {
        color: 0xff6b6b, // Vermelho suave
        title: '🔒 Sala Sendo Encerrada',
        description: `Esta sala temporária será fechada em 30 segundos.`,
        fields: [
          {
            name: '📋 Motivo',
            value: reason,
            inline: true
          },
          {
            name: '⏰ Tempo Ativo',
            value: this.formatDuration(Date.now() - roomData.createdAt),
            inline: true
          }
        ],
        footer: {
          text: 'Obrigado por usar as salas temporárias!'
        }
      };

      await thread.send({ embeds: [closingEmbed] });

      // Aguardar 30 segundos antes de fechar
      setTimeout(async () => {
        try {
          await thread.setArchived(true);
          await thread.delete();
          logger.info(`🗑️ Sala fechada: ${thread.name} (Motivo: ${reason})`);
        } catch (deleteError) {
          logger.error('Erro ao deletar thread:', deleteError.message);
        }
      }, 30000);

    } catch (error) {
      logger.error(`Erro ao fechar sala ${threadId}:`, error.message);
    }

    // Limpar dados internos
    this.clearInactivityTimer(threadId);
    this.activeRooms.delete(threadId);

    // Decrementar contador do usuário
    const userKey = `${roomData.creatorId}-${roomData.guildId}`;
    const currentCount = this.userRooms.get(userKey) || 0;
    if (currentCount > 1) {
      this.userRooms.set(userKey, currentCount - 1);
    } else {
      this.userRooms.delete(userKey);
    }

    return true;
  }

  /**
   * Obtém número de salas ativas de um usuário em um servidor
   */
  getUserActiveRooms(userId, guildId) {
    const userKey = `${userId}-${guildId}`;
    return this.userRooms.get(userKey) || 0;
  }

  /**
   * Lista todas as salas ativas de um servidor
   */
  getGuildActiveRooms(guildId) {
    return Array.from(this.activeRooms.values())
      .filter(room => room.guildId === guildId && room.isActive);
  }

  /**
   * Estende duração de uma sala
   */
  async extendRoom(threadId, additionalMinutes) {
    const roomData = this.activeRooms.get(threadId);
    if (!roomData) return false;

    // Obter config do servidor para verificar limites
    const guildConfig = await configManager.getConfig(roomData.guildId);
    const roomConfig = guildConfig.roomSettings || {};
    const maxDuration = roomConfig.maxTimeout || 480; // 8 horas

    const newDuration = roomData.duration + additionalMinutes;
    
    if (newDuration > maxDuration) {
      return { success: false, reason: `Duração máxima permitida: ${maxDuration} minutos` };
    }

    roomData.duration = newDuration;
    this.setInactivityTimer(threadId, newDuration);

    return { success: true, newDuration };
  }

  /**
   * Adiciona membro a uma sala
   */
  async addMemberToRoom(threadId, userId) {
    const roomData = this.activeRooms.get(threadId);
    if (!roomData) return false;

    try {
      const guild = this.client.guilds.cache.get(roomData.guildId);
      const channel = guild.channels.cache.get(roomData.channelId);
      const thread = channel.threads.cache.get(threadId);

      await thread.members.add(userId);
      roomData.members.add(userId);

      return true;
    } catch (error) {
      logger.error(`Erro ao adicionar membro ${userId} à sala ${threadId}:`, error.message);
      return false;
    }
  }

  /**
   * Recupera threads ativas após restart (opcional)
   */
  async recoverActiveRooms() {
    // Por enquanto não implementado - threads são perdidas no restart
    // Pode ser implementado com persistência no banco de dados se necessário
  }

  /**
   * Formatar duração em formato legível
   */
  formatDuration(ms) {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  }

  /**
   * Estatísticas do sistema
   */
  getStats() {
    return {
      activeRooms: this.activeRooms.size,
      activeTimers: this.timers.size,
      totalUsers: this.userRooms.size,
      isInitialized: this.isInitialized
    };
  }

  /**
   * Limpeza de emergência - fecha todas as salas
   */
  async emergencyCleanup() {
    const roomIds = Array.from(this.activeRooms.keys());
    
    for (const threadId of roomIds) {
      await this.closeRoom(threadId, 'Limpeza de emergência');
    }

    logger.info(`🧹 Limpeza de emergência concluída: ${roomIds.length} salas fechadas`);
  }
}

// Instância global do gerenciador de threads
export const threadManager = new ThreadManager();