/**
 * 🎯 Comando: Invite Stats
 * Mostra estatísticas de convites do usuário
 */

import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { inviteSystem } from '../../utils/inviteSystem.js';
import { createEmbed, createSuccessEmbed, createErrorEmbed, createWarningEmbed, createInfoEmbed } from '../../utils/embeds.js';
import { logger } from '../../utils/logger.js';
import { prisma } from '../../database/client.js';

export const data = new SlashCommandBuilder()
  .setName('invite')
  .setDescription('🎯 Gerenciar sistema de convites')
  .addSubcommand(subcommand =>
    subcommand
      .setName('stats')
      .setDescription('📊 Ver suas estatísticas de convites')
  )
  .addSubcommand(subcommand =>
    subcommand
      .setName('leaderboard')
      .setDescription('🏆 Ver ranking de convites do servidor')
      .addIntegerOption(option =>
        option.setName('pagina')
          .setDescription('Página do ranking')
          .setMinValue(1)
          .setRequired(false)
      )
  )
  .addSubcommand(subcommand =>
    subcommand
      .setName('create')
      .setDescription('📨 Criar um novo convite')
      .addChannelOption(option =>
        option.setName('canal')
          .setDescription('Canal para o convite (opcional)')
          .setRequired(false)
      )
      .addIntegerOption(option =>
        option.setName('usos')
          .setDescription('Número máximo de usos (0 = ilimitado)')
          .setMinValue(0)
          .setMaxValue(100)
          .setRequired(false)
      )
      .addIntegerOption(option =>
        option.setName('duracao')
          .setDescription('Duração em horas (0 = permanente)')
          .setMinValue(0)
          .setMaxValue(168)
          .setRequired(false)
      )
  );

export async function execute(interaction) {
  try {
    const subcommand = interaction.options.getSubcommand();
    const guildId = interaction.guild.id;
    const userId = interaction.user.id;
    
    // Verificar se o sistema está habilitado
    const config = await inviteSystem.getInviteConfig(guildId);
    
    if (!config?.enabled && subcommand !== 'create') {
      return await interaction.reply({
        embeds: [createEmbed('❌ Sistema de convites não está habilitado neste servidor.', 'error')],
        flags: ['Ephemeral']
      });
    }

    switch (subcommand) {
      case 'stats':
        await handleStats(interaction, userId, guildId, config);
        break;
      case 'leaderboard':
        await handleLeaderboard(interaction, guildId);
        break;
      case 'create':
        await handleCreate(interaction);
        break;
    }

  } catch (error) {
    logger.error('❌ Erro no comando invite:', error);
    const errorEmbed = createEmbed('❌ Erro interno do sistema.', 'error');
    
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp({ embeds: [errorEmbed], flags: ['Ephemeral'] });
    } else {
      await interaction.reply({ embeds: [errorEmbed], flags: ['Ephemeral'] });
    }
  }
}

/**
 * 📊 Mostrar estatísticas do usuário
 */
async function handleStats(interaction, userId, guildId, config) {
  await interaction.deferReply();
  
  try {
    const stats = await inviteSystem.getUserInviteStats(userId, guildId);
    
    const embed = new EmbedBuilder()
      .setTitle('🎯 Suas Estatísticas de Convites')
      .setColor('#5865f2')
      .setThumbnail(interaction.user.displayAvatarURL({ dynamic: true }))
      .addFields([
        {
          name: '👥 Convites Válidos',
          value: `${stats.totalValidInvites}`,
          inline: true
        },
        {
          name: '💰 Total Ganho',
          value: `${stats.totalEarned.toLocaleString()} coins`,
          inline: true
        },
        {
          name: '📨 Convites Ativos',
          value: `${stats.activeInvites}`,
          inline: true
        },
        {
          name: '💵 Média por Convite',
          value: `${stats.averagePerInvite} coins`,
          inline: true
        },
        {
          name: '🎁 Recompensa Atual',
          value: `${config?.rewardPerInvite || 100} coins`,
          inline: true
        },
        {
          name: '⏰ Limite Diário',
          value: `${config?.maxRewardPerDay || 1000} coins`,
          inline: true
        }
      ])
      .setFooter({ 
        text: 'Use /invite create para criar novos convites',
        iconURL: interaction.client.user.displayAvatarURL()
      })
      .setTimestamp();

    // Adicionar informações sobre bônus por marcos se existirem
    if (config?.bonusThresholds) {
      try {
        const thresholds = JSON.parse(config.bonusThresholds);
        const nextMilestone = Object.keys(thresholds)
          .map(Number)
          .sort((a, b) => a - b)
          .find(threshold => threshold > stats.totalValidInvites);
          
        if (nextMilestone) {
          const bonus = thresholds[nextMilestone];
          const remaining = nextMilestone - stats.totalValidInvites;
          
          embed.addFields([{
            name: '🏆 Próximo Marco',
            value: `${nextMilestone} convites (+${bonus} coins)\nFaltam: ${remaining} convites`,
            inline: false
          }]);
        }
      } catch (error) {
        // Ignorar erro de parsing do JSON
      }
    }

    await interaction.editReply({ embeds: [embed] });
    
  } catch (error) {
    logger.error('❌ Erro ao mostrar stats:', error);
    await interaction.editReply({
      embeds: [createEmbed('❌ Erro ao carregar suas estatísticas.', 'error')]
    });
  }
}

