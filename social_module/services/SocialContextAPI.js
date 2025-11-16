/**
 * 🧠 Social Context API
 * Serviço para recuperar contexto conversacional para uso em prompts de IA
 */

import { getSocialDB } from '../database/socialDB.js';

export default class SocialContextAPI {
    constructor() {
        this.db = null;
        this.preparedStatements = {};
        this.init();
    }

    /**
     * Inicializa a API
     */
    init() {
        try {
            this.db = getSocialDB();
            this.prepareSQLStatements();
        } catch (error) {
            console.error('❌ Erro ao inicializar SocialContextAPI:', error);
        }
    }

    /**
     * Prepara statements SQL otimizados
     */
    prepareSQLStatements() {
        // Obter mensagens recentes do usuário
        this.preparedStatements.getUserRecentMessages = this.db.prepare(`
            SELECT content, timestamp, is_mention, emotion_category, sentiment_score
            FROM messages 
            WHERE user_id = ? AND guild_id = ?
            ORDER BY timestamp DESC 
            LIMIT ?
        `);

        // Obter perfil do usuário
        this.preparedStatements.getUserProfile = this.db.prepare(`
            SELECT * FROM users WHERE user_id = ?
        `);

        // Obter tópicos de interesse do usuário
        this.preparedStatements.getUserTopics = this.db.prepare(`
            SELECT keyword, frequency, last_mentioned
            FROM topics 
            WHERE user_id = ? AND guild_id = ?
            ORDER BY frequency DESC, last_mentioned DESC
            LIMIT 10
        `);

        // Obter estatísticas de conversa
        this.preparedStatements.getConversationStats = this.db.prepare(`
            SELECT 
                COUNT(*) as total_messages,
                AVG(sentiment_score) as avg_sentiment,
                MAX(timestamp) as last_message_time,
                COUNT(CASE WHEN is_mention = 1 THEN 1 END) as mention_count
            FROM messages 
            WHERE user_id = ? AND guild_id = ?
            AND datetime(timestamp) >= datetime('now', '-7 days')
        `);

        // Obter mensagens com contexto emocional
        this.preparedStatements.getEmotionalContext = this.db.prepare(`
            SELECT emotion_category, COUNT(*) as count
            FROM messages 
            WHERE user_id = ? AND guild_id = ?
            AND datetime(timestamp) >= datetime('now', '-3 days')
            AND emotion_category != 'neutral'
            GROUP BY emotion_category
            ORDER BY count DESC
        `);

        // Obter conversa recente (thread)
        this.preparedStatements.getRecentConversation = this.db.prepare(`
            SELECT 
                m1.content as user_message,
                m1.timestamp as user_timestamp,
                m2.content as bot_response,
                m2.timestamp as bot_timestamp,
                m1.emotion_category,
                m1.sentiment_score
            FROM messages m1
            LEFT JOIN messages m2 ON (
                m2.timestamp > m1.timestamp 
                AND m2.user_id = ? -- bot user id
                AND m2.guild_id = m1.guild_id
                AND m2.channel_id = m1.channel_id
                AND datetime(m2.timestamp) <= datetime(m1.timestamp, '+5 minutes')
            )
            WHERE m1.user_id = ? AND m1.guild_id = ?
            AND datetime(m1.timestamp) >= datetime('now', '-1 hour')
            ORDER BY m1.timestamp DESC
            LIMIT 5
        `);
    }

    /**
     * Obtém contexto completo para IA
     * @param {string} userId - ID do usuário
     * @param {string} guildId - ID do servidor
     * @param {number} messageLimit - Limite de mensagens
     * @returns {Object} Contexto estruturado
     */
    async getContext(userId, guildId, messageLimit = 10) {
        try {
            const [
                userProfile,
                recentMessages,
                userTopics,
                conversationStats,
                emotionalContext,
                recentConversation
            ] = await Promise.all([
                this.getUserProfile(userId),
                this.getRecentMessages(userId, guildId, messageLimit),
                this.getUserTopics(userId, guildId),
                this.getConversationStats(userId, guildId),
                this.getEmotionalContext(userId, guildId),
                this.getRecentConversation(userId, guildId)
            ]);

            return {
                userProfile,
                recentMessages,
                userTopics,
                conversationStats,
                emotionalContext,
                recentConversation,
                contextSummary: this.generateContextSummary({
                    userProfile,
                    conversationStats,
                    emotionalContext,
                    userTopics
                })
            };

        } catch (error) {
            console.error('❌ Erro ao obter contexto:', error);
            return {
                userProfile: null,
                recentMessages: [],
                userTopics: [],
                conversationStats: null,
                emotionalContext: [],
                recentConversation: [],
                contextSummary: null
            };
        }
    }

