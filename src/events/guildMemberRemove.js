/**
 * 👋 Event: Guild Member Remove
 * Processar saída de membros do servidor (para sistema de convites)
 */

import { logger } from "../utils/logger.js";
import { inviteSystem } from "../utils/inviteSystem.js";
import { prisma } from "../database/client.js";

export default async (client, member) => {
  try {
    const guildId = member.guild.id;
    const userId = member.id;
    
    // Verificar se o sistema de convites está habilitado
    const config = await inviteSystem.getInviteConfig(guildId);
    if (!config?.enabled) {
      return;
    }
    
    // Marcar quando o membro saiu (para controle de tempo mínimo)
    await prisma.inviteUse.updateMany({
      where: {
        guildId,
        inviteeId: userId,
        leftAt: null
      },
      data: {
        leftAt: new Date()
      }
    });
    
    // Verificar se o membro saiu muito rápido (possível fraude)
    const recentInviteUse = await prisma.inviteUse.findFirst({
      where: {
        guildId,
        inviteeId: userId,
        isValid: true,
        rewardGiven: true
      },
      orderBy: {
        joinedAt: 'desc'
      }
    });
    
    if (recentInviteUse) {
      const stayTime = Date.now() - recentInviteUse.joinedAt.getTime();
      const minStayTime = (config.minStayTime || 24) * 60 * 60 * 1000; // horas em ms
      
      // Se saiu antes do tempo mínimo, marcar como suspeito
      if (stayTime < minStayTime) {
        await prisma.inviteUse.update({
          where: { id: recentInviteUse.id },
          data: {
            fraudReason: `Saiu após ${Math.round(stayTime / (60 * 60 * 1000))}h (mínimo: ${config.minStayTime}h)`
          }
        });
        
        logger.warn(`🚨 Possível fraude: ${member.user.username} saiu após ${Math.round(stayTime / (60 * 60 * 1000))}h`);
        
        // Opcional: Remover recompensa se configurado para isso
        // (implementar se necessário)
      }
    }
    
    logger.info(`👋 Membro saiu: ${member.user.username} - tempo rastreado`);
    
  } catch (error) {
    logger.error(`❌ Erro ao processar saída de membro: ${error.message}`);
  }
};