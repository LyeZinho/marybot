/**
 * @file learning.js
 * @description Comando administrativo para gerenciar o sistema de aprendizado do bot
 */

import { getLearningStats, findRelevantContext } from '../../utils/learningHandler.js';
import { getCacheStats, clearCache } from '../../utils/embeddingService.js';
import { getPrisma } from '../../database/client.js';
import { getMemoryStats, clearAllMemory, forgetUser } from '../../utils/conversationManager.js';
import config from '../../config.js';

export default {
    name: 'learning',
    aliases: ['aprendizado', 'learn'],
    description: 'Gerenciar sistema de aprendizado e memória do bot.',
    category: 'admin',
    usage: 'learning [stats|search|clear-cache|messages|memory|forget|clear-memory] [opções]',
    cooldown: 3000,
    permissions: ['ManageGuild'],
    
    async execute(client, message, args) {
        try {
            const subcommand = args[0]?.toLowerCase();
            
            if (!subcommand) {
                return await this.showHelp(message);
            }
            
            switch (subcommand) {
                case 'stats':
                    await handleStats(message);
                    break;
                case 'search':
                    await handleSearch(message, args.slice(1));
                    break;
                case 'clear-cache':
                    await handleClearCache(message);
                    break;
                case 'messages':
                    await handleMessages(message, args.slice(1));
                    break;
                case 'memory':
                    await handleMemory(message);
                    break;
                case 'forget':
                    await handleForget(message, args.slice(1));
                    break;
                case 'clear-memory':
                    await handleClearMemory(message);
                    break;
                default:
                    await this.showHelp(message);
                    break;
            }
            
        } catch (error) {
            console.error('Erro ao executar comando learning:', error);
            
            const errorEmbed = {
                color: config.colors.error,
                title: '❌ Erro',
                description: 'Ocorreu um erro ao executar o comando.',
                fields: [
                    {
                        name: 'Detalhes',
                        value: error.message || 'Erro desconhecido'
                    }
                ]
            };
            
            await message.reply({ embeds: [errorEmbed] });
        }
    },
    
    async showHelp(message) {
        const helpEmbed = {
            color: config.colors.primary,
            title: '🧠 Sistema de Aprendizado - Ajuda',
            description: 'Comandos disponíveis para gerenciar o sistema de aprendizado:',
            fields: [
                {
                    name: `${config.prefix}learning stats`,
                    value: 'Ver estatísticas do sistema de aprendizado',
                    inline: false
                },
                {
                    name: `${config.prefix}learning search <texto> [limite]`,
                    value: 'Buscar mensagens similares (limite padrão: 5)',
                    inline: false
                },
                {
                    name: `${config.prefix}learning clear-cache`,
                    value: 'Limpar cache de embeddings',
                    inline: false
                },
                {
                    name: `${config.prefix}learning messages [limite]`,
                    value: 'Ver mensagens armazenadas (limite padrão: 10)',
                    inline: false
                },
                {
                    name: `${config.prefix}learning memory`,
                    value: 'Ver estatísticas da memória de conversação',
                    inline: false
                },
                {
                    name: `${config.prefix}learning forget @usuário`,
                    value: 'Limpar memória de um usuário específico',
                    inline: false
                },
                {
                    name: `${config.prefix}learning clear-memory`,
                    value: 'Limpar toda a memória de conversação',
                    inline: false
                }
            ]
        };
        
        await message.reply({ embeds: [helpEmbed] });
    }
};

/**
 * Mostra estatísticas do sistema de aprendizado
 */
async function handleStats(message) {
    try {
        const stats = await getLearningStats();
        
        const embed = {
            color: config.colors.primary,
            title: '🧠 Sistema de Aprendizado - Estatísticas',
            fields: [
                {
                    name: '📊 Mensagens',
                    value: [
                        `**Total:** ${stats.totalMessages.toLocaleString()}`,
                        `**Processadas:** ${stats.processedMessages.toLocaleString()}`,
                        `**Pendentes:** ${stats.pendingMessages.toLocaleString()}`
                    ].join('\n'),
                    inline: true
                },
                {
                    name: '⚙️ Processamento',
                    value: [
                        `**Fila:** ${stats.queueSize}`,
                        `**Status:** ${stats.isProcessing ? '🟢 Ativo' : '🔴 Inativo'}`
                    ].join('\n'),
                    inline: true
                },
                {
                    name: '💾 Cache',
                    value: [
                        `**Tamanho:** ${stats.cache.size}/${stats.cache.maxSize}`,
                        `**Uso:** ${stats.cache.usage}`
                    ].join('\n'),
                    inline: true
                },
                {
                    name: '📏 Limites',
                    value: [
                        `**Máximo:** ${stats.limits.maxMessages.toLocaleString()}`,
                        `**Limpeza:** ${stats.limits.cleanupThreshold.toLocaleString()}`
                    ].join('\n'),
                    inline: false
                }
            ],
            timestamp: new Date()
        };
        
        await message.reply({ embeds: [embed] });
        
    } catch (error) {
        console.error('Erro ao obter estatísticas:', error);
        await message.reply('❌ Erro ao obter estatísticas do sistema.');
    }
}

/**
 * Busca mensagens similares
 */
