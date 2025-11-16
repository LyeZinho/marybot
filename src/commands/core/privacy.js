/**
 * 🔐 Comando de Privacidade
 * Permite aos usuários gerenciar suas configurações de privacidade no módulo social
 */

import { EmbedBuilder } from 'discord.js';
import socialModule from '../../../social_module/index.js';

export default {
    name: 'privacy',
    description: 'Gerenciar suas configurações de privacidade de dados',
    category: 'core',
    usage: 'privacy [status|disable|enable|export|delete|config]',
    cooldown: 3000,
    
    async execute(client, message, args, guildConfig) {
        const subCommand = args[0]?.toLowerCase();
        const userId = message.author.id;

        try {
            switch (subCommand) {
                case 'status':
                    await this.showPrivacyStatus(message, userId, guildConfig);
                    break;
                    
                case 'disable':
                    await this.disableDataCollection(message, userId, guildConfig);
                    break;
                    
                case 'enable':
                    await this.enableDataCollection(message, userId, guildConfig);
                    break;
                    
                case 'export':
                    await this.exportUserData(message, userId, guildConfig);
                    break;
                    
                case 'delete':
                    await this.deleteUserData(message, userId, guildConfig);
                    break;
                    
                case 'config':
                    await this.configureSettings(message, args.slice(1), userId, guildConfig);
                    break;
                    
                default:
                    await this.showPrivacyHelp(message, guildConfig);
                    break;
            }
        } catch (error) {
            console.error('Erro no comando privacy:', error);
            
            const errorEmbed = new EmbedBuilder()
                .setColor(guildConfig.colors.error)
                .setTitle(`${guildConfig.emojis.error} Erro`)
                .setDescription('Ocorreu um erro ao processar sua solicitação de privacidade.')
                .setFooter({ text: 'Tente novamente mais tarde' });
                
            await message.reply({ embeds: [errorEmbed] });
        }
    },

    /**
     * Mostra o status atual de privacidade do usuário
     */
    async showPrivacyStatus(message, userId, guildConfig) {
        if (!socialModule.initialized) {
            return this.showModuleNotAvailable(message, guildConfig);
        }

        const settings = socialModule.privacyManager.getPrivacySettings(userId);
        const profile = await socialModule.getUserProfile(userId);
        
        const statusEmbed = new EmbedBuilder()
            .setColor(guildConfig.colors.primary)
            .setTitle('🔐 Status de Privacidade')
            .setDescription('Suas configurações atuais de privacidade:')
            .addFields([
                {
                    name: '📊 Coleta de Dados',
                    value: settings.data_collection_enabled ? '✅ Habilitada' : '❌ Desabilitada',
                    inline: true
                },
                {
                    name: '🤖 Contexto para IA',
                    value: settings.context_sharing_enabled ? '✅ Habilitado' : '❌ Desabilitado',
                    inline: true
                },
                {
                    name: '🗑️ Auto-limpeza',
                    value: `${settings.auto_delete_days} dias`,
                    inline: true
                }
            ]);

        if (profile) {
            statusEmbed.addFields([
                {
                    name: '📈 Dados Armazenados',
                    value: `**Mensagens:** ${profile.message_count}\n**Primeiro registro:** ${new Date(profile.first_seen).toLocaleDateString('pt-BR')}\n**Última atividade:** ${new Date(profile.last_seen).toLocaleDateString('pt-BR')}`,
                    inline: false
                }
            ]);
        }

        statusEmbed.setFooter({ 
            text: 'Use m.privacy help para ver todas as opções disponíveis' 
        });

        await message.reply({ embeds: [statusEmbed] });
    },

    /**
     * Desabilita a coleta de dados
     */
    async disableDataCollection(message, userId, guildConfig) {
        if (!socialModule.initialized) {
            return this.showModuleNotAvailable(message, guildConfig);
        }

        const success = socialModule.privacyManager.updatePrivacySettings(userId, {
            data_collection_enabled: false,
            context_sharing_enabled: false
        });

        const embed = new EmbedBuilder()
            .setColor(success ? guildConfig.colors.success : guildConfig.colors.error)
            .setTitle(success ? '✅ Coleta Desabilitada' : '❌ Erro')
            .setDescription(success 
                ? 'A coleta de dados foi desabilitada. Suas mensagens não serão mais armazenadas.\n\n⚠️ **Nota:** Dados existentes permanecem até que você os exclua manualmente.'
                : 'Não foi possível desabilitar a coleta de dados. Tente novamente.')
            .setFooter({ text: success ? 'Use m.privacy delete para remover dados existentes' : null });

        await message.reply({ embeds: [embed] });
    },

    /**
     * Habilita a coleta de dados
     */
    async enableDataCollection(message, userId, guildConfig) {
        if (!socialModule.initialized) {
            return this.showModuleNotAvailable(message, guildConfig);
        }

        const success = socialModule.privacyManager.updatePrivacySettings(userId, {
            data_collection_enabled: true,
            context_sharing_enabled: true
        });

        const embed = new EmbedBuilder()
            .setColor(success ? guildConfig.colors.success : guildConfig.colors.error)
            .setTitle(success ? '✅ Coleta Habilitada' : '❌ Erro')
            .setDescription(success 
                ? 'A coleta de dados foi habilitada. Suas mensagens serão armazenadas para melhorar a experiência com a IA.'
                : 'Não foi possível habilitar a coleta de dados. Tente novamente.')
            .setFooter({ text: success ? 'Suas mensagens a partir de agora serão coletadas' : null });

        await message.reply({ embeds: [embed] });
    },

    /**
     * Exporta todos os dados do usuário
     */
    async exportUserData(message, userId, guildConfig) {
        if (!socialModule.initialized) {
            return this.showModuleNotAvailable(message, guildConfig);
        }

        await message.channel.sendTyping();

        const userData = socialModule.privacyManager.exportUserData(userId);
        
        if (!userData) {
            const embed = new EmbedBuilder()
                .setColor(guildConfig.colors.warning)
                .setTitle('⚠️ Nenhum Dado Encontrado')
                .setDescription('Não foram encontrados dados seus para exportar.');
                
            return await message.reply({ embeds: [embed] });
        }

        // Criar arquivo JSON com os dados
        const jsonData = JSON.stringify(userData, null, 2);
        const buffer = Buffer.from(jsonData, 'utf-8');
        
        const embed = new EmbedBuilder()
            .setColor(guildConfig.colors.success)
            .setTitle('📦 Exportação de Dados')
            .setDescription('Aqui estão todos os seus dados armazenados pelo MaryBot.')
            .addFields([
                {
                    name: '📊 Resumo',
                    value: `**Mensagens:** ${userData.messages?.length || 0}\n**Tópicos:** ${userData.topics?.length || 0}\n**Conversas:** ${userData.conversations?.length || 0}`,
                    inline: false
                }
            ])
            .setFooter({ text: 'Dados exportados conforme LGPD/GDPR' });

        await message.reply({ 
            embeds: [embed],
            files: [{
                attachment: buffer,
                name: `marybot-dados-${userId}-${new Date().toISOString().split('T')[0]}.json`
            }]
        });
    },

    /**
     * Deleta todos os dados do usuário
     */
    async deleteUserData(message, userId, guildConfig) {
        if (!socialModule.initialized) {
            return this.showModuleNotAvailable(message, guildConfig);
        }

        // Confirmação de segurança
        const confirmEmbed = new EmbedBuilder()
            .setColor(guildConfig.colors.warning)
            .setTitle('⚠️ Confirmação de Exclusão')
            .setDescription('**ATENÇÃO:** Esta ação irá remover permanentemente todos os seus dados armazenados pelo MaryBot.\n\n🗑️ **Será removido:**\n• Todas as suas mensagens\n• Seu perfil de usuário\n• Tópicos de interesse\n• Histórico de conversas\n• Configurações de privacidade\n\n**Esta ação é IRREVERSÍVEL!**')
            .setFooter({ text: 'Reaja com ✅ para confirmar ou ❌ para cancelar (60 segundos)' });

        const confirmMessage = await message.reply({ embeds: [confirmEmbed] });
        await confirmMessage.react('✅');
        await confirmMessage.react('❌');

        try {
            const filter = (reaction, user) => {
                return ['✅', '❌'].includes(reaction.emoji.name) && user.id === userId;
            };

            const collected = await confirmMessage.awaitReactions({
                filter,
                max: 1,
                time: 60000,
                errors: ['time']
            });

            const reaction = collected.first();

            if (reaction.emoji.name === '✅') {
                // Confirmar exclusão
                const success = await socialModule.clearUserData(userId);
                
                const resultEmbed = new EmbedBuilder()
                    .setColor(success ? guildConfig.colors.success : guildConfig.colors.error)
                    .setTitle(success ? '✅ Dados Removidos' : '❌ Erro na Exclusão')
                    .setDescription(success 
                        ? 'Todos os seus dados foram removidos permanentemente do MaryBot.\n\n🔄 **Nota:** A coleta de dados foi automaticamente desabilitada.'
                        : 'Não foi possível remover seus dados. Tente novamente ou contate o suporte.')
                    .setFooter({ text: success ? 'Direito ao esquecimento exercido com sucesso' : null });

                await confirmMessage.edit({ embeds: [resultEmbed] });
                
            } else {
                // Cancelar exclusão
                const cancelEmbed = new EmbedBuilder()
                    .setColor(guildConfig.colors.primary)
                    .setTitle('🔄 Exclusão Cancelada')
                    .setDescription('Seus dados permanecem seguros. Nenhuma alteração foi feita.');

                await confirmMessage.edit({ embeds: [cancelEmbed] });
            }

        } catch (error) {
            // Timeout
            const timeoutEmbed = new EmbedBuilder()
                .setColor(guildConfig.colors.warning)
                .setTitle('⏰ Tempo Esgotado')
                .setDescription('A confirmação expirou. Seus dados permanecem seguros.');

            await confirmMessage.edit({ embeds: [timeoutEmbed] });
        }
    },

    /**
     * Configura configurações específicas
     */
    async configureSettings(message, args, userId, guildConfig) {
        if (!socialModule.initialized) {
            return this.showModuleNotAvailable(message, guildConfig);
        }

        const setting = args[0]?.toLowerCase();
        const value = args[1];

        if (setting === 'retention' && value) {
            const days = parseInt(value);
            
            if (isNaN(days) || days < 1 || days > 365) {
                const embed = new EmbedBuilder()
                    .setColor(guildConfig.colors.error)
                    .setTitle('❌ Valor Inválido')
                    .setDescription('O período de retenção deve ser entre 1 e 365 dias.');
                    
                return await message.reply({ embeds: [embed] });
            }

            const success = socialModule.privacyManager.updatePrivacySettings(userId, {
                auto_delete_days: days
            });

            const embed = new EmbedBuilder()
                .setColor(success ? guildConfig.colors.success : guildConfig.colors.error)
                .setTitle(success ? '✅ Configuração Atualizada' : '❌ Erro')
                .setDescription(success 
                    ? `Período de retenção de dados alterado para **${days} dias**.`
                    : 'Não foi possível atualizar a configuração.')
                .setFooter({ text: success ? 'Dados mais antigos serão removidos automaticamente' : null });

            await message.reply({ embeds: [embed] });
            
        } else {
            const embed = new EmbedBuilder()
                .setColor(guildConfig.colors.warning)
                .setTitle('⚙️ Configurações Disponíveis')
                .setDescription('**Uso:** `m.privacy config <configuração> <valor>`\n\n**Configurações disponíveis:**')
                .addFields([
                    {
                        name: '🗑️ retention <dias>',
                        value: 'Define quantos dias manter seus dados (1-365)',
                        inline: false
                    }
                ])
                .setFooter({ text: 'Exemplo: m.privacy config retention 30' });

            await message.reply({ embeds: [embed] });
        }
    },

    /**
     * Mostra ajuda sobre privacidade
     */
    async showPrivacyHelp(message, guildConfig) {
        const helpEmbed = new EmbedBuilder()
            .setColor(guildConfig.colors.primary)
            .setTitle('🔐 Gerenciamento de Privacidade')
            .setDescription('Controle seus dados pessoais no MaryBot')
            .addFields([
                {
                    name: '📊 `m.privacy status`',
                    value: 'Ver suas configurações atuais de privacidade',
                    inline: false
                },
                {
                    name: '❌ `m.privacy disable`',
                    value: 'Desabilitar coleta de dados das suas mensagens',
                    inline: false
                },
                {
                    name: '✅ `m.privacy enable`',
                    value: 'Habilitar coleta de dados (melhora respostas da IA)',
                    inline: false
                },
                {
                    name: '📦 `m.privacy export`',
                    value: 'Baixar todos os seus dados (LGPD/GDPR)',
                    inline: false
                },
                {
                    name: '🗑️ `m.privacy delete`',
                    value: 'Remover permanentemente todos os seus dados',
                    inline: false
                },
                {
                    name: '⚙️ `m.privacy config`',
                    value: 'Configurar opções específicas de privacidade',
                    inline: false
                }
            ])
            .setFooter({ 
                text: 'MaryBot está em conformidade com LGPD e GDPR' 
            });

        await message.reply({ embeds: [helpEmbed] });
    },

    /**
     * Mostra mensagem quando o módulo não está disponível
     */
    async showModuleNotAvailable(message, guildConfig) {
        const embed = new EmbedBuilder()
            .setColor(guildConfig.colors.warning)
            .setTitle('⚠️ Módulo Indisponível')
            .setDescription('O módulo de privacidade não está disponível no momento. Tente novamente mais tarde.');
            
        await message.reply({ embeds: [embed] });
    }
};