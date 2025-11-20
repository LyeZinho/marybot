/**
 * 🎯 Comando Admin: Configurar Sistema de Convites
 * Permite configurar o sistema de recompensas por convites
 */

import { EmbedBuilder } from 'discord.js';
import { inviteSystem } from '../../utils/inviteSystem.js';
import { createEmbed, createSuccessEmbed, createErrorEmbed, createWarningEmbed } from '../../utils/embeds.js';
import { logger } from '../../utils/logger.js';
import { prisma } from '../../database/client.js';

// Comando tradicional com prefix
export default {
  name: 'invite-config',
  aliases: ['convite-config', 'invite-settings'],
  description: '🎯 Configurar sistema de convites (Admin)',
  category: 'admin',
  usage: 'invite-config [toggle|reward|limits|bonus|logs|view|stats|audit] [argumentos]',
  cooldown: 5000,
  permissions: ['Administrator'],
  
  async execute(client, message, args) {
    try {
      // Verificar permissões
      if (!message.member.permissions.has('Administrator')) {
        const embed = createErrorEmbed('Acesso Negado', 'Você precisa ter permissão de **Administrador** para usar este comando.');
        return await message.reply({ embeds: [embed] });
      }

      const guildId = message.guild.id;
      const subcommand = args[0]?.toLowerCase();

      if (!subcommand) {
        return await this.showHelp(message);
      }

      switch (subcommand) {
        case 'toggle':
        case 'ativar':
        case 'desativar':
          await handleToggle(message, args.slice(1), guildId);
          break;
        case 'reward':
        case 'recompensa':
          await handleReward(message, args.slice(1), guildId);
          break;
        case 'limits':
        case 'limites':
          await handleLimits(message, args.slice(1), guildId);
          break;
        case 'bonus':
        case 'marcos':
          await handleBonus(message, args.slice(1), guildId);
          break;
        case 'logs':
        case 'canal':
          await handleLogs(message, args.slice(1), guildId);
          break;
        case 'view':
        case 'ver':
        case 'status':
          await handleView(message, guildId);
          break;
        case 'stats':
        case 'estatisticas':
          await handleStats(message, guildId);
          break;
        case 'audit':
        case 'auditoria':
          await handleAudit(message, args.slice(1), guildId);
          break;
        case 'help':
        case 'ajuda':
          await this.showHelp(message);
          break;
        default:
          await this.showHelp(message);
          break;
      }

    } catch (error) {
      logger.error('❌ Erro no comando invite-config:', error);
      const errorEmbed = createEmbed('❌ Erro interno do sistema.', 'error');
      await message.reply({ embeds: [errorEmbed] });
    }
  },

  async showHelp(message) {
    const embed = {
      color: 0x5865f2,
      title: '🎯 Sistema de Convites - Configuração',
      description: 'Configure o sistema de recompensas por convites do servidor.',
      fields: [
        {
          name: '🔄 Ativar/Desativar',
          value: '`invite-config toggle <true|false>` - Ativa ou desativa o sistema',
          inline: false
        },
        {
          name: '💰 Recompensa',
          value: '`invite-config reward <valor>` - Define coins por convite (1-10000)',
          inline: false
        },
        {
          name: '⏰ Limites de Segurança',
          value: '`invite-config limits <idade> <tempo> <diario>` - Configura limites\n' +
                 '• Idade mínima da conta (dias)\n' +
                 '• Tempo mínimo no servidor (horas)\n' +
                 '• Limite diário de coins por usuário',
          inline: false
        },
        {
          name: '🏆 Bônus por Marcos',
          value: '`invite-config bonus <json>` - Define bônus por número de convites\n' +
                 'Exemplo: `{"10": 500, "25": 1000, "50": 2500}`',
          inline: false
        },
        {
          name: '📋 Canal de Logs',
          value: '`invite-config logs <#canal>` - Define canal de logs\n' +
                 '`invite-config logs remove` - Remove canal de logs',
          inline: false
        },
        {
          name: '📊 Informações',
          value: '`invite-config view` - Ver configurações atuais\n' +
                 '`invite-config stats` - Estatísticas do servidor\n' +
                 '`invite-config audit [@user]` - Auditoria de convites suspeitos',
          inline: false
        }
      ],
      footer: {
        text: 'Requer permissão de Administrador'
      }
    };

    await message.reply({ embeds: [embed] });
  }
};

