/**
 * 🤖 Comando de Configuração de IA
 * Permite ajustar parâmetros da IA para melhor performance
 */

import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { configManager } from '../../utils/configManager.js';

export default {
  name: 'config-ai',
  data: new SlashCommandBuilder()
    .setName('config-ai')
    .setDescription('⚙️ Configurar parâmetros da IA do bot')
    .addSubcommand(subcommand =>
      subcommand
        .setName('temperatura')
        .setDescription('Ajustar criatividade das respostas (0.1-1.0)')
        .addNumberOption(option =>
          option.setName('valor')
            .setDescription('Valor da temperatura (0.1 = conservador, 1.0 = criativo)')
            .setRequired(true)
            .setMinValue(0.1)
            .setMaxValue(1.0)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('tamanho')
        .setDescription('Ajustar tamanho máximo das respostas')
        .addIntegerOption(option =>
          option.setName('valor')
            .setDescription('Número máximo de caracteres (50-500)')
            .setRequired(true)
            .setMinValue(50)
            .setMaxValue(500)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('contexto')
        .setDescription('Configurar uso de contexto social')
        .addBooleanOption(option =>
          option.setName('ativo')
            .setDescription('Ativar/desativar uso de contexto social')
            .setRequired(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('status')
        .setDescription('Ver configurações atuais da IA')
    ),
  
  permissions: ['ManageGuild'],
  category: 'ai',
  cooldown: 5000,

  async execute(interaction) {
    await interaction.deferReply();

    try {
      const subcommand = interaction.options.getSubcommand();
      const guildId = interaction.guild.id;
      
      // Obter configuração atual
      let guildConfig = await configManager.getConfig(guildId);
      
      // Inicializar configuração de IA se não existir
      if (!guildConfig.ai) {
        guildConfig.ai = {
          temperature: 0.8,
          maxLength: 200,
          useContext: true,
          responseStyle: 'balanced'
        };
        await configManager.updateConfig(guildId, guildConfig);
      }

      const embed = new EmbedBuilder()
        .setColor(guildConfig.colors.primary)
        .setAuthor({
          name: '🤖 Configuração de IA',
          iconURL: interaction.client.user.displayAvatarURL()
        })
        .setTimestamp();

      switch (subcommand) {
        case 'temperatura':
          const newTemp = interaction.options.getNumber('valor');
          guildConfig.ai.temperature = newTemp;
          await configManager.updateConfig(guildId, guildConfig);
          
          embed.setTitle('✅ Temperatura Atualizada')
            .setDescription(`**Nova temperatura:** ${newTemp}`)
            .addFields(
              { 
                name: '📊 Interpretação', 
                value: newTemp < 0.4 ? '🎯 **Conservador** - Respostas mais previsíveis' :
                       newTemp < 0.7 ? '⚖️ **Equilibrado** - Boa mistura de precisão e criatividade' :
                       '🎨 **Criativo** - Respostas mais variadas e criativas'
              }
            );
          break;

        case 'tamanho':
          const newLength = interaction.options.getInteger('valor');
          guildConfig.ai.maxLength = newLength;
          await configManager.updateConfig(guildId, guildConfig);
          
          embed.setTitle('✅ Tamanho Máximo Atualizado')
            .setDescription(`**Novo limite:** ${newLength} caracteres`)
            .addFields(
              { 
                name: '📏 Interpretação', 
                value: newLength < 100 ? '📝 **Conciso** - Respostas curtas e diretas' :
                       newLength < 300 ? '📄 **Moderado** - Respostas bem explicadas' :
                       '📚 **Detalhado** - Respostas completas e elaboradas'
              }
            );
          break;

        case 'contexto':
          const useContext = interaction.options.getBoolean('ativo');
          guildConfig.ai.useContext = useContext;
          await configManager.updateConfig(guildId, guildConfig);
          
          embed.setTitle('✅ Contexto Social Atualizado')
            .setDescription(`**Uso de contexto:** ${useContext ? '🟢 Ativo' : '🔴 Desativo'}`)
            .addFields(
              { 
                name: '🧠 Interpretação', 
                value: useContext ? 
                  '✨ A IA usará mensagens anteriores e perfil do usuário para respostas mais personalizadas' :
                  '⚡ A IA responderá apenas com base na mensagem atual, sendo mais rápida mas menos contextual'
              }
            );
          break;

        case 'status':
          embed.setTitle('📋 Status Atual da IA')
            .addFields(
              { 
                name: '🌡️ Temperatura', 
                value: `**${guildConfig.ai.temperature}** ${
                  guildConfig.ai.temperature < 0.4 ? '(Conservador)' :
                  guildConfig.ai.temperature < 0.7 ? '(Equilibrado)' : '(Criativo)'
                }`, 
                inline: true 
              },
              { 
                name: '📏 Tamanho Máximo', 
                value: `**${guildConfig.ai.maxLength}** caracteres`, 
                inline: true 
              },
              { 
                name: '🧠 Contexto Social', 
                value: guildConfig.ai.useContext ? '🟢 Ativo' : '🔴 Desativo', 
                inline: true 
              },
              { 
                name: '📊 Performance', 
                value: '🟢 Servidor IA Online\n🟢 GPT-2 Carregado\n🟢 Contexto Coletando', 
                inline: false 
              }
            );
          break;
      }

      await interaction.editReply({ embeds: [embed] });

    } catch (error) {
      console.error('Erro no comando config-ai:', error);
      
      const errorEmbed = new EmbedBuilder()
        .setColor('#FF0000')
        .setTitle('❌ Erro na Configuração')
        .setDescription('Ocorreu um erro ao ajustar as configurações da IA.')
        .addFields({ name: 'Detalhes', value: `\`${error.message}\`` });

      await interaction.editReply({ embeds: [errorEmbed] });
    }
  }
};