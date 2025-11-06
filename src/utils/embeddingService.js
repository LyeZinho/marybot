/**
 * @file embeddingService.js
 * @description Serviço para geração e gerenciamento de embeddings de texto
 * 
 * NOTA: Este arquivo implementa uma estrutura básica para embeddings.
 * Para produção, considere:
 * 1. Microserviço Python com all-MiniLM-L6-v2 (384 dims) ou paraphrase-MiniLM-L3-v2 (384 dims)
 * 2. API externa como OpenAI Embeddings ou Cohere
 * 3. Biblioteca Node.js como @xenova/transformers (mais pesado)
 */

import crypto from 'crypto';

// Cache de embeddings em memória (máximo 500)
const embeddingCache = new Map();
const MAX_CACHE_SIZE = 500;

/**
 * Gera um embedding simples usando hash (TEMPORÁRIO - substituir por modelo real)
 * @param {string} text - Texto para gerar embedding
 * @returns {Promise<Array<number>>} Vetor de embedding (384 dimensões)
 */
async function generateSimpleEmbedding(text) {
    // AVISO: Esta é uma implementação TEMPORÁRIA apenas para testes
    // Substitua por um modelo real de embeddings em produção
    
    const hash = crypto.createHash('sha256').update(text).digest();
    const embedding = new Array(384).fill(0);
    
    // Distribuir valores do hash ao longo do vetor
    for (let i = 0; i < 384; i++) {
        const byteIndex = i % hash.length;
        embedding[i] = (hash[byteIndex] / 255) * 2 - 1; // Normalizar entre -1 e 1
    }
    
    return embedding;
}

/**
 * Gera embedding para texto com cache
 * @param {string} text - Texto para gerar embedding
 * @param {string} messageId - ID da mensagem (para cache)
 * @returns {Promise<Array<number>>} Vetor de embedding
 */
async function generateEmbedding(text, messageId = null) {
    // Verificar cache
    if (messageId && embeddingCache.has(messageId)) {
        return embeddingCache.get(messageId);
    }
    
    // Gerar embedding
    const embedding = await generateSimpleEmbedding(text);
    
    // Armazenar no cache (FIFO)
    if (messageId) {
        if (embeddingCache.size >= MAX_CACHE_SIZE) {
            const firstKey = embeddingCache.keys().next().value;
            embeddingCache.delete(firstKey);
        }
        embeddingCache.set(messageId, embedding);
    }
    
    return embedding;
}

/**
 * Calcula similaridade de cosseno entre dois vetores
 * @param {Array<number>} vecA - Vetor A
 * @param {Array<number>} vecB - Vetor B
 * @returns {number} Similaridade (0-1)
 */
function cosineSimilarity(vecA, vecB) {
    if (vecA.length !== vecB.length) {
        throw new Error('Vetores devem ter o mesmo tamanho');
    }
    
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    
    for (let i = 0; i < vecA.length; i++) {
        dotProduct += vecA[i] * vecB[i];
        normA += vecA[i] * vecA[i];
        normB += vecB[i] * vecB[i];
    }
    
    normA = Math.sqrt(normA);
    normB = Math.sqrt(normB);
    
    if (normA === 0 || normB === 0) return 0;
    
    return dotProduct / (normA * normB);
}

/**
 * Busca mensagens similares usando embeddings
 * @param {Array<number>} queryEmbedding - Embedding da consulta
 * @param {Array<Object>} messages - Mensagens com embeddings
 * @param {number} topK - Número de resultados
 * @returns {Array<Object>} Mensagens mais similares
 */
function findSimilarMessages(queryEmbedding, messages, topK = 5) {
    const results = messages
        .filter(msg => msg.embedding && msg.embedding.length > 0)
        .map(msg => ({
            message: msg,
            similarity: cosineSimilarity(queryEmbedding, msg.embedding)
        }))
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, topK);
    
    return results;
}

/**
 * Limpa o cache de embeddings
 */
function clearCache() {
    embeddingCache.clear();
}

/**
 * Obtém estatísticas do cache
 * @returns {Object} Estatísticas
 */
function getCacheStats() {
    return {
        size: embeddingCache.size,
        maxSize: MAX_CACHE_SIZE,
        usage: (embeddingCache.size / MAX_CACHE_SIZE * 100).toFixed(2) + '%'
    };
}

export {
    generateEmbedding,
    cosineSimilarity,
    findSimilarMessages,
    clearCache,
    getCacheStats
};
