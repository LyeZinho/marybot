/**
 * 🎯 Sistema de Convites/Afiliados
 * Gerencia convites, recompensas e prevenção de fraudes
 */

import { logger } from './logger.js';
import { prisma } from '../database/client.js';

class InviteSystem {
  constructor() {
    this.inviteCache = new Map(); // Cache dos convites ativos
    this.fraudScores = new Map(); // Scores de fraude por usuário
    this.dailyRewards = new Map(); // Controle de recompensas diárias
    
    logger.info('🎯 Sistema de Convites inicializado');
  }

  /**
   * 📊 Sincronizar convites do Discord com o banco
   */
  async syncInvites(guild) {
    try {
      const discordInvites = await guild.invites.fetch();
      const guildId = guild.id;
      
      // Buscar convites existentes no banco
      const dbInvites = await prisma.invite.findMany({
        where: { guildId },
        include: { inviteUses: true }
      });
      
      const dbInviteMap = new Map(dbInvites.map(inv => [inv.code, inv]));
      
      // Processar convites do Discord
      for (const [code, discordInvite] of discordInvites) {
        const inviter = discordInvite.inviter;
        if (!inviter || inviter.bot) continue;
        
        const dbInvite = dbInviteMap.get(code);
        
        if (dbInvite) {
          // Atualizar convite existente se houver mudanças nos usos
          if (dbInvite.uses !== discordInvite.uses) {
            await this.updateInviteUses(dbInvite, discordInvite, guild);
          }
        } else {
          // Criar novo convite no banco
          await this.createInvite(discordInvite, guild);
        }
      }
      
      // Marcar como inativos convites que não existem mais no Discord
      const discordCodes = new Set(discordInvites.keys());
      for (const dbInvite of dbInvites) {
        if (!discordCodes.has(dbInvite.code) && dbInvite.isActive) {
          await prisma.invite.update({
            where: { id: dbInvite.id },
            data: { isActive: false }
          });
        }
      }
      
      logger.success(`🎯 Sincronizados ${discordInvites.size} convites para ${guild.name}`);
      
    } catch (error) {
      logger.error('❌ Erro ao sincronizar convites:', error.message);
    }
  }

  /**
   * ➕ Criar novo convite no banco
   */
  async createInvite(discordInvite, guild) {
    try {
      const inviter = discordInvite.inviter;
      
      // Garantir que o usuário existe no banco
      await this.ensureUserExists(inviter);
      
      const inviteData = {
        code: discordInvite.code,
        guildId: guild.id,
        inviterId: inviter.id,
        channelId: discordInvite.channel?.id,
        uses: discordInvite.uses || 0,
        maxUses: discordInvite.maxUses || 0,
        temporary: discordInvite.temporary || false,
        maxAge: discordInvite.maxAge || 0,
        expiresAt: discordInvite.expiresAt,
        isActive: true
      };
      
      await prisma.invite.create({ data: inviteData });
      
      logger.info(`📨 Novo convite criado: ${discordInvite.code} por ${inviter.username}`);
      
    } catch (error) {
      logger.error('❌ Erro ao criar convite:', error.message);
    }
  }

  /**
   * 🔄 Atualizar usos de convite
   */
  async updateInviteUses(dbInvite, discordInvite, guild) {
    try {
      const newUses = discordInvite.uses;
      const oldUses = dbInvite.uses;
      const useDifference = newUses - oldUses;
      
      if (useDifference <= 0) return;
      
      // Atualizar contagem de usos
      await prisma.invite.update({
        where: { id: dbInvite.id },
        data: { uses: newUses }
      });
      
      logger.info(`📈 Convite ${dbInvite.code}: ${oldUses} → ${newUses} usos (+${useDifference})`);
      
    } catch (error) {
      logger.error('❌ Erro ao atualizar usos do convite:', error.message);
    }
  }

  /**
   * 🎉 Processar entrada de novo membro
   */
  async handleMemberJoin(member, guild) {
    try {
      const guildId = guild.id;
      const config = await this.getInviteConfig(guildId);
      
      if (!config?.enabled) return;
      
      // Sincronizar convites primeiro
      await this.syncInvites(guild);
      
      // Buscar qual convite foi usado
      const usedInvite = await this.findUsedInvite(guild);
      
      if (!usedInvite) {
        logger.warn(`⚠️ Não foi possível identificar o convite usado por ${member.user.username}`);
        return;
      }
      
      // Registrar o uso do convite
      const inviteUse = await this.recordInviteUse(usedInvite, member, guild, config);
      
      // Verificar se deve dar recompensa
      if (inviteUse && inviteUse.isValid) {
        await this.processReward(usedInvite, member, config);
      }
      
    } catch (error) {
      logger.error('❌ Erro ao processar entrada de membro:', error.message);
    }
  }

