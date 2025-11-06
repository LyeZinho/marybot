/**
 * @file conversationManager.js
 * @description Sistema de conversação com memória de curto e longo prazo
 */

import { getPrisma } from '../database/client.js';
import { normalizeText } from './messageProcessor.js';
import { generateEmbedding, findSimilarMessages } from './embeddingService.js';
import { logger } from './logger.js';

// 🧠 Memória de Curto Prazo (RAM) - Map<userId, conversationHistory[]>
const shortTermMemory = new Map();

// ⏱️ Timestamp da última mensagem por usuário
const lastMessageTime = new Map();

// ⚙️ Configurações
const CONFIG = {
    SHORT_TERM_LIMIT: 10,           // Máximo de mensagens no histórico recente
    CONTEXT_DECAY_MINUTES: 10,      // Minutos sem conversa para limpar contexto
    SIMILARITY_THRESHOLD: 0.6,      // Threshold mínimo de similaridade
    MAX_SIMILAR_RESULTS: 3,         // Número máximo de mensagens similares
    RESPONSE_DELAY_MS: 1000,        // Delay artificial para parecer mais natural
};

/**
 * Gerencia conversa quando o bot é mencionado
 * @param {Object} message - Mensagem do Discord
 * @param {string} content - Conteúdo da mensagem sem menções
 */
export async function handleConversation(message, content) {
    try {
        const userId = message.author.id;
        const channelId = message.channel.id;
        
        // Verificar se o contexto expirou
        cleanExpiredContext(userId);
        
        // Atualizar memória de curto prazo
        updateShortTermMemory(userId, 'user', content);
        
        // Buscar contexto relevante na memória de longo prazo
        const similarMessages = await findRelevantContext(content, channelId);
        
        // Gerar resposta baseada em contexto
        const reply = await generateResponse(userId, content, similarMessages);
        
        // Atualizar memória com a resposta do bot
        updateShortTermMemory(userId, 'bot', reply);
        
        // Simular digitação natural
        await message.channel.sendTyping();
        await delay(CONFIG.RESPONSE_DELAY_MS);
        
        // Enviar resposta
        await message.reply(reply);
        
        // Atualizar timestamp
        lastMessageTime.set(userId, Date.now());
        
    } catch (error) {
        logger.error('Erro ao processar conversa:', error);
        await message.reply('Desculpe, tive um problema ao processar sua mensagem 😅');
    }
}

/**
 * Atualiza a memória de curto prazo do usuário
 * @param {string} userId - ID do usuário
 * @param {string} role - 'user' ou 'bot'
 * @param {string} content - Conteúdo da mensagem
 */
function updateShortTermMemory(userId, role, content) {
    if (!shortTermMemory.has(userId)) {
        shortTermMemory.set(userId, []);
    }
    
    const history = shortTermMemory.get(userId);
    history.push({
        role,
        content,
        timestamp: Date.now()
    });
    
    // Manter apenas as últimas N mensagens (FIFO)
    if (history.length > CONFIG.SHORT_TERM_LIMIT) {
        history.shift();
    }
}

/**
 * Limpa contexto expirado (inatividade)
 * @param {string} userId - ID do usuário
 */
function cleanExpiredContext(userId) {
    const lastTime = lastMessageTime.get(userId);
    
    if (lastTime) {
        const elapsedMinutes = (Date.now() - lastTime) / (1000 * 60);
        
        if (elapsedMinutes > CONFIG.CONTEXT_DECAY_MINUTES) {
            shortTermMemory.delete(userId);
            lastMessageTime.delete(userId);
            logger.info(`🧹 Contexto expirado para usuário ${userId}`);
        }
    }
}

/**
 * Busca mensagens relevantes na memória de longo prazo
 * @param {string} query - Consulta do usuário
 * @param {string} channelId - ID do canal
 * @returns {Promise<Array>} Mensagens similares
 */
async function findRelevantContext(query, channelId) {
    try {
        const prisma = getPrisma();
        
        if (!prisma) {
            // Banco não inicializado - retornar vazio silenciosamente
            return [];
        }
        
        // Normalizar query
        const normalizedQuery = normalizeText(query);
        
        // Gerar embedding da query
        const queryEmbedding = await generateEmbedding(normalizedQuery);
        
        // Buscar mensagens processadas no mesmo canal (ou todos se poucos)
        const messages = await prisma.chatMessage.findMany({
            where: {
                isProcessed: true,
                embedding: { not: null },
                // Opcional: filtrar por canal
                // channelId: channelId
            },
            orderBy: { timestamp: 'desc' },
            take: 500 // Limitar busca
        });
        
        if (messages.length === 0) {
            return [];
        }
        
        // Calcular similaridades
        const similar = findSimilarMessages(queryEmbedding, messages, CONFIG.MAX_SIMILAR_RESULTS);
        
        // Filtrar por threshold
        return similar.filter(s => s.similarity >= CONFIG.SIMILARITY_THRESHOLD);
        
    } catch (error) {
        // Retornar vazio silenciosamente
        return [];
    }
}

/**
 * Gera resposta baseada em contexto e heurísticas
 * @param {string} userId - ID do usuário
 * @param {string} userMessage - Mensagem do usuário
 * @param {Array} similarMessages - Mensagens similares da base
 * @returns {Promise<string>} Resposta gerada
 */
async function generateResponse(userId, userMessage, similarMessages) {
    // Obter histórico recente
    const history = shortTermMemory.get(userId) || [];
    
    // 1. Respostas baseadas em padrões simples
    const simpleResponse = getSimpleResponse(userMessage);
    if (simpleResponse) return simpleResponse;
    
    // 2. Respostas baseadas em contexto recente
    const contextResponse = getContextBasedResponse(history, userMessage);
    if (contextResponse) return contextResponse;
    
    // 3. Respostas baseadas em similaridade (memória longa)
    if (similarMessages.length > 0) {
        return getSimilarityBasedResponse(similarMessages, userMessage);
    }
    
    // 4. Resposta padrão
    return getDefaultResponse();
}

/**
 * Respostas simples baseadas em padrões
 */
function getSimpleResponse(message) {
    const lower = message.toLowerCase();
    
    // Saudações
    if (/^(oi|olá|ola|hey|e ai|eae|oie)\b/i.test(lower)) {
        return getRandomElement([
            'Olá! Como posso ajudar? 😊',
            'E aí! Tudo bem?',
            'Oi! Que bom te ver por aqui! ✨',
            'Hey! Como vai?'
        ]);
    }
    
    // Despedidas
    if (/^(tchau|até|flw|valeu|obrigado|obrigada|thanks)\b/i.test(lower)) {
        return getRandomElement([
            'Até mais! 👋',
            'Tchau! Volte sempre! ✨',
            'Valeu! Até a próxima! 🌟',
            'Foi um prazer conversar! 😊'
        ]);
    }
    
    // Como você está?
    if (/(como (você |vc |tu )?está|tudo bem|como vai)/i.test(lower)) {
        return getRandomElement([
            'Estou ótimo, obrigado por perguntar! E você? 😊',
            'Tudo certo por aqui! Como posso ajudar?',
            'Estou bem! Sempre pronto para conversar! ✨',
            'Funcionando perfeitamente! E aí, como vai?'
        ]);
    }
    
    // Qual seu nome?
    if (/(qual|quem) (é |eh )?(seu|teu) nome/i.test(lower)) {
        return 'Meu nome é MaryBot! 🤖 Prazer em conhecer você!';
    }
    
    // O que você faz?
    if (/(o que|oque) (você|vc|tu) (faz|faze|pode fazer)/i.test(lower)) {
        return 'Sou um bot de Discord! Posso conversar, ajudar com comandos de economia, dungeons e muito mais! Use `m.help` para ver todos os comandos. ✨';
    }
    
    return null;
}

/**
 * Respostas baseadas no histórico recente
 */
function getContextBasedResponse(history, currentMessage) {
    if (history.length === 0) return null;
    
    // Verificar se o usuário está continuando um tópico
    const recentMessages = history.slice(-3);
    const lower = currentMessage.toLowerCase();
    
    // Se o usuário perguntar "por quê?" ou similar, referir-se à última resposta do bot
    if (/(por que|porque|pq|why)/i.test(lower) && recentMessages.length > 0) {
        const lastBotMessage = recentMessages.reverse().find(m => m.role === 'bot');
        if (lastBotMessage) {
            return getRandomElement([
                'Hmm, boa pergunta! Deixa eu pensar melhor sobre isso... 🤔',
                'Bem, é uma questão interessante! O que você acha?',
                'Não tenho certeza... mas podemos explorar isso juntos!'
            ]);
        }
    }
    
    // Se o usuário concordar ou discordar
    if (/(concordo|exato|sim|verdade|com certeza)/i.test(lower)) {
        return getRandomElement([
            'Que bom que concordamos! 😊',
            'Exatamente! ✨',
            'Fico feliz que pensa assim também!'
        ]);
    }
    
    if (/(não|discordo|acho que não|nem)/i.test(lower)) {
        return getRandomElement([
            'Entendo seu ponto de vista! 🤔',
            'Interessante perspectiva!',
            'Cada um tem sua opinião, e tudo bem! 😊'
        ]);
    }
    
    return null;
}

/**
 * Respostas baseadas em mensagens similares
 */
function getSimilarityBasedResponse(similarMessages, userMessage) {
    const bestMatch = similarMessages[0];
    const similarity = (bestMatch.similarity * 100).toFixed(0);
    
    // Se a similaridade for muito alta (> 80%), dar uma resposta mais específica
    if (bestMatch.similarity > 0.8) {
        return getRandomElement([
            `Hmm, isso me lembra algo que vi antes... 🤔`,
            `Interessante! Já conversamos sobre algo parecido.`,
            `Boa pergunta! Acho que já vi algo assim por aqui.`
        ]);
    }
    
    // Similaridade média (60-80%)
    if (bestMatch.similarity > 0.6) {
        return getRandomElement([
            'Hmm, entendo o que você quer dizer! 💭',
            'Interessante ponto de vista!',
            'Isso é uma boa observação! ✨',
            'Compreendo! Continue...'
        ]);
    }
    
    return null;
}

/**
 * Resposta padrão quando nada mais funciona
 */
function getDefaultResponse() {
    return getRandomElement([
        'Hmm... não tenho certeza sobre isso. Pode me explicar melhor? 🤔',
        'Interessante! Conte-me mais sobre isso.',
        'Não sei muito sobre isso ainda, mas estou aprendendo! ✨',
        'Boa pergunta! Preciso pensar mais sobre isso... 💭',
        'Hmm, não tenho uma resposta clara agora. Que tal usar `m.help` para ver o que posso fazer?'
    ]);
}

/**
 * Utilitário: escolhe elemento aleatório de array
 */
function getRandomElement(array) {
    return array[Math.floor(Math.random() * array.length)];
}

/**
 * Utilitário: delay assíncrono
 */
function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Limpa memória de um usuário específico
 * @param {string} userId - ID do usuário
 */
export function forgetUser(userId) {
    shortTermMemory.delete(userId);
    lastMessageTime.delete(userId);
    logger.info(`🧹 Memória limpa para usuário ${userId}`);
}

/**
 * Obtém estatísticas da memória de curto prazo
 * @returns {Object} Estatísticas
 */
export function getMemoryStats() {
    const activeUsers = shortTermMemory.size;
    let totalMessages = 0;
    
    shortTermMemory.forEach(history => {
        totalMessages += history.length;
    });
    
    return {
        activeUsers,
        totalMessages,
        averageMessagesPerUser: activeUsers > 0 ? (totalMessages / activeUsers).toFixed(2) : 0
    };
}

/**
 * Limpa toda a memória de curto prazo
 */
export function clearAllMemory() {
    const count = shortTermMemory.size;
    shortTermMemory.clear();
    lastMessageTime.clear();
    logger.info(`🧹 Memória limpa: ${count} usuários`);
    return count;
}
