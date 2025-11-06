/**
 * @file learningHandler.js
 * @description Handler para coletar e processar mensagens para o sistema de aprendizado
 */

import { getPrisma } from '../database/client.js';
import { shouldStoreMessage, normalizeText, extractMetadata, prepareForEmbedding } from './messageProcessor.js';
import { generateEmbedding } from './embeddingService.js';

// Fila de processamento assíncrono
const processingQueue = [];
let isProcessing = false;

// Limites FIFO
const MAX_MESSAGES = 20000;
const CLEANUP_THRESHOLD = 19000; // Limpar quando atingir este número

/**
 * Processa uma mensagem para o sistema de aprendizado
 * @param {Object} message - Mensagem do Discord
 */
async function handleMessageLearning(message) {
    // Verificar se deve armazenar
    if (!shouldStoreMessage(message)) {
        return;
    }
    
    // Adicionar à fila de processamento
    processingQueue.push(message);
    
    // Processar fila se não estiver processando
    if (!isProcessing) {
        processQueue();
    }
}

/**
 * Processa a fila de mensagens de forma assíncrona
 */
async function processQueue() {
    if (processingQueue.length === 0) {
        isProcessing = false;
        return;
    }
    
    isProcessing = true;
    const message = processingQueue.shift();
    
    try {
        await storeMessage(message);
    } catch (error) {
        console.error('❌ Erro ao armazenar mensagem:', error);
    }
    
    // Processar próxima mensagem com pequeno delay
    setTimeout(() => processQueue(), 100);
}

/**
 * Armazena uma mensagem no banco de dados
 * @param {Object} message - Mensagem do Discord
 */
async function storeMessage(message) {
    try {
        const prisma = getPrisma();
        
        if (!prisma) {
            // Banco não inicializado ainda - pular silenciosamente
            return;
        }
        
        // Normalizar conteúdo
        const normalizedContent = normalizeText(message.content);
        const metadata = extractMetadata(message);
        
        // Criar registro no banco
        const chatMessage = await prisma.chatMessage.create({
            data: {
                guildId: message.guild?.id || 'DM',
                channelId: message.channel.id,
                authorId: message.author.id,
                content: normalizedContent,
                metadata: metadata,
                isProcessed: false
            }
        });
        
        // Gerar embedding de forma assíncrona (não espera)
        generateEmbeddingAsync(chatMessage, message);
        
        // Verificar se precisa limpar mensagens antigas (FIFO)
        await cleanupOldMessagesIfNeeded();
        
    } catch (error) {
        console.error('Erro ao armazenar mensagem:', error.message);
    }
}

/**
 * Gera embedding de forma assíncrona (não bloqueia)
 * @param {Object} chatMessage - Registro da mensagem
 * @param {Object} discordMessage - Mensagem original do Discord
 */
async function generateEmbeddingAsync(chatMessage, discordMessage) {
    try {
        const prisma = getPrisma();
        
        if (!prisma) return;
        
        // Preparar texto para embedding
        const embeddingText = prepareForEmbedding(discordMessage, chatMessage.content);
        
        // Gerar embedding
        const embedding = await generateEmbedding(embeddingText, chatMessage.id);
        
        // Atualizar mensagem com embedding
        await prisma.chatMessage.update({
            where: { id: chatMessage.id },
            data: {
                embedding: embedding,
                isProcessed: true
            }
        });
        
    } catch (error) {
        // Silencioso - não logar erro
    }
}

/**
 * Limpa mensagens antigas quando o limite é atingido (FIFO)
 */
async function cleanupOldMessagesIfNeeded() {
    try {
        const prisma = getPrisma();
        
        if (!prisma) return;
        
        // Contar mensagens totais
        const totalMessages = await prisma.chatMessage.count();
        
        if (totalMessages >= CLEANUP_THRESHOLD) {
            // Calcular quantas mensagens deletar
            const toDelete = totalMessages - MAX_MESSAGES + 1000; // Deletar extras + buffer
            
            // Buscar IDs das mensagens mais antigas
            const oldMessages = await prisma.chatMessage.findMany({
                select: { id: true },
                orderBy: { timestamp: 'asc' },
                take: toDelete
            });
            
            const idsToDelete = oldMessages.map(m => m.id);
            
            // Deletar em lote
            await prisma.chatMessage.deleteMany({
                where: {
                    id: { in: idsToDelete }
                }
            });
            
            console.log(`🧹 Limpeza FIFO: ${toDelete} mensagens antigas removidas`);
        }
    } catch (error) {
        // Silencioso
    }
}

/**
 * Busca contexto relevante para gerar resposta
 * @param {string} query - Consulta do usuário
 * @param {number} topK - Número de mensagens similares
 * @returns {Promise<Array<Object>>} Mensagens relevantes
 */
async function findRelevantContext(query, topK = 5) {
    try {
        const prisma = getPrisma();
        
        if (!prisma) return [];
        
        const { generateEmbedding, findSimilarMessages } = await import('./embeddingService.js');
        
        // Normalizar consulta
        const normalizedQuery = normalizeText(query);
        
        // Gerar embedding da consulta
        const queryEmbedding = await generateEmbedding(normalizedQuery);
        
        // Buscar todas as mensagens processadas (com embedding)
        const messages = await prisma.chatMessage.findMany({
            where: {
                isProcessed: true,
                embedding: { not: null }
            },
            orderBy: { timestamp: 'desc' },
            take: 1000 // Limitar busca às últimas 1000 mensagens
        });
        
        // Calcular similaridades
        const similar = findSimilarMessages(queryEmbedding, messages, topK);
        
        return similar;
    } catch (error) {
        return [];
    }
}

/**
 * Obtém estatísticas do sistema de aprendizado
 * @returns {Promise<Object>} Estatísticas
 */
async function getLearningStats() {
    try {
        const prisma = getPrisma();
        const { getCacheStats } = await import('./embeddingService.js');
        
        if (!prisma) {
            // Retornar stats vazias se banco não inicializado
            return {
                totalMessages: 0,
                processedMessages: 0,
                pendingMessages: 0,
                queueSize: processingQueue.length,
                isProcessing,
                cache: getCacheStats(),
                limits: {
                    maxMessages: MAX_MESSAGES,
                    cleanupThreshold: CLEANUP_THRESHOLD
                }
            };
        }
        
        const totalMessages = await prisma.chatMessage.count();
        const processedMessages = await prisma.chatMessage.count({
            where: { isProcessed: true }
        });
        const pendingMessages = totalMessages - processedMessages;
        
        const queueSize = processingQueue.length;
        const cacheStats = getCacheStats();
        
        return {
            totalMessages,
            processedMessages,
            pendingMessages,
            queueSize,
            isProcessing,
            cache: cacheStats,
            limits: {
                maxMessages: MAX_MESSAGES,
                cleanupThreshold: CLEANUP_THRESHOLD
            }
        };
    } catch (error) {
        const { getCacheStats } = await import('./embeddingService.js');
        return {
            totalMessages: 0,
            processedMessages: 0,
            pendingMessages: 0,
            queueSize: processingQueue.length,
            isProcessing,
            cache: getCacheStats(),
            limits: {
                maxMessages: MAX_MESSAGES,
                cleanupThreshold: CLEANUP_THRESHOLD
            }
        };
    }
}

export {
    handleMessageLearning,
    findRelevantContext,
    getLearningStats
};