/**
 * 🔄 Ativar/Desativar sistema
 */
async function handleToggle(message, args, guildId) {
  if (args.length === 0) {
    return await message.reply({
      embeds: [createEmbed('❌ Especifique `true` para ativar ou `false` para desativar.\nExemplo: `m.invite-config toggle true`', 'error')]
    });
  }

  const input = args[0].toLowerCase();
  let enabled;

  if (input === 'true' || input === 'on' || input === 'ativar' || input === '1') {
    enabled = true;
  } else if (input === 'false' || input === 'off' || input === 'desativar' || input === '0') {
    enabled = false;
  } else {
    return await message.reply({
      embeds: [createEmbed('❌ Valor inválido. Use `true` ou `false`.', 'error')]
    });
  }
  
  try {
    await prisma.inviteConfig.upsert({
      where: { guildId },
      update: { enabled },
      create: {
        guildId,
        enabled
      }
    });
    
    // Sincronizar convites se ativado
    if (enabled) {
      await inviteSystem.syncInvites(message.guild);
    }
    
    const status = enabled ? 'ativado' : 'desativado';
    const color = enabled ? 0x00ff00 : 0xffcc00;

    await message.reply({
      embeds: [createEmbed(`✅ Sistema de convites ${status} com sucesso!`, color)]
    });
    
  } catch (error) {
    logger.error('❌ Erro ao alterar status:', error);
    await message.reply({
      embeds: [createEmbed('❌ Erro ao alterar configuração.', 'error')]
    });
  }
}

/**
 * 💰 Configurar recompensa
 */
async function handleReward(message, args, guildId) {
  if (args.length === 0) {
    return await message.reply({
      embeds: [createEmbed('❌ Especifique o valor da recompensa.\nExemplo: `m.invite-config reward 100`', 'error')]
    });
  }

  const reward = parseInt(args[0]);
  
  if (isNaN(reward) || reward < 1 || reward > 10000) {
    return await message.reply({
      embeds: [createEmbed('❌ O valor deve ser um número entre 1 e 10000.', 'error')]
    });
  }
  
  try {
    await prisma.inviteConfig.upsert({
      where: { guildId },
      update: { rewardPerInvite: reward },
      create: {
        guildId,
        rewardPerInvite: reward
      }
    });
    
    await message.reply({
      embeds: [createEmbed(`💰 Recompensa por convite alterada para **${reward} coins**!`, 'success')]
    });
    
  } catch (error) {
    logger.error('❌ Erro ao configurar recompensa:', error);
    await message.reply({
      embeds: [createEmbed('❌ Erro ao configurar recompensa.', 'error')]
    });
  }
}

/**
 * ⏰ Configurar limites
 */
async function handleLimits(message, args, guildId) {
  if (args.length === 0) {
    return await message.reply({
      embeds: [createEmbed('❌ Especifique os limites.\nExemplo: `m.invite-config limits 7 24 1000`\n(idade mínima em dias, tempo mínimo em horas, limite diário)', 'error')]
    });
  }

  const minAge = args[0] ? parseInt(args[0]) : null;
  const minStay = args[1] ? parseInt(args[1]) : null;
  const dailyLimit = args[2] ? parseInt(args[2]) : null;
  
  if (minAge !== null && (isNaN(minAge) || minAge < 0 || minAge > 365)) {
    return await message.reply({
      embeds: [createEmbed('❌ Idade mínima deve ser entre 0 e 365 dias.', 'error')]
    });
  }

  if (minStay !== null && (isNaN(minStay) || minStay < 0 || minStay > 720)) {
    return await message.reply({
      embeds: [createEmbed('❌ Tempo mínimo deve ser entre 0 e 720 horas.', 'error')]
    });
  }

  if (dailyLimit !== null && (isNaN(dailyLimit) || dailyLimit < 100 || dailyLimit > 50000)) {
    return await message.reply({
      embeds: [createEmbed('❌ Limite diário deve ser entre 100 e 50000 coins.', 'error')]
    });
  }
  
  try {
    const updateData = {};
    if (minAge !== null) updateData.minAccountAge = minAge;
    if (minStay !== null) updateData.minStayTime = minStay;
    if (dailyLimit !== null) updateData.maxRewardPerDay = dailyLimit;
    
    await prisma.inviteConfig.upsert({
      where: { guildId },
      update: updateData,
      create: {
        guildId,
        ...updateData
      }
    });
    
    let responseMessage = '⏰ Limites atualizados:\n';
    if (minAge !== null) responseMessage += `• Idade mínima: **${minAge} dias**\n`;
    if (minStay !== null) responseMessage += `• Tempo mínimo: **${minStay} horas**\n`;
    if (dailyLimit !== null) responseMessage += `• Limite diário: **${dailyLimit} coins**\n`;
    
    await message.reply({
      embeds: [createEmbed(responseMessage, 'success')]
    });
    
  } catch (error) {
    logger.error('❌ Erro ao configurar limites:', error);
    await message.reply({
      embeds: [createEmbed('❌ Erro ao configurar limites.', 'error')]
    });
  }
}

