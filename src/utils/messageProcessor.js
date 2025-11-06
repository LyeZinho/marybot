/**
 * @file messageProcessor.js
 * @description Utilitários para processamento e filtragem de mensagens do sistema de aprendizado
 */

/**
 * Normaliza o texto da mensagem para armazenamento
 * @param {string} content - Conteúdo da mensagem
 * @returns {string} Texto normalizado
 */
function normalizeText(content) {
    if (!content) return '';
    
    return content
        .toLowerCase()
        .replace(/<@!?\d+>/g, '@user') // Substituir menções por @user
        .replace(/<#\d+>/g, '#channel') // Substituir menções de canal
        .replace(/<:\w+:\d+>/g, '') // Remover emojis customizados
        .replace(/https?:\/\/[^\s]+/g, '[link]') // Substituir links
        .replace(/[^\w\s@#\[\]]/g, '') // Remover caracteres especiais (manter @, #, [])
        .replace(/\s+/g, ' ') // Normalizar espaços
        .trim();
}

/**
 * Verifica se a mensagem deve ser armazenada
 * @param {Object} message - Mensagem do Discord
 * @returns {boolean} True se deve armazenar
 */
function shouldStoreMessage(message) {
    // Ignorar bots
    if (message.author.bot) return false;
    
    // Ignorar comandos (com prefixo m.)
    if (message.content.startsWith('m.')) return false;
    
    // Ignorar mensagens muito curtas (menos de 3 palavras)
    const words = message.content.trim().split(/\s+/);
    if (words.length < 3) return false;
    
    // Ignorar mensagens muito longas (mais de 500 caracteres)
    if (message.content.length > 500) return false;
    
    // Ignorar mensagens que são só links ou menções
    const normalized = normalizeText(message.content);
    if (normalized.length < 10) return false;
    
    // Ignorar spam (mensagens repetitivas - mais de 50% caracteres repetidos)
    const charSet = new Set(message.content.toLowerCase().replace(/\s/g, ''));
    if (charSet.size < message.content.length * 0.5) return false;
    
    return true;
}

/**
 * Extrai metadados relevantes da mensagem
 * @param {Object} message - Mensagem do Discord
 * @returns {Object} Metadados estruturados
 */
function extractMetadata(message) {
    const mentions = {
        users: message.mentions.users.size,
        roles: message.mentions.roles.size,
        channels: message.mentions.channels.size
    };
    
    const hasAttachments = message.attachments.size > 0;
    const hasEmbeds = message.embeds.length > 0;
    const hasReactions = message.reactions.cache.size > 0;
    
    const wordCount = message.content.trim().split(/\s+/).length;
    const charCount = message.content.length;
    
    return {
        mentions,
        hasAttachments,
        hasEmbeds,
        hasReactions,
        wordCount,
        charCount,
        isReply: message.reference !== null,
        timestamp: message.createdTimestamp
    };
}

/**
 * Cria uma representação compacta da mensagem para embeddings
 * @param {Object} message - Mensagem do Discord
 * @param {string} normalizedContent - Conteúdo normalizado
 * @returns {string} Texto para embedding
 */
function prepareForEmbedding(message, normalizedContent) {
    // Se for resposta, incluir contexto (simplificado)
    let text = normalizedContent;
    
    // Adicionar contexto do canal (apenas nome)
    const channelContext = `[${message.channel.name}]`;
    
    return `${channelContext} ${text}`;
}

export {
    normalizeText,
    shouldStoreMessage,
    extractMetadata,
    prepareForEmbedding
};
