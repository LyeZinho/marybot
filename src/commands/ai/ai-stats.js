/**
 * 📊 Comando de Estatísticas de IA
 * Visualizar performance e uso da IA do bot
 */

import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { aiStatsManager } from '../../utils/aiStatsManager.js';

export default {
  data: new SlashCommandBuilder()
    .setName('ai-stats')
    .setDescription('📊 Ver estatísticas de uso da IA')
    .addBooleanOption(option =>
      option.setName('global')
        .setDescription('Mostrar estatísticas globais em vez do servidor atual')
        .setRequired(false)
    ),
  
  permissions: ['ManageGuild'],
  category: 'ai',
  cooldown: 3000,

  async execute(interaction) {
    await interaction.deferReply();

    try {
      const showGlobal = interaction.options.getBoolean('global') || false;
      const guildId = showGlobal ? null : interaction.guild?.id;
      
      const stats = aiStatsManager.getStatsSummary(guildId);
      const topQuestions = guildId ? aiStatsManager.getTopQuestionTypes(guildId) : [];

      const embed = new EmbedBuilder()
        .setColor('#00FF7F')
        .setAuthor({
          name: showGlobal ? '🌐 Estatísticas Globais de IA' : '📊 Estatísticas de IA do Servidor',
          iconURL: interaction.client.user.displayAvatarURL()
        })
        .setTimestamp();

      // Campos principais
      embed.addFields(
        {
          name: '📈 Uso Geral',
          value: [
            `**Total de Solicitações:** ${stats.totalRequests}`,
            `**Sucessos:** ${stats.successfulRequests} (${stats.successRate}%)`,
            `**Falhas:** ${stats.failedRequests}`,
            `**Tempo Médio:** ${stats.averageResponseTime?.toFixed(0) || 0}ms`
          ].join('\n'),
          inline: true
        }
      );

      if (!showGlobal && stats.contextUsageCount !== undefined) {
        embed.addFields({
          name: '🧠 Contexto Social',
          value: [
            `**Uso de Contexto:** ${stats.contextUsageRate}%`,
            `**Com Contexto:** ${stats.contextUsageCount}`,
            `**Sem Contexto:** ${stats.successfulRequests - stats.contextUsageCount}`
          ].join('\n'),
          inline: true
        });
      }

      // Performance indicator
      const performanceEmoji = stats.successRate >= 95 ? '🟢' :
                              stats.successRate >= 80 ? '🟡' : '🔴';
      
      embed.addFields({
        name: '⚡ Performance',
        value: [
          `${performanceEmoji} **Status:** ${stats.successRate >= 95 ? 'Excelente' : 
                                         stats.successRate >= 80 ? 'Boa' : 'Precisa Atenção'}`,
          `**Disponibilidade:** ${stats.successRate}%`,
          `**Velocidade:** ${stats.averageResponseTime < 2000 ? 'Rápida' : 
                          stats.averageResponseTime < 5000 ? 'Moderada' : 'Lenta'}`
        ].join('\n'),
        inline: true
      });

      // Top tipos de pergunta (apenas para servidor)
      if (!showGlobal && topQuestions.length > 0) {
        const questionsList = topQuestions
          .map((q, i) => `**${i + 1}.** ${q.type} (${q.count}x)`)
          .join('\n');
        
        embed.addFields({
          name: '🎯 Tipos Mais Comuns',
          value: questionsList || 'Nenhum dado disponível',
          inline: false
        });
      }

      // Datas
      if (stats.firstUsed) {
        embed.addFields({
          name: '📅 Histórico',
          value: [
            `**Primeiro Uso:** <t:${Math.floor(stats.firstUsed.getTime() / 1000)}:R>`,
            `**Último Uso:** <t:${Math.floor((stats.lastUsed || new Date()).getTime() / 1000)}:R>`
          ].join('\n'),
          inline: false
        });
      }

      // Footer com dicas
      embed.setFooter({
        text: showGlobal ? 
          'Use /config-ai para ajustar configurações' : 
          'Use /ai-stats global:true para ver estatísticas globais'
      });

      await interaction.editReply({ embeds: [embed] });

    } catch (error) {
      console.error('Erro no comando ai-stats:', error);
      
      const errorEmbed = new EmbedBuilder()
        .setColor('#FF0000')
        .setTitle('❌ Erro nas Estatísticas')
        .setDescription('Não foi possível carregar as estatísticas da IA.')
        .addFields({ name: 'Detalhes', value: `\`${error.message}\`` });

      await interaction.editReply({ embeds: [errorEmbed] });
    }
  }
};