  /**
   * 🔍 Encontrar qual convite foi usado
   */
  async findUsedInvite(guild) {
    try {
      const currentInvites = await guild.invites.fetch();
      const dbInvites = await prisma.invite.findMany({
        where: { guildId: guild.id, isActive: true }
      });
      
      for (const dbInvite of dbInvites) {
        const currentInvite = currentInvites.get(dbInvite.code);
        
        if (!currentInvite) {
          // Convite foi deletado ou expirou - pode ter sido usado
          continue;
        }
        
        if (currentInvite.uses > dbInvite.uses) {
          return {
            ...dbInvite,
            currentUses: currentInvite.uses,
            inviter: currentInvite.inviter
          };
        }
      }
      
      return null;
      
    } catch (error) {
      logger.error('❌ Erro ao encontrar convite usado:', error.message);
      return null;
    }
  }

  /**
   * 📝 Registrar uso de convite
   */
  async recordInviteUse(usedInvite, member, guild, config) {
    try {
      const isValid = await this.validateInviteUse(member, config);
      
      const inviteUse = await prisma.inviteUse.create({
        data: {
          inviteCode: usedInvite.code,
          guildId: guild.id,
          inviterId: usedInvite.inviterId,
          inviteeId: member.id,
          joinedAt: new Date(),
          isValid,
          rewardGiven: false,
          rewardAmount: 0,
          fraudReason: isValid ? null : 'Conta muito nova ou suspeita'
        }
      });
      
      logger.info(`📝 Uso registrado: ${member.user.username} via ${usedInvite.code} (Válido: ${isValid})`);
      return inviteUse;
      
    } catch (error) {
      logger.error('❌ Erro ao registrar uso de convite:', error.message);
      return null;
    }
  }

  /**
   * ✅ Validar se o uso do convite é legítimo
   */
  async validateInviteUse(member, config) {
    try {
      const user = member.user;
      
      // Verificar idade da conta
      const accountAge = Date.now() - user.createdTimestamp;
      const minAge = (config.minAccountAge || 7) * 24 * 60 * 60 * 1000; // Dias em ms
      
      if (accountAge < minAge) {
        logger.warn(`⚠️ Conta muito nova: ${user.username} (${Math.floor(accountAge / (24 * 60 * 60 * 1000))} dias)`);
        return false;
      }
      
      // Verificar se é bot
      if (user.bot) {
        return false;
      }
      
      // Verificar score de fraude
      const fraudScore = this.calculateFraudScore(user, member);
      if (fraudScore > 0.7) {
        logger.warn(`⚠️ Score de fraude alto para ${user.username}: ${fraudScore}`);
        return false;
      }
      
      return true;
      
    } catch (error) {
      logger.error('❌ Erro ao validar uso de convite:', error.message);
      return false;
    }
  }

  /**
   * 🔢 Calcular score de fraude (0-1, quanto maior mais suspeito)
   */
  calculateFraudScore(user, member) {
    let score = 0;
    
    // Fatores suspeitos
    const accountAge = Date.now() - user.createdTimestamp;
    const daysSinceCreation = accountAge / (24 * 60 * 60 * 1000);
    
    // Conta muito nova (0-3 dias = +0.4, 3-7 dias = +0.2)
    if (daysSinceCreation < 3) score += 0.4;
    else if (daysSinceCreation < 7) score += 0.2;
    
    // Nome suspeito (muitos números ou caracteres estranhos)
    const username = user.username.toLowerCase();
    const numberRatio = (username.match(/\d/g) || []).length / username.length;
    if (numberRatio > 0.5) score += 0.2;
    
    // Avatar padrão
    if (!user.avatar) score += 0.1;
    
    // Username muito curto ou muito longo
    if (username.length < 3 || username.length > 20) score += 0.1;
    
    return Math.min(score, 1); // Máximo 1.0
  }

  /**
   * 💰 Processar recompensa por convite
   */
  async processReward(usedInvite, member, config) {
    try {
      const inviterId = usedInvite.inviterId;
      const rewardAmount = config.rewardPerInvite || 100;
      
      // Verificar limite diário
      const today = new Date().toDateString();
      const dailyKey = `${inviterId}-${today}`;
      const dailyRewards = this.dailyRewards.get(dailyKey) || 0;
      
      if (dailyRewards >= (config.maxRewardPerDay || 1000)) {
        logger.warn(`⚠️ Limite diário de recompensas atingido para ${inviterId}`);
        return;
      }
      
      // Garantir que o convidador existe no banco
      const inviter = await this.ensureUserExists({ id: inviterId });
      
      // Dar a recompensa
      await prisma.user.update({
        where: { discordId: inviterId },
        data: {
          coins: {
            increment: rewardAmount
          }
        }
      });
      
      // Registrar transação
      await prisma.transaction.create({
        data: {
          userId: inviter.id,
          type: 'INVITE_REWARD',
          amount: rewardAmount,
          reason: `Recompensa por convite: ${member.user.username}`
        }
      });
      
      // Atualizar registro do uso
      await prisma.inviteUse.updateMany({
        where: {
          inviteCode: usedInvite.code,
          inviteeId: member.id
        },
        data: {
          rewardGiven: true,
          rewardAmount
        }
      });
      
      // Atualizar cache diário
      this.dailyRewards.set(dailyKey, dailyRewards + rewardAmount);
      
      // Verificar bônus por marcos
      await this.checkMilestoneBonus(inviterId, config);
      
      logger.success(`💰 Recompensa dada: ${rewardAmount} coins para ${inviterId} por convidar ${member.user.username}`);
      
    } catch (error) {
      logger.error('❌ Erro ao processar recompensa:', error.message);
    }
  }

  /**
   * 🏆 Verificar e dar bônus por marcos de convites
   */
  async checkMilestoneBonus(inviterId, config) {
    try {
      if (!config.bonusThresholds) return;
      
      const thresholds = JSON.parse(config.bonusThresholds);
      
      // Contar convites válidos totais
      const totalInvites = await prisma.inviteUse.count({
        where: {
          inviterId,
          isValid: true,
          rewardGiven: true
        }
      });
      
      // Verificar se atingiu algum marco
      for (const [threshold, bonus] of Object.entries(thresholds)) {
        const thresholdNum = parseInt(threshold);
        
        if (totalInvites === thresholdNum) {
          // Dar bônus de marco
          await prisma.user.update({
            where: { discordId: inviterId },
            data: {
              coins: {
                increment: bonus
              }
            }
          });
          
          // Registrar transação
          const user = await prisma.user.findUnique({
            where: { discordId: inviterId }
          });
          
          await prisma.transaction.create({
            data: {
              userId: user.id,
              type: 'MILESTONE_BONUS',
              amount: bonus,
              reason: `Bônus por ${threshold} convites válidos`
            }
          });
          
          logger.success(`🏆 Bônus de marco: ${bonus} coins para ${inviterId} (${threshold} convites)`);
          break;
        }
      }
      
    } catch (error) {
      logger.error('❌ Erro ao verificar bônus de marco:', error.message);
    }
  }

  /**
   * ⚙️ Obter configuração de convites do servidor
   */
  async getInviteConfig(guildId) {
    try {
      return await prisma.inviteConfig.findUnique({
        where: { guildId }
      });
    } catch (error) {
      logger.error('❌ Erro ao obter config de convites:', error.message);
      return null;
    }
  }

  /**
   * 📊 Obter estatísticas de convites de um usuário
   */
  async getUserInviteStats(userId, guildId) {
    try {
      const stats = await prisma.inviteUse.aggregate({
        where: {
          inviterId: userId,
          guildId,
          isValid: true,
          rewardGiven: true
        },
        _count: { _all: true },
        _sum: { rewardAmount: true }
      });
      
      const totalInvites = stats._count._all || 0;
      const totalEarned = stats._sum.rewardAmount || 0;
      
      // Buscar convites ainda ativos
      const activeInvites = await prisma.invite.count({
        where: {
          inviterId: userId,
          guildId,
          isActive: true
        }
      });
      
      return {
        totalValidInvites: totalInvites,
        totalEarned,
        activeInvites,
        averagePerInvite: totalInvites > 0 ? Math.round(totalEarned / totalInvites) : 0
      };
      
    } catch (error) {
      logger.error('❌ Erro ao obter stats de convites:', error.message);
      return {
        totalValidInvites: 0,
        totalEarned: 0,
        activeInvites: 0,
        averagePerInvite: 0
      };
    }
  }

  /**
   * 👤 Garantir que usuário existe no banco
   */
  async ensureUserExists(user) {
    try {
      return await prisma.user.upsert({
        where: { discordId: user.id },
        update: { username: user.username || user.displayName },
        create: {
          discordId: user.id,
          username: user.username || user.displayName || 'Unknown',
          coins: 0
        }
      });
    } catch (error) {
      logger.error('❌ Erro ao garantir usuário:', error.message);
      return null;
    }
  }

  /**
   * 🧹 Limpar dados antigos (executar diariamente)
   */
  async cleanup() {
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      // Limpar cache de recompensas diárias antigas
      const today = new Date().toDateString();
      for (const [key] of this.dailyRewards) {
        if (!key.endsWith(today)) {
          this.dailyRewards.delete(key);
        }
      }
      
      logger.info('🧹 Limpeza de dados de convites concluída');
      
    } catch (error) {
      logger.error('❌ Erro na limpeza de dados:', error.message);
    }
  }
}

// Instância singleton
const inviteSystem = new InviteSystem();

export { inviteSystem, InviteSystem };
export default inviteSystem;