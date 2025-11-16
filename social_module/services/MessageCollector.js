/**
 * 📨 Message Collector
 * Serviço responsável por capturar e armazenar mensagens dos usuários
 */

import { getSocialDB } from '../database/socialDB.js';

export default class MessageCollector {
    constructor() {
        this.db = null;
        this.preparedStatements = {};
        this.init();
    }

    /**
     * Inicializa o collector
     */
    init() {
        try {
            this.db = getSocialDB();
            this.prepareSQLStatements();
        } catch (error) {
            console.error('❌ Erro ao inicializar MessageCollector:', error);
        }
    }

    /**
     * Prepara statements SQL para melhor performance
     */
    prepareSQLStatements() {
        // Insert/Update user
        this.preparedStatements.upsertUser = this.db.prepare(`
            INSERT OR REPLACE INTO users (
                user_id, username, display_name, last_seen, message_count,
                first_seen, personality_traits, interests, communication_style,
                created_at, updated_at
            ) VALUES (
                ?, ?, ?, CURRENT_TIMESTAMP, 
                COALESCE((SELECT message_count FROM users WHERE user_id = ?) + 1, 1),
                COALESCE((SELECT first_seen FROM users WHERE user_id = ?), CURRENT_TIMESTAMP),
                COALESCE((SELECT personality_traits FROM users WHERE user_id = ?), '{}'),
                COALESCE((SELECT interests FROM users WHERE user_id = ?), '{}'),
                COALESCE((SELECT communication_style FROM users WHERE user_id = ?), 'neutral'),
                COALESCE((SELECT created_at FROM users WHERE user_id = ?), CURRENT_TIMESTAMP),
                CURRENT_TIMESTAMP
            )
        `);

        // Insert message
        this.preparedStatements.insertMessage = this.db.prepare(`
            INSERT INTO messages (
                message_id, user_id, guild_id, channel_id, content,
                is_mention, is_reply, reply_to_message_id, timestamp,
                sentiment_score, emotion_category, content_length, has_attachments
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        // Update or insert topic
        this.preparedStatements.upsertTopic = this.db.prepare(`
            INSERT OR REPLACE INTO topics (
                keyword, user_id, guild_id, frequency, last_mentioned, created_at
            ) VALUES (
                ?, ?, ?, 
                COALESCE((SELECT frequency FROM topics WHERE keyword = ? AND user_id = ? AND guild_id = ?) + 1, 1),
                CURRENT_TIMESTAMP,
                COALESCE((SELECT created_at FROM topics WHERE keyword = ? AND user_id = ? AND guild_id = ?), CURRENT_TIMESTAMP)
            )
        `);
    }

    /**
     * Coleta uma mensagem do Discord
     * @param {Object} message - Objeto da mensagem do Discord
     */
    async collect(message) {
        try {
            // Ignorar bots (exceto o próprio bot para análise de interações)
            if (message.author.bot && message.author.id !== message.client.user.id) {
                return;
            }

            // Ignorar mensagens vazias ou muito curtas
            if (!message.content || message.content.length < 2) {
                return;
            }

            const messageData = this.extractMessageData(message);
            
            // Verificar se é um novo usuário para criar perfil inteligente
            const isNewUser = await this.checkIfNewUser(messageData.userId);
            
            // Usar transação para garantir consistência
            const transaction = this.db.transaction(() => {
                // Para novos usuários, criar perfil baseado na primeira mensagem
                if (isNewUser) {
                    this.createSmartProfile(messageData);
                } else {
                    // Atualizar/inserir usuário existente
                    this.preparedStatements.upsertUser.run(
                        messageData.userId, messageData.username, messageData.displayName,
                        messageData.userId, messageData.userId, messageData.userId,
                        messageData.userId, messageData.userId, messageData.userId
                    );
                }

                // Inserir mensagem
                this.preparedStatements.insertMessage.run(
                    messageData.messageId, messageData.userId, messageData.guildId,
                    messageData.channelId, messageData.content, messageData.isMention,
                    messageData.isReply, messageData.replyToMessageId, messageData.timestamp,
                    messageData.sentimentScore, messageData.emotionCategory,
                    messageData.contentLength, messageData.hasAttachments
                );

                // Extrair e armazenar tópicos/keywords
                const keywords = this.extractKeywords(messageData.content);
                for (const keyword of keywords) {
                    this.preparedStatements.upsertTopic.run(
                        keyword, messageData.userId, messageData.guildId,
                        keyword, messageData.userId, messageData.guildId,
                        keyword, messageData.userId, messageData.guildId
                    );
                }
            });

            transaction();

        } catch (error) {
            console.error('❌ Erro ao coletar mensagem:', error);
        }
    }

    /**
     * Verifica se é um usuário novo
     */
    async checkIfNewUser(userId) {
        try {
            const existing = this.db.prepare('SELECT user_id FROM users WHERE user_id = ?').get(userId);
            return !existing;
        } catch (error) {
            return true; // Em caso de erro, considerar como novo
        }
    }

    /**
     * Cria perfil inteligente para novo usuário baseado na primeira mensagem
     */
    createSmartProfile(messageData) {
        try {
            // Analisar o conteúdo para detectar tipo de usuário
            const content = messageData.content.toLowerCase();
            let userType = 'casual'; // padrão
            let interests = ['bot', 'comandos'];
            let traits = {
                humor_level: 0.5,
                formality: 0.5,
                emoji_usage: /[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/u.test(messageData.content) ? 0.7 : 0.3,
                technical_interest: 0.3
            };

            // Detectar padrões técnicos
            if (content.match(/código|programação|dev|javascript|python|api|github|git/)) {
                userType = 'technical';
                interests = ['programação', 'código', 'desenvolvimento', 'tecnologia'];
                traits.technical_interest = 0.9;
                traits.formality = 0.7;
                traits.emoji_usage = 0.2;
            }
            // Detectar padrões casuais/gaming
            else if (content.match(/jogo|game|anime|música|meme|diversão|legal|massa/)) {
                userType = 'casual';
                interests = ['jogos', 'anime', 'música', 'diversão'];
                traits.humor_level = 0.8;
                traits.formality = 0.2;
                traits.emoji_usage = 0.8;
            }
            // Detectar padrões formais/administração
            else if (content.match(/servidor|moderação|admin|regras|comunidade|organização/)) {
                userType = 'admin';
                interests = ['moderação', 'administração', 'comunidade', 'organização'];
                traits.formality = 0.8;
                traits.humor_level = 0.4;
            }

            // Inserir usuário com perfil inteligente
            const insertSmartUser = this.db.prepare(`
                INSERT INTO users (
                    user_id, username, display_name, message_count,
                    personality_traits, interests, communication_style,
                    first_seen, last_seen, created_at, updated_at
                ) VALUES (?, ?, ?, 1, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
            `);

            insertSmartUser.run(
                messageData.userId,
                messageData.username,
                messageData.displayName,
                JSON.stringify(traits),
                JSON.stringify(interests),
                userType
            );

            console.log(`🧠 Perfil inteligente criado para usuário: ${userType}`);

        } catch (error) {
            console.error('❌ Erro ao criar perfil inteligente:', error);
            // Fallback para upsert normal
            this.preparedStatements.upsertUser.run(
                messageData.userId, messageData.username, messageData.displayName,
                messageData.userId, messageData.userId, messageData.userId,
                messageData.userId, messageData.userId, messageData.userId
            );
        }
    }

    /**
     * Extrai dados estruturados da mensagem
     * @param {Object} message - Mensagem do Discord
     * @returns {Object} Dados estruturados
     */
    extractMessageData(message) {
        return {
            messageId: message.id,
            userId: message.author.id,
            username: message.author.username,
            displayName: message.author.displayName || message.author.username,
            guildId: message.guild?.id || 'DM',
            channelId: message.channel.id,
            content: this.sanitizeContent(message.content),
            isMention: message.mentions.users.size > 0 ? 1 : 0,
            isReply: message.reference?.messageId ? 1 : 0,
            replyToMessageId: message.reference?.messageId || null,
            timestamp: message.createdAt.toISOString(),
            sentimentScore: this.calculateBasicSentiment(message.content),
            emotionCategory: this.detectEmotion(message.content),
            contentLength: message.content.length,
            hasAttachments: message.attachments.size > 0 ? 1 : 0
        };
    }

    /**
     * Sanitiza o conteúdo da mensagem
     * @param {string} content - Conteúdo original
     * @returns {string} Conteúdo sanitizado
     */
    sanitizeContent(content) {
        // Remove conteúdo sensível, mas mantém estrutura
        return content
            .replace(/@everyone|@here/g, '[mention]') // Remove mentions perigosas
            .replace(/<@!?\d+>/g, '[user]') // Substitui mentions por placeholder
            .replace(/<#\d+>/g, '[channel]') // Substitui channel mentions
            .replace(/https?:\/\/[^\s]+/g, '[link]') // Remove links
            .trim()
            .substring(0, 2000); // Limita tamanho
    }

    /**
     * Calcula sentimento básico da mensagem
     * @param {string} content - Conteúdo da mensagem
     * @returns {number} Score de -1 a 1
     */
    calculateBasicSentiment(content) {
        const positiveWords = [
            'obrigado', 'obrigada', 'valeu', 'legal', 'bom', 'ótimo', 'excelente',
            'perfeito', 'incrível', 'massa', 'top', 'show', 'feliz', 'amor',
            'gostar', 'curtir', 'adorar', '😊', '😄', '😍', '❤️', '👍', '🎉'
        ];

        const negativeWords = [
            'ruim', 'péssimo', 'horrível', 'ódio', 'odiar', 'triste', 'chato',
            'irritante', 'problema', 'erro', 'bug', 'merda', 'droga', 'raiva',
            'irritado', 'nervoso', '😢', '😭', '😡', '😠', '💔', '👎'
        ];

        const lowerContent = content.toLowerCase();
        let score = 0;
        
        positiveWords.forEach(word => {
            if (lowerContent.includes(word)) score += 0.1;
        });
        
        negativeWords.forEach(word => {
            if (lowerContent.includes(word)) score -= 0.1;
        });
        
        return Math.max(-1, Math.min(1, score));
    }

    /**
     * Detecta emoção básica
     * @param {string} content - Conteúdo da mensagem
     * @returns {string} Categoria de emoção
     */
    detectEmotion(content) {
        const lowerContent = content.toLowerCase();
        
        if (lowerContent.match(/ha+h+a+|kk+|rsrs|kkk|😂|🤣|😄|😆/)) return 'happy';
        if (lowerContent.match(/triste|😢|😭|💔|😞|😔/)) return 'sad';
        if (lowerContent.match(/raiva|😡|😠|irritado|puto|ódio/)) return 'angry';
        if (lowerContent.match(/medo|😰|😱|assustado|preocupado/)) return 'fear';
        if (lowerContent.match(/surpres|😮|😲|😯|nossa|caramba/)) return 'surprise';
        if (lowerContent.match(/amor|❤️|😍|😘|paixão|amo/)) return 'love';
        
        return 'neutral';
    }

    /**
     * Extrai palavras-chave/tópicos da mensagem
     * @param {string} content - Conteúdo da mensagem
     * @returns {Array} Array de keywords
     */
    extractKeywords(content) {
        // Remove caracteres especiais e divide em palavras
        const words = content
            .toLowerCase()
            .replace(/[^\w\sáàâãéêíóôõúç]/g, '')
            .split(/\s+/)
            .filter(word => word.length >= 3); // Palavras de 3+ caracteres

        // Lista de stopwords em português
        const stopWords = new Set([
            'que', 'não', 'uma', 'com', 'para', 'por', 'mais', 'dos', 'das',
            'como', 'mas', 'foi', 'ele', 'ela', 'seu', 'sua', 'isso', 'ser',
            'ter', 'você', 'vocês', 'eles', 'elas', 'tem', 'são', 'está',
            'estava', 'esse', 'essa', 'isso', 'aqui', 'aquela', 'quando',
            'onde', 'porque', 'então', 'ainda', 'bem', 'muito', 'todo',
            'toda', 'pode', 'fazer', 'vai', 'vou', 'vamos', 'está', 'acho',
            'sei', 'sabe', 'tipo', 'cara', 'coisa', 'mesmo', 'assim'
        ]);

        // Filtrar stopwords e palavras muito comuns
        const keywords = words
            .filter(word => !stopWords.has(word))
            .filter(word => word.length >= 3)
            .slice(0, 10); // Máximo 10 keywords por mensagem

        return [...new Set(keywords)]; // Remove duplicadas
    }
}