    /**
     * Obtém perfil do usuário
     * @param {string} userId - ID do usuário
     * @returns {Object} Perfil do usuário
     */
    async getUserProfile(userId) {
        try {
            const profile = this.preparedStatements.getUserProfile.get(userId);
            
            if (profile) {
                // Parse JSON fields
                profile.personality_traits = this.safeJsonParse(profile.personality_traits);
                profile.interests = this.safeJsonParse(profile.interests);
            }
            
            return profile;
        } catch (error) {
            console.error('❌ Erro ao obter perfil:', error);
            return null;
        }
    }

    /**
     * Obtém mensagens recentes do usuário
     */
    async getRecentMessages(userId, guildId, limit) {
        try {
            return this.preparedStatements.getUserRecentMessages.all(userId, guildId, limit);
        } catch (error) {
            console.error('❌ Erro ao obter mensagens recentes:', error);
            return [];
        }
    }

    /**
     * Obtém tópicos de interesse do usuário
     */
    async getUserTopics(userId, guildId) {
        try {
            return this.preparedStatements.getUserTopics.all(userId, guildId);
        } catch (error) {
            console.error('❌ Erro ao obter tópicos:', error);
            return [];
        }
    }

    /**
     * Obtém estatísticas de conversa
     */
    async getConversationStats(userId, guildId) {
        try {
            return this.preparedStatements.getConversationStats.get(userId, guildId);
        } catch (error) {
            console.error('❌ Erro ao obter estatísticas:', error);
            return null;
        }
    }

    /**
     * Obtém contexto emocional
     */
    async getEmotionalContext(userId, guildId) {
        try {
            return this.preparedStatements.getEmotionalContext.all(userId, guildId);
        } catch (error) {
            console.error('❌ Erro ao obter contexto emocional:', error);
            return [];
        }
    }

    /**
     * Obtém conversa recente (thread de interações)
     */
    async getRecentConversation(userId, guildId, botUserId = null) {
        try {
            return this.preparedStatements.getRecentConversation.all(
                botUserId || 'bot', 
                userId, 
                guildId
            );
        } catch (error) {
            console.error('❌ Erro ao obter conversa recente:', error);
            return [];
        }
    }

    /**
     * Gera resumo do contexto para IA
     * @param {Object} contextData - Dados do contexto
     * @returns {string} Resumo estruturado
     */
    generateContextSummary(contextData) {
        try {
            const { userProfile, conversationStats, emotionalContext, userTopics, recentMessages } = contextData;
            
            if (!userProfile) {
                return 'Usuário novo sem histórico disponível.';
            }

            const summary = [];
            
            // Informações básicas do usuário
            summary.push(`PERFIL: ${userProfile.display_name || userProfile.username}`);
            summary.push(`Estilo: ${this.translateCommunicationStyle(userProfile.communication_style)}`);
            
            // Personalidade (se disponível)
            if (userProfile.personality_traits) {
                const traits = this.safeJsonParse(userProfile.personality_traits);
                const personality = [];
                
                if (traits.humor_level > 0.7) personality.push('bem-humorado');
                if (traits.formality > 0.7) personality.push('formal');
                if (traits.emoji_usage > 0.7) personality.push('usa muitos emojis');
                if (traits.technical_interest > 0.7) personality.push('interesse técnico');
                
                if (personality.length > 0) {
                    summary.push(`Personalidade: ${personality.join(', ')}`);
                }
            }
            
            // Experiência com o bot
            if (conversationStats && conversationStats.total_messages > 0) {
                summary.push(`Atividade: ${conversationStats.total_messages} mensagens esta semana`);
                summary.push(`Interações com bot: ${conversationStats.mention_count} menções`);
                
                // Estado emocional recente
                if (emotionalContext && emotionalContext.length > 0) {
                    const emotion = emotionalContext[0];
                    summary.push(`Humor recente: ${this.translateEmotion(emotion.emotion_category)}`);
                }
            }
            
            // Tópicos de interesse
            if (userTopics && userTopics.length > 0) {
                const interests = userTopics.slice(0, 4).map(t => t.keyword).join(', ');
                summary.push(`Interesses: ${interests}`);
            }
            
            // Contexto da conversa atual
            if (recentMessages && recentMessages.length > 0) {
                const recentTopics = recentMessages
                    .map(msg => this.extractMainTopic(msg.content))
                    .filter(topic => topic)
                    .slice(0, 2);
                    
                if (recentTopics.length > 0) {
                    summary.push(`Conversando sobre: ${recentTopics.join(', ')}`);
                }
            }
            
            return summary.join(' | ');
            
        } catch (error) {
            console.error('❌ Erro ao gerar resumo:', error);
            return 'Contexto limitado disponível.';
        }
    }