/**
 * 🏆 Configurar bônus
 */
async function handleBonus(message, args, guildId) {
  if (args.length === 0) {
    // Remover bônus
    try {
      await prisma.inviteConfig.upsert({
        where: { guildId },
        update: { bonusThresholds: null },
        create: {
          guildId,
          bonusThresholds: null
        }
      });

      await message.reply({
        embeds: [createEmbed(`🏆 Bônus por marcos removidos.`, 0xffcc00)]
      });
    } catch (error) {
      logger.error('❌ Erro ao remover bônus:', error);
      await message.reply({
        embeds: [createEmbed('❌ Erro ao configurar bônus.', 'error')]
      });
    }
    return;
  }

  const bonusJson = args.join(' ');
  
  try {
    // Validar JSON
    const bonusObj = JSON.parse(bonusJson);
    
    // Validar estrutura
    for (const [key, value] of Object.entries(bonusObj)) {
      const threshold = parseInt(key);
      const bonus = parseInt(value);
      
      if (isNaN(threshold) || isNaN(bonus) || threshold <= 0 || bonus <= 0) {
        throw new Error('Formato inválido. Use números positivos.');
      }
    }
    
    await prisma.inviteConfig.upsert({
      where: { guildId },
      update: { bonusThresholds: bonusJson },
      create: {
        guildId,
        bonusThresholds: bonusJson
      }
    });
    
    await message.reply({
      embeds: [createEmbed(`🏆 Bônus por marcos configurados com sucesso!`, 'success')]
    });
    
  } catch (error) {
    logger.error('❌ Erro ao configurar bônus:', error);
    
    if (error.message.includes('JSON') || error.name === 'SyntaxError') {
      await message.reply({
        embeds: [createEmbed('❌ Formato JSON inválido. Exemplo: `{"10": 500, "25": 1000, "50": 2500}`', 'error')]
      });
    } else {
      await message.reply({
        embeds: [createEmbed(`❌ Erro: ${error.message}`, 'error')]
      });
    }
  }
}

/**
 * 📋 Configurar logs
 */
async function handleLogs(message, args, guildId) {
  if (args.length === 0) {
    return await message.reply({
      embeds: [createEmbed('❌ Especifique um canal ou `remove` para remover.\nExemplo: `m.invite-config logs #invite-logs`', 'error')]
    });
  }

  if (args[0].toLowerCase() === 'remove' || args[0].toLowerCase() === 'remover') {
    try {
      await prisma.inviteConfig.upsert({
        where: { guildId },
        update: { logChannelId: null },
        create: {
          guildId,
          logChannelId: null
        }
      });
      
      await message.reply({
        embeds: [createEmbed(`📋 Canal de logs removido.`, 0xffcc00)]
      });
    } catch (error) {
      logger.error('❌ Erro ao remover canal de logs:', error);
      await message.reply({
        embeds: [createEmbed('❌ Erro ao configurar canal de logs.', 'error')]
      });
    }
    return;
  }

  const channel = message.mentions.channels.first() || 
                  message.guild.channels.cache.get(args[0].replace(/[<#>]/g, ''));
  
  if (!channel || channel.type !== 0) { // 0 = GUILD_TEXT
    return await message.reply({
      embeds: [createEmbed('❌ Canal inválido. Mencione um canal de texto válido.', 'error')]
    });
  }
  
  try {
    await prisma.inviteConfig.upsert({
      where: { guildId },
      update: { logChannelId: channel.id },
      create: {
        guildId,
        logChannelId: channel.id
      }
    });
    
    await message.reply({
      embeds: [createEmbed(`📋 Canal de logs configurado: ${channel}`, 'success')]
    });
    
  } catch (error) {
    logger.error('❌ Erro ao configurar logs:', error);
    await message.reply({
      embeds: [createEmbed('❌ Erro ao configurar canal de logs.', 'error')]
    });
  }
}

/**
 * 👀 Ver configurações
 */
async function handleView(message, guildId) {
  try {
    const config = await prisma.inviteConfig.findUnique({
      where: { guildId }
    });
    
    if (!config) {
      return await message.reply({
        embeds: [createEmbed('⚙️ Sistema de convites não foi configurado ainda.\nUse `m.invite-config toggle true` para ativar.', 'info')]
      });
    }
    
    const embed = new EmbedBuilder()
      .setTitle('⚙️ Configurações de Convites')
      .setColor(config.enabled ? '#00ff00' : '#ff0000')
      .addFields([
        {
          name: '🔄 Status',
          value: config.enabled ? '✅ Ativado' : '❌ Desativado',
          inline: true
        },
        {
          name: '💰 Recompensa por Convite',
          value: `${config.rewardPerInvite} coins`,
          inline: true
        },
        {
          name: '⏰ Limite Diário',
          value: `${config.maxRewardPerDay} coins`,
          inline: true
        },
        {
          name: '📅 Idade Mínima da Conta',
          value: `${config.minAccountAge} dias`,
          inline: true
        },
        {
          name: '🕐 Tempo Mínimo no Servidor',
          value: `${config.minStayTime} horas`,
          inline: true
        },
        {
          name: '🛡️ Detecção de Fraudes',
          value: config.fraudDetection ? '✅ Ativada' : '❌ Desativada',
          inline: true
        }
      ]);
    
    // Canal de logs
    if (config.logChannelId) {
      try {
        const channel = await message.guild.channels.fetch(config.logChannelId);
        embed.addFields([{
          name: '📋 Canal de Logs',
          value: `${channel}`,
          inline: true
        }]);
      } catch (error) {
        embed.addFields([{
          name: '📋 Canal de Logs',
          value: '❌ Canal não encontrado',
          inline: true
        }]);
      }
    }
    
    // Bônus por marcos
    if (config.bonusThresholds) {
      try {
        const bonuses = JSON.parse(config.bonusThresholds);
        let bonusText = '';
        
        for (const [threshold, bonus] of Object.entries(bonuses)) {
          bonusText += `${threshold} convites → +${bonus} coins\n`;
        }
        
        embed.addFields([{
          name: '🏆 Bônus por Marcos',
          value: bonusText || 'Nenhum configurado',
          inline: false
        }]);
      } catch (error) {
        embed.addFields([{
          name: '🏆 Bônus por Marcos',
          value: 'Erro ao carregar',
          inline: false
        }]);
      }
    }
    
    embed.setTimestamp();
    await message.reply({ embeds: [embed] });
    
  } catch (error) {
    logger.error('❌ Erro ao mostrar configurações:', error);
    await message.reply({
      embeds: [createEmbed('❌ Erro ao carregar configurações.', 'error')]
    });
  }
}

/**
 * 📊 Estatísticas do servidor
 */
async function handleStats(message, guildId) {
  try {
    // Buscar estatísticas gerais
    const [totalInvites, validInvites, totalRewards, activeInviters] = await Promise.all([
      prisma.inviteUse.count({ where: { guildId } }),
      prisma.inviteUse.count({ where: { guildId, isValid: true } }),
      prisma.inviteUse.aggregate({
        where: { guildId, rewardGiven: true },
        _sum: { rewardAmount: true }
      }),
      prisma.inviteUse.groupBy({
        by: ['inviterId'],
        where: { guildId, isValid: true },
        _count: { _all: true }
      }).then(result => result.length)
    ]);
    
    // Top 3 convidadores
    const topInviters = await prisma.inviteUse.groupBy({
      by: ['inviterId'],
      where: { guildId, isValid: true },
      _count: { _all: true },
      _sum: { rewardAmount: true },
      orderBy: { _count: { _all: 'desc' } },
      take: 3
    });
    
    const embed = new EmbedBuilder()
      .setTitle('📊 Estatísticas de Convites')
      .setColor('#5865f2')
      .setThumbnail(message.guild.iconURL({ dynamic: true }))
      .addFields([
        {
          name: '👥 Total de Entradas',
          value: totalInvites.toString(),
          inline: true
        },
        {
          name: '✅ Convites Válidos',
          value: validInvites.toString(),
          inline: true
        },
        {
          name: '💰 Coins Distribuídos',
          value: (totalRewards._sum.rewardAmount || 0).toLocaleString(),
          inline: true
        },
        {
          name: '🎯 Convidadores Ativos',
          value: activeInviters.toString(),
          inline: true
        },
        {
          name: '📈 Taxa de Sucesso',
          value: totalInvites > 0 ? `${Math.round((validInvites / totalInvites) * 100)}%` : '0%',
          inline: true
        },
        {
          name: '💵 Média por Convite',
          value: validInvites > 0 ? Math.round((totalRewards._sum.rewardAmount || 0) / validInvites).toString() : '0',
          inline: true
        }
      ]);
    
    // Adicionar top 3
    if (topInviters.length > 0) {
      let topText = '';
      const medals = ['🥇', '🥈', '🥉'];
      
      for (let i = 0; i < topInviters.length; i++) {
        const inviter = topInviters[i];
        try {
          const user = await message.client.users.fetch(inviter.inviterId);
          topText += `${medals[i]} ${user.username}: ${inviter._count._all} convites\n`;
        } catch (error) {
          topText += `${medals[i]} Usuário desconhecido: ${inviter._count._all} convites\n`;
        }
      }
      
      embed.addFields([{
        name: '🏆 Top Convidadores',
        value: topText,
        inline: false
      }]);
    }
    
    embed.setTimestamp();
    await message.reply({ embeds: [embed] });
    
  } catch (error) {
    logger.error('❌ Erro ao mostrar estatísticas:', error);
    await message.reply({
      embeds: [createEmbed('❌ Erro ao carregar estatísticas.', 'error')]
    });
  }
}

/**
 * 🔍 Auditoria
 */
async function handleAudit(message, args, guildId) {
  try {
    let user = null;
    
    if (args.length > 0) {
      user = message.mentions.users.first() || 
             await message.client.users.fetch(args[0].replace(/[<@!>]/g, '')).catch(() => null);
    }
    
    let whereClause = { guildId };
    if (user) {
      whereClause.inviterId = user.id;
    }
    
    // Buscar convites suspeitos
    const suspiciousInvites = await prisma.inviteUse.findMany({
      where: {
        ...whereClause,
        OR: [
          { isValid: false },
          { fraudReason: { not: null } }
        ]
      },
      include: {
        invite: true
      },
      orderBy: { joinedAt: 'desc' },
      take: 20
    });
    
    if (suspiciousInvites.length === 0) {
      return await message.reply({
        embeds: [createEmbed('✅ Nenhum convite suspeito encontrado!', 'success')]
      });
    }
    
    const embed = new EmbedBuilder()
      .setTitle('🔍 Auditoria de Convites Suspeitos')
      .setColor('#ff9900')
      .setDescription(`Encontrados ${suspiciousInvites.length} convites suspeitos`);
    
    let description = '';
    for (const inviteUse of suspiciousInvites.slice(0, 10)) {
      try {
        const inviter = await message.client.users.fetch(inviteUse.inviterId);
        const invitee = await message.client.users.fetch(inviteUse.inviteeId);
        
        description += `**Convidador:** ${inviter.username}\n`;
        description += `**Convidado:** ${invitee.username}\n`;
        description += `**Motivo:** ${inviteUse.fraudReason || 'Não especificado'}\n`;
        description += `**Data:** ${inviteUse.joinedAt.toLocaleDateString('pt-BR')}\n`;
        description += `---\n`;
      } catch (error) {
        description += `**Erro ao carregar dados do convite**\n---\n`;
      }
    }
    
    embed.setDescription(description);
    embed.setFooter({ text: 'Mostrando últimos 10 casos suspeitos' });
    
    await message.reply({ embeds: [embed] });
    
  } catch (error) {
    logger.error('❌ Erro na auditoria:', error);
    await message.reply({
      embeds: [createEmbed('❌ Erro ao realizar auditoria.', 'error')]
    });
  }
}