async function handleSearch(message, args) {
    try {
        if (args.length === 0) {
            return await message.reply('❌ Uso: `m.learning search <texto> [limite]`');
        }
        
        const limit = parseInt(args[args.length - 1]) || 5;
        const query = isNaN(parseInt(args[args.length - 1])) 
            ? args.join(' ') 
            : args.slice(0, -1).join(' ');
        
        const results = await findRelevantContext(query, limit);
        
        if (results.length === 0) {
            return await message.reply('❌ Nenhuma mensagem similar encontrada.');
        }
        
        const embed = {
            color: config.colors.primary,
            title: `🔍 Busca: "${query}"`,
            description: `Encontradas ${results.length} mensagens similares:\n`,
            fields: []
        };
        
        results.forEach((result, index) => {
            const msg = result.message;
            const similarity = (result.similarity * 100).toFixed(2);
            
            embed.fields.push({
                name: `${index + 1}. Similaridade: ${similarity}%`,
                value: [
                    `**Conteúdo:** ${msg.content.substring(0, 100)}${msg.content.length > 100 ? '...' : ''}`,
                    `**Canal:** <#${msg.channelId}>`,
                    `**Data:** <t:${Math.floor(new Date(msg.timestamp).getTime() / 1000)}:R>`
                ].join('\n'),
                inline: false
            });
        });
        
        await message.reply({ embeds: [embed] });
        
    } catch (error) {
        console.error('Erro ao buscar mensagens:', error);
        await message.reply('❌ Erro ao buscar mensagens.');
    }
}

/**
 * Limpa o cache de embeddings
 */
async function handleClearCache(message) {
    try {
        const statsBefore = getCacheStats();
        clearCache();
        
        const embed = {
            color: config.colors.success,
            title: '✅ Cache Limpo',
            description: `Cache de embeddings foi limpo com sucesso!`,
            fields: [{
                name: 'Estatísticas',
                value: `**Antes:** ${statsBefore.size} embeddings\n**Depois:** 0 embeddings`
            }]
        };
        
        await message.reply({ embeds: [embed] });
        
    } catch (error) {
        console.error('Erro ao limpar cache:', error);
        await message.reply('❌ Erro ao limpar cache.');
    }
}

/**
 * Lista mensagens armazenadas
 */
async function handleMessages(message, args) {
    try {
        const limit = parseInt(args[0]) || 10;
        const prisma = getPrisma();
        
        if (!prisma) {
            return await message.reply('❌ Sistema de banco de dados não está disponível.');
        }
        
        const messages = await prisma.chatMessage.findMany({
            orderBy: { timestamp: 'desc' },
            take: limit
        });
        
        if (messages.length === 0) {
            return await message.reply('❌ Nenhuma mensagem armazenada ainda.');
        }
        
        const embed = {
            color: config.colors.primary,
            title: `📝 Últimas ${messages.length} Mensagens`,
            description: 'Mensagens armazenadas no sistema de aprendizado:\n',
            fields: []
        };
        
        messages.forEach((msg, index) => {
            embed.fields.push({
                name: `${index + 1}. ${msg.isProcessed ? '✅' : '⏳'} ${new Date(msg.timestamp).toLocaleString()}`,
                value: [
                    `**Conteúdo:** ${msg.content.substring(0, 100)}${msg.content.length > 100 ? '...' : ''}`,
                    `**Canal:** <#${msg.channelId}>`,
                    `**Palavras:** ${msg.metadata?.wordCount || 0}`
                ].join('\n'),
                inline: false
            });
        });
        
        await message.reply({ embeds: [embed] });
        
    } catch (error) {
        console.error('Erro ao listar mensagens:', error);
        await message.reply('❌ Erro ao listar mensagens.');
    }
}

/**
 * Mostra estatísticas da memória de conversação
 */
async function handleMemory(message) {
    try {
        const stats = getMemoryStats();
        
        const embed = {
            color: config.colors.primary,
            title: '🧠 Memória de Conversação - Estatísticas',
            description: 'Memória de curto prazo (últimas conversas)',
            fields: [
                {
                    name: '👥 Usuários Ativos',
                    value: stats.activeUsers.toString(),
                    inline: true
                },
                {
                    name: '💬 Total de Mensagens',
                    value: stats.totalMessages.toString(),
                    inline: true
                },
                {
                    name: '📊 Média por Usuário',
                    value: stats.averageMessagesPerUser.toString(),
                    inline: true
                }
            ],
            timestamp: new Date()
        };
        
        await message.reply({ embeds: [embed] });
        
    } catch (error) {
        console.error('Erro ao obter estatísticas de memória:', error);
        await message.reply('❌ Erro ao obter estatísticas.');
    }
}

/**
 * Limpa memória de um usuário específico
 */
async function handleForget(message, args) {
    try {
        const user = message.mentions.users.first();
        
        if (!user) {
            return await message.reply('❌ Uso: `m.learning forget @usuário`');
        }
        
        forgetUser(user.id);
        
        const embed = {
            color: config.colors.success,
            title: '✅ Memória Limpa',
            description: `Memória de conversação de ${user.tag} foi limpa com sucesso!`,
            fields: [{
                name: 'Usuário',
                value: `<@${user.id}> (${user.id})`
            }]
        };
        
        await message.reply({ embeds: [embed] });
        
    } catch (error) {
        console.error('Erro ao limpar memória:', error);
        await message.reply('❌ Erro ao limpar memória do usuário.');
    }
}

/**
 * Limpa toda a memória de conversação
 */
async function handleClearMemory(message) {
    try {
        const count = clearAllMemory();
        
        const embed = {
            color: config.colors.success,
            title: '✅ Memória Limpa',
            description: `Toda a memória de conversação foi limpa!`,
            fields: [{
                name: 'Estatísticas',
                value: `**Usuários afetados:** ${count}\n**Memória liberada:** Toda a RAM de conversação`
            }]
        };
        
        await message.reply({ embeds: [embed] });
        
    } catch (error) {
        console.error('Erro ao limpar memória:', error);
        await message.reply('❌ Erro ao limpar memória.');
    }
}