    /**
     * Extrai tópico principal de uma mensagem
     */
    extractMainTopic(content) {
        const lowerContent = content.toLowerCase();
        
        // Tópicos técnicos
        if (lowerContent.match(/bot|comando|código|programação|desenvolvimento/)) return 'tecnologia';
        if (lowerContent.match(/jogo|game|jogar/)) return 'jogos';
        if (lowerContent.match(/anime|manga/)) return 'anime';
        if (lowerContent.match(/música|som|audio/)) return 'música';
        if (lowerContent.match(/problema|erro|bug|ajuda/)) return 'suporte';
        if (lowerContent.match(/economia|moeda|dinheiro/)) return 'economia';
        if (lowerContent.match(/dungeon|aventura|explorar/)) return 'dungeons';
        
        return null;
    }

    /**
     * Traduz estilo de comunicação
     */
    translateCommunicationStyle(style) {
        const styles = {
            'casual': 'descontraído',
            'technical': 'técnico',
            'formal': 'formal',
            'admin': 'administrativo',
            'neutral': 'neutro'
        };
        return styles[style] || 'neutro';
    }

    /**
     * Traduz categoria de emoção
     */
    translateEmotion(emotion) {
        const emotions = {
            'happy': 'alegre',
            'sad': 'triste',
            'angry': 'irritado',
            'love': 'afetuoso',
            'fear': 'preocupado',
            'surprise': 'surpreso',
            'analytical': 'analítico',
            'curious': 'curioso',
            'concerned': 'preocupado',
            'proud': 'orgulhoso',
            'neutral': 'neutro'
        };
        return emotions[emotion] || emotion;
    }

    /**
     * Formata contexto para prompt de IA
     * @param {Object} context - Contexto completo
     * @returns {string} Contexto formatado para IA
     */
    formatForAIPrompt(context) {
        if (!context || !context.userProfile) {
            return 'Nenhum contexto histórico disponível para este usuário.';
        }

        const parts = [];
        
        // Resumo do usuário
        if (context.contextSummary) {
            parts.push(`PERFIL DO USUÁRIO:\n${context.contextSummary}`);
        }
        
        // Mensagens recentes
        if (context.recentMessages.length > 0) {
            parts.push('\nMENSAGENS RECENTES:');
            context.recentMessages.forEach((msg, i) => {
                const timeAgo = this.getTimeAgo(msg.timestamp);
                parts.push(`${i + 1}. [${timeAgo}] ${msg.content} (${msg.emotion_category})`);
            });
        }
        
        // Conversa recente com bot
        if (context.recentConversation.length > 0) {
            parts.push('\nINTERAÇÕES RECENTES COM BOT:');
            context.recentConversation.forEach((conv, i) => {
                if (conv.user_message && conv.bot_response) {
                    parts.push(`${i + 1}. Usuário: ${conv.user_message}`);
                    parts.push(`   Bot: ${conv.bot_response}`);
                }
            });
        }
        
        return parts.join('\n');
    }

    /**
     * Utilitários
     */
    safeJsonParse(jsonString) {
        try {
            return jsonString ? JSON.parse(jsonString) : {};
        } catch {
            return {};
        }
    }

    formatDate(dateString) {
        try {
            return new Date(dateString).toLocaleDateString('pt-BR');
        } catch {
            return 'Data inválida';
        }
    }

    formatSentiment(score) {
        if (score === null || score === undefined) return 'neutro';
        if (score > 0.3) return 'positivo';
        if (score < -0.3) return 'negativo';
        return 'neutro';
    }

    getTimeAgo(timestamp) {
        try {
            const now = new Date();
            const messageTime = new Date(timestamp);
            const diffMs = now - messageTime;
            const diffMins = Math.floor(diffMs / (1000 * 60));
            
            if (diffMins < 60) return `${diffMins}min`;
            const diffHours = Math.floor(diffMins / 60);
            if (diffHours < 24) return `${diffHours}h`;
            const diffDays = Math.floor(diffHours / 24);
            return `${diffDays}d`;
        } catch {
            return 'agora';
        }
    }
}