/**
 * 🏆 Mostrar ranking de convites
 */
async function handleLeaderboard(interaction, guildId) {
  await interaction.deferReply();
  
  try {
    const page = interaction.options.getInteger('pagina') || 1;
    const pageSize = 10;
    const offset = (page - 1) * pageSize;
    
    // Buscar top users por convites válidos
    const topUsers = await prisma.inviteUse.groupBy({
      by: ['inviterId'],
      where: {
        guildId,
        isValid: true,
        rewardGiven: true
      },
      _count: { _all: true },
      _sum: { rewardAmount: true },
      orderBy: {
        _count: {
          _all: 'desc'
        }
      },
      take: pageSize,
      skip: offset
    });

    if (topUsers.length === 0) {
      return await interaction.editReply({
        embeds: [createEmbed('📊 Nenhum convite válido encontrado neste servidor ainda.', 'info')]
      });
    }

    const embed = new EmbedBuilder()
      .setTitle(`🏆 Ranking de Convites - Página ${page}`)
      .setColor('#ffd700')
      .setThumbnail(interaction.guild.iconURL({ dynamic: true }));

    let description = '';
    for (let i = 0; i < topUsers.length; i++) {
      const userData = topUsers[i];
      const position = offset + i + 1;
      const medal = position <= 3 ? ['🥇', '🥈', '🥉'][position - 1] : `#${position}`;
      
      try {
        const user = await interaction.client.users.fetch(userData.inviterId);
        const invites = userData._count._all;
        const earned = userData._sum.rewardAmount || 0;
        
        description += `${medal} **${user.username}**\n`;
        description += `   👥 ${invites} convites • 💰 ${earned.toLocaleString()} coins\n\n`;
      } catch (error) {
        // Usuário não encontrado
        description += `${medal} *Usuário desconhecido*\n`;
        description += `   👥 ${userData._count._all} convites\n\n`;
      }
    }

    embed.setDescription(description);
    embed.setFooter({ 
      text: `Página ${page} • Use /invite stats para ver suas estatísticas`,
      iconURL: interaction.client.user.displayAvatarURL()
    });

    await interaction.editReply({ embeds: [embed] });
    
  } catch (error) {
    logger.error('❌ Erro ao mostrar leaderboard:', error);
    await interaction.editReply({
      embeds: [createEmbed('❌ Erro ao carregar ranking.', 'error')]
    });
  }
}

/**
 * 📨 Criar novo convite
 */
async function handleCreate(interaction) {
  try {
    const channel = interaction.options.getChannel('canal') || interaction.channel;
    const maxUses = interaction.options.getInteger('usos') || 0;
    const duration = interaction.options.getInteger('duracao') || 0;
    
    // Verificar permissões
    if (!interaction.member.permissions.has('CreateInstantInvite')) {
      return await interaction.reply({
        embeds: [createEmbed('❌ Você não tem permissão para criar convites.', 'error')],
        flags: ['Ephemeral']
      });
    }

    await interaction.deferReply();
    
    const maxAge = duration > 0 ? duration * 60 * 60 : 0; // Converter horas para segundos
    
    const invite = await channel.createInvite({
      maxAge,
      maxUses,
      unique: true,
      reason: `Convite criado por ${interaction.user.username} via comando`
    });

    // Sincronizar com o banco
    await inviteSystem.syncInvites(interaction.guild);

    const embed = new EmbedBuilder()
      .setTitle('📨 Convite Criado!')
      .setColor('#00ff00')
      .addFields([
        {
          name: '🔗 Link do Convite',
          value: `[${invite.code}](${invite.url})`,
          inline: false
        },
        {
          name: '📍 Canal',
          value: `${channel}`,
          inline: true
        },
        {
          name: '🔢 Usos Máximos',
          value: maxUses === 0 ? 'Ilimitado' : maxUses.toString(),
          inline: true
        },
        {
          name: '⏰ Duração',
          value: duration === 0 ? 'Permanente' : `${duration}h`,
          inline: true
        }
      ])
      .setFooter({ 
        text: 'Compartilhe este link para convidar pessoas e ganhar recompensas!',
        iconURL: interaction.user.displayAvatarURL()
      })
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
    
  } catch (error) {
    logger.error('❌ Erro ao criar convite:', error);
    
    if (interaction.deferred) {
      await interaction.editReply({
        embeds: [createEmbed('❌ Erro ao criar convite. Verifique as permissões do bot.', 'error')]
      });
    } else {
      await interaction.reply({
        embeds: [createEmbed('❌ Erro ao criar convite. Verifique as permissões do bot.', 'error')],
        flags: ['Ephemeral']
      });
    }
  }
}

// Comando tradicional com prefix
export default {
  name: 'invite',
  description: '🎯 Gerenciar sistema de convites',
  category: 'economy',
  usage: 'invite <stats|leaderboard|create>',
  cooldown: 5000,
  
  async execute(client, message, args) {
    // Redirecionar para versão slash command (não suportado em prefix commands)
    const embed = createEmbed({
      title: '🎯 Sistema de Convites',
      description: 'Este comando só funciona como slash command.\nUse `/invite` em vez de `m.invite`',
      color: 'warning'
    });
    
    return await message.reply({ embeds: [embed] });
  }
};