// Sistema de monitoramento e prevenção de abusos na economia
// Detecta padrões suspeitos e aplicam limitações automáticas

import { getPrisma } from "../database/client.js";
import { configManager } from "./configManager.js";

export class EconomyAntiAbuse {
  constructor() {
    this.userActions = new Map(); // Cache de ações recentes por usuário
    this.suspiciousUsers = new Map(); // Usuários sob investigação
    this.rateLimits = {
      daily: 1, // 1 por 24h
      work: 1, // 1 por hora
      beg: 2, // 2 por hora
      transfer: 5, // 5 por hora
      commands: 20, // 20 comandos de economia por 10 minutos
    };
    
    // Limpar cache periodicamente
    setInterval(() => this.cleanupCache(), 10 * 60 * 1000); // A cada 10 minutos
  }

  /**
   * Registra uma ação do usuário para monitoramento
   */
  async recordAction(userId, guildId, actionType, amount = 0, metadata = {}) {
    const now = Date.now();
    const key = `${userId}_${guildId}`;
    
    if (!this.userActions.has(key)) {
      this.userActions.set(key, []);
    }
    
    const userActions = this.userActions.get(key);
    userActions.push({
      type: actionType,
      amount,
      timestamp: now,
      metadata,
    });
    
    // Manter apenas últimas 100 ações
    if (userActions.length > 100) {
      userActions.shift();
    }
    
    // Verificar padrões suspeitos
    await this.checkForSuspiciousActivity(userId, guildId, userActions);
  }

  /**
   * Verifica se uma ação é permitida (rate limiting)
   */
  async isActionAllowed(userId, guildId, actionType) {
    const key = `${userId}_${guildId}`;
    const userActions = this.userActions.get(key) || [];
    const now = Date.now();
    
    // Verificar se usuário está suspenso
    if (this.suspiciousUsers.has(userId)) {
      const suspension = this.suspiciousUsers.get(userId);
      if (suspension.until > now) {
        return {
          allowed: false,
          reason: 'SUSPENDED',
          message: `Usuário suspenso por atividade suspeita até ${new Date(suspension.until).toLocaleString('pt-BR')}`,
          until: suspension.until,
        };
      } else {
        // Suspensão expirou
        this.suspiciousUsers.delete(userId);
      }
    }
    
    // Filtrar ações recentes por tipo
    const timeWindows = {
      daily: 24 * 60 * 60 * 1000, // 24 horas
      work: 60 * 60 * 1000, // 1 hora
      beg: 60 * 60 * 1000, // 1 hora
      transfer: 60 * 60 * 1000, // 1 hora
      commands: 10 * 60 * 1000, // 10 minutos
    };
    
    const timeWindow = timeWindows[actionType] || timeWindows.commands;
    const recentActions = userActions.filter(action => 
      action.type === actionType && (now - action.timestamp) < timeWindow
    );
    
    const limit = this.rateLimits[actionType] || this.rateLimits.commands;
    
    if (recentActions.length >= limit) {
      const oldestAction = Math.min(...recentActions.map(a => a.timestamp));
      const nextAllowed = oldestAction + timeWindow;
      
      return {
        allowed: false,
        reason: 'RATE_LIMITED',
        message: `Limite de ${limit} ${actionType} por ${this.formatTimeWindow(timeWindow)} atingido`,
        nextAllowed,
      };
    }
    
    return { allowed: true };
  }

  /**
   * Verifica padrões suspeitos de comportamento
   */
  async checkForSuspiciousActivity(userId, guildId, userActions) {
    const now = Date.now();
    const last24h = userActions.filter(a => (now - a.timestamp) < 24 * 60 * 60 * 1000);
    const last1h = userActions.filter(a => (now - a.timestamp) < 60 * 60 * 1000);
    
    let suspicionScore = 0;
    let reasons = [];
    
    // Padrão 1: Muitas transferências em pouco tempo
    const recentTransfers = last1h.filter(a => a.type === 'transfer');
    if (recentTransfers.length > 10) {
      suspicionScore += 30;
      reasons.push('Muitas transferências em 1 hora');
    }
    
    // Padrão 2: Transferências muito altas consecutivas
    const largeTransfers = recentTransfers.filter(a => a.amount > 50000);
    if (largeTransfers.length > 2) {
      suspicionScore += 40;
      reasons.push('Múltiplas transferências altas');
    }
    
    // Padrão 3: Horários suspeitos (bot/automação)
    const commandTimes = last24h.map(a => new Date(a.timestamp));
    const hourCounts = {};
    commandTimes.forEach(time => {
      const hour = time.getHours();
      hourCounts[hour] = (hourCounts[hour] || 0) + 1;
    });
    
    const maxCommandsPerHour = Math.max(...Object.values(hourCounts));
    if (maxCommandsPerHour > 30) {
      suspicionScore += 25;
      reasons.push('Padrão de horários suspeito (possível bot)');
    }
    
    // Padrão 4: Transferências circulares
    const transferOuts = last24h.filter(a => a.type === 'transfer' && a.amount > 1000);
    const transferIns = last24h.filter(a => a.type === 'transfer_received' && a.amount > 1000);
    
    if (transferOuts.length > 3 && transferIns.length > 3) {
      suspicionScore += 35;
      reasons.push('Possíveis transferências circulares');
    }
    
    // Padrão 5: Uso excessivo de comandos
    if (last24h.length > 100) {
      suspicionScore += 20;
      reasons.push('Uso excessivo de comandos (100+ em 24h)');
    }
    
    // Aplicar ação baseado na pontuação de suspeita
    if (suspicionScore >= 50) {
      const suspensionTime = this.calculateSuspensionTime(suspicionScore);
      await this.suspendUser(userId, guildId, suspensionTime, reasons);
    } else if (suspicionScore >= 30) {
      await this.flagUserForReview(userId, guildId, suspicionScore, reasons);
    }
  }

  /**
   * Suspende temporariamente um usuário
   */
  async suspendUser(userId, guildId, duration, reasons) {
    const until = Date.now() + duration;
    
    this.suspiciousUsers.set(userId, {
      until,
      reasons,
      guildId,
      suspended: true,
    });
    
    // Registrar no banco de dados
    try {
      const prisma = getPrisma();
      await prisma.economyLog.create({
        data: {
          userId,
          guildId,
          action: 'USER_SUSPENDED',
          details: JSON.stringify({ reasons, until }),
          severity: 'HIGH',
        },
      });
    } catch (error) {
      console.error('Erro ao registrar suspensão:', error);
    }
    
    console.warn(`🚫 Usuário ${userId} suspenso por ${this.formatDuration(duration)} - Razões:`, reasons);
  }

  /**
   * Marca usuário para revisão manual
   */
  async flagUserForReview(userId, guildId, score, reasons) {
    try {
      const prisma = getPrisma();
      await prisma.economyLog.create({
        data: {
          userId,
          guildId,
          action: 'USER_FLAGGED',
          details: JSON.stringify({ score, reasons }),
          severity: 'MEDIUM',
        },
      });
    } catch (error) {
      console.error('Erro ao registrar flag:', error);
    }
    
    console.warn(`⚠️ Usuário ${userId} marcado para revisão (Score: ${score}) - Razões:`, reasons);
  }

  /**
   * Calcula tempo de suspensão baseado na pontuação
   */
  calculateSuspensionTime(score) {
    if (score >= 80) return 24 * 60 * 60 * 1000; // 24 horas
    if (score >= 70) return 12 * 60 * 60 * 1000; // 12 horas
    if (score >= 60) return 6 * 60 * 60 * 1000;  // 6 horas
    return 2 * 60 * 60 * 1000; // 2 horas
  }

  /**
   * Obtém estatísticas de segurança para um servidor
   */
  async getSecurityStats(guildId) {
    const prisma = getPrisma();
    const now = new Date();
    const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const last7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    try {
      const [
        suspensions24h,
        flags24h,
        suspensions7d,
        flags7d,
        totalTransactions24h,
        largeTransactions24h,
      ] = await Promise.all([
        prisma.economyLog.count({
          where: {
            guildId,
            action: 'USER_SUSPENDED',
            createdAt: { gte: last24h },
          },
        }),
        prisma.economyLog.count({
          where: {
            guildId,
            action: 'USER_FLAGGED',
            createdAt: { gte: last24h },
          },
        }),
        prisma.economyLog.count({
          where: {
            guildId,
            action: 'USER_SUSPENDED',
            createdAt: { gte: last7d },
          },
        }),
        prisma.economyLog.count({
          where: {
            guildId,
            action: 'USER_FLAGGED',
            createdAt: { gte: last7d },
          },
        }),
        prisma.transaction.count({
          where: {
            createdAt: { gte: last24h },
          },
        }),
        prisma.transaction.count({
          where: {
            amount: { gt: 10000 },
            createdAt: { gte: last24h },
          },
        }),
      ]);
      
      return {
        last24h: {
          suspensions: suspensions24h,
          flags: flags24h,
          totalTransactions: totalTransactions24h,
          largeTransactions: largeTransactions24h,
        },
        last7d: {
          suspensions: suspensions7d,
          flags: flags7d,
        },
        activeSuspensions: this.suspiciousUsers.size,
      };
    } catch (error) {
      console.error('Erro ao obter estatísticas de segurança:', error);
      return null;
    }
  }

  /**
   * Remove dados antigos do cache
   */
  cleanupCache() {
    const now = Date.now();
    const maxAge = 24 * 60 * 60 * 1000; // 24 horas
    
    // Limpar ações antigas
    for (const [key, actions] of this.userActions.entries()) {
      const recentActions = actions.filter(action => (now - action.timestamp) < maxAge);
      if (recentActions.length === 0) {
        this.userActions.delete(key);
      } else {
        this.userActions.set(key, recentActions);
      }
    }
    
    // Limpar suspensões expiradas
    for (const [userId, suspension] of this.suspiciousUsers.entries()) {
      if (suspension.until <= now) {
        this.suspiciousUsers.delete(userId);
      }
    }
  }

  /**
   * Formata uma janela de tempo em string legível
   */
  formatTimeWindow(ms) {
    const hours = ms / (60 * 60 * 1000);
    const minutes = ms / (60 * 1000);
    
    if (hours >= 1) return `${hours}h`;
    return `${minutes}m`;
  }

  /**
   * Formata duração em string legível
   */
  formatDuration(ms) {
    const hours = Math.floor(ms / (60 * 60 * 1000));
    const minutes = Math.floor((ms % (60 * 60 * 1000)) / (60 * 1000));
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  }
}

// Instância global do sistema anti-abuso
export const economyAntiAbuse = new EconomyAntiAbuse();