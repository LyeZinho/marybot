/**
 * 🌱 Seed de Dados Iniciais - Módulo Social
 * Cria histórico inicial de interações para melhorar contexto da IA
 */

import { getSocialDB } from './socialDB.js';

// Dados iniciais para usuários comuns
const INITIAL_SEED_DATA = {
    // Perfis de usuário genéricos baseados em padrões comuns
    userProfiles: [
        {
            user_id: 'seed_user_casual',
            username: 'UsuárioCasual',
            display_name: 'Usuário Casual',
            message_count: 45,
            personality_traits: JSON.stringify({
                humor_level: 0.7,
                formality: 0.3,
                emoji_usage: 0.8,
                technical_interest: 0.4
            }),
            interests: JSON.stringify([
                'jogos', 'música', 'filmes', 'memes', 'anime'
            ]),
            communication_style: 'casual',
            first_seen: '2025-11-01T10:00:00Z',
            last_seen: '2025-11-15T20:00:00Z'
        },
        {
            user_id: 'seed_user_tech',
            username: 'DevTechnical',
            display_name: 'Dev Technical',
            message_count: 78,
            personality_traits: JSON.stringify({
                humor_level: 0.5,
                formality: 0.7,
                emoji_usage: 0.2,
                technical_interest: 0.9
            }),
            interests: JSON.stringify([
                'programação', 'javascript', 'python', 'bot', 'desenvolvimento'
            ]),
            communication_style: 'technical',
            first_seen: '2025-10-20T14:00:00Z',
            last_seen: '2025-11-15T18:30:00Z'
        }
    ],

    // Mensagens de exemplo que criam contexto conversacional
    initialMessages: [
        // Conversas casuais
        {
            message_id: 'seed_msg_001',
            user_id: 'seed_user_casual',
            guild_id: 'SEED_GUILD',
            channel_id: 'general',
            content: 'Oi pessoal! Alguém sabe como usar os comandos do bot?',
            sentiment_score: 0.2,
            emotion_category: 'curious',
            timestamp: '2025-11-01T10:15:00Z'
        },
        {
            message_id: 'seed_msg_002',
            user_id: 'seed_user_casual',
            guild_id: 'SEED_GUILD',
            channel_id: 'general',
            content: 'Adorei o sistema de economia! Já consegui 500 moedas 😄',
            sentiment_score: 0.8,
            emotion_category: 'happy',
            timestamp: '2025-11-03T16:20:00Z'
        },
        {
            message_id: 'seed_msg_003',
            user_id: 'seed_user_casual',
            guild_id: 'SEED_GUILD',
            channel_id: 'general',
            content: 'O bot está com problema? Não está respondendo direito',
            sentiment_score: -0.3,
            emotion_category: 'concerned',
            timestamp: '2025-11-05T14:45:00Z'
        },

        // Conversas técnicas
        {
            message_id: 'seed_msg_004',
            user_id: 'seed_user_tech',
            guild_id: 'SEED_GUILD',
            channel_id: 'dev-chat',
            content: 'O código do bot está usando Discord.js v14? Preciso verificar algumas implementações',
            sentiment_score: 0.1,
            emotion_category: 'analytical',
            timestamp: '2025-10-25T09:30:00Z'
        },
        {
            message_id: 'seed_msg_005',
            user_id: 'seed_user_tech',
            guild_id: 'SEED_GUILD',
            channel_id: 'dev-chat',
            content: 'Implementei uma nova feature de cache para melhorar performance',
            sentiment_score: 0.6,
            emotion_category: 'proud',
            timestamp: '2025-11-10T13:15:00Z'
        },
        {
            message_id: 'seed_msg_006',
            user_id: 'seed_user_tech',
            guild_id: 'SEED_GUILD',
            channel_id: 'dev-chat',
            content: 'Alguém pode revisar este pull request quando tiver tempo?',
            sentiment_score: 0.0,
            emotion_category: 'neutral',
            timestamp: '2025-11-12T11:40:00Z'
        },

        // Interações com o bot
        {
            message_id: 'seed_msg_007',
            user_id: 'seed_user_casual',
            guild_id: 'SEED_GUILD',
            channel_id: 'bot-commands',
            content: '[user] como funciona o sistema de dungeon?',
            is_mention: 1,
            sentiment_score: 0.3,
            emotion_category: 'curious',
            timestamp: '2025-11-08T19:20:00Z'
        },
        {
            message_id: 'seed_msg_008',
            user_id: 'seed_user_tech',
            guild_id: 'SEED_GUILD',
            channel_id: 'bot-commands',
            content: '[user] qual é a arquitetura do sistema de IA?',
            is_mention: 1,
            sentiment_score: 0.2,
            emotion_category: 'analytical',
            timestamp: '2025-11-14T15:10:00Z'
        },

        // Conversas sobre matemática e perguntas básicas
        {
            message_id: 'seed_msg_009',
            user_id: 'seed_user_casual',
            guild_id: 'SEED_GUILD',
            channel_id: 'general',
            content: 'Quanto é 2 + 2? Sempre esqueço essas contas 😅',
            sentiment_score: 0.3,
            emotion_category: 'playful',
            timestamp: '2025-11-11T14:20:00Z'
        },
        {
            message_id: 'seed_msg_010',
            user_id: 'seed_user_tech',
            guild_id: 'SEED_GUILD',
            channel_id: 'general',
            content: '2 + 2 = 4, matemática básica',
            sentiment_score: 0.2,
            emotion_category: 'helpful',
            timestamp: '2025-11-11T14:21:00Z'
        },

        // Conversas sobre bem-estar e cortesia
        {
            message_id: 'seed_msg_011',
            user_id: 'seed_user_casual',
            guild_id: 'SEED_GUILD',
            channel_id: 'general',
            content: 'Estou bem, obrigado por perguntar! E você?',
            sentiment_score: 0.8,
            emotion_category: 'grateful',
            timestamp: '2025-11-12T10:15:00Z'
        },
        {
            message_id: 'seed_msg_012',
            user_id: 'seed_user_tech',
            guild_id: 'SEED_GUILD',
            channel_id: 'general',
            content: 'Também estou bem, trabalhando em projetos',
            sentiment_score: 0.6,
            emotion_category: 'content',
            timestamp: '2025-11-12T10:16:00Z'
        },

        // Saudações e interações sociais
        {
            message_id: 'seed_msg_013',
            user_id: 'seed_user_casual',
            guild_id: 'SEED_GUILD',
            channel_id: 'general',
            content: 'Bom dia! Como estão hoje?',
            sentiment_score: 0.7,
            emotion_category: 'friendly',
            timestamp: '2025-11-13T08:30:00Z'
        },
        {
            message_id: 'seed_msg_014',
            user_id: 'seed_user_tech',
            guild_id: 'SEED_GUILD',
            channel_id: 'general',
            content: 'Bom dia! Começando o dia produtivo',
            sentiment_score: 0.6,
            emotion_category: 'energetic',
            timestamp: '2025-11-13T08:31:00Z'
        },

        // Menções ao bot com perguntas
        {
            message_id: 'seed_msg_015',
            user_id: 'seed_user_casual',
            guild_id: 'SEED_GUILD',
            channel_id: 'bot-chat',
            content: '[user] você consegue responder perguntas de matemática?',
            is_mention: 1,
            sentiment_score: 0.1,
            emotion_category: 'curious',
            timestamp: '2025-11-15T16:45:00Z'
        },
        {
            message_id: 'seed_msg_016',
            user_id: 'seed_user_tech',
            guild_id: 'SEED_GUILD',
            channel_id: 'bot-chat',
            content: '[user] como você processa o contexto das conversas?',
            is_mention: 1,
            sentiment_score: 0.1,
            emotion_category: 'analytical',
            timestamp: '2025-11-15T17:00:00Z'
        }
    ],

    // Tópicos de interesse baseados nas mensagens
    topicsData: [
        // Tópicos casuais
        { keyword: 'jogos', user_id: 'seed_user_casual', guild_id: 'SEED_GUILD', frequency: 8 },
        { keyword: 'economia', user_id: 'seed_user_casual', guild_id: 'SEED_GUILD', frequency: 5 },
        { keyword: 'dungeon', user_id: 'seed_user_casual', guild_id: 'SEED_GUILD', frequency: 3 },
        { keyword: 'comandos', user_id: 'seed_user_casual', guild_id: 'SEED_GUILD', frequency: 4 },

        // Tópicos técnicos
        { keyword: 'programação', user_id: 'seed_user_tech', guild_id: 'SEED_GUILD', frequency: 12 },
        { keyword: 'javascript', user_id: 'seed_user_tech', guild_id: 'SEED_GUILD', frequency: 9 },
        { keyword: 'discord', user_id: 'seed_user_tech', guild_id: 'SEED_GUILD', frequency: 7 },
        { keyword: 'performance', user_id: 'seed_user_tech', guild_id: 'SEED_GUILD', frequency: 6 },
        { keyword: 'cache', user_id: 'seed_user_tech', guild_id: 'SEED_GUILD', frequency: 4 },
        { keyword: 'arquitetura', user_id: 'seed_user_tech', guild_id: 'SEED_GUILD', frequency: 5 }
    ],

    // Configurações de privacidade padrão
    privacySettings: [
        {
            user_id: 'seed_user_casual',
            data_collection_enabled: 1,
            context_sharing_enabled: 1,
            auto_delete_days: 30
        },
        {
            user_id: 'seed_user_tech',
            data_collection_enabled: 1,
            context_sharing_enabled: 1,
            auto_delete_days: 60
        }
    ]
};

// Templates de contexto para diferentes tipos de usuário
const CONTEXT_TEMPLATES = {
    new_user: {
        personality_traits: {
            humor_level: 0.5,
            formality: 0.5,
            emoji_usage: 0.5,
            technical_interest: 0.3
        },
        interests: ['bot', 'comandos', 'ajuda'],
        communication_style: 'neutral'
    },
    
    casual_gamer: {
        personality_traits: {
            humor_level: 0.8,
            formality: 0.2,
            emoji_usage: 0.9,
            technical_interest: 0.3
        },
        interests: ['jogos', 'anime', 'música', 'memes', 'diversão'],
        communication_style: 'casual'
    },
    
    developer: {
        personality_traits: {
            humor_level: 0.4,
            formality: 0.8,
            emoji_usage: 0.1,
            technical_interest: 0.9
        },
        interests: ['programação', 'código', 'tecnologia', 'desenvolvimento', 'apis'],
        communication_style: 'technical'
    },
    
    community_manager: {
        personality_traits: {
            humor_level: 0.7,
            formality: 0.6,
            emoji_usage: 0.6,
            technical_interest: 0.5
        },
        interests: ['comunidade', 'moderação', 'eventos', 'organização'],
        communication_style: 'formal'
    }
};

/**
 * Executa o seed de dados iniciais
 */
export async function runSeedData() {
    try {
        const db = getSocialDB();
        
        console.log('🌱 Iniciando seed de dados sociais...');

        // Verificar se já existe seed
        const existingSeed = db.prepare('SELECT COUNT(*) as count FROM users WHERE user_id LIKE ?').get('seed_%');
        
        if (existingSeed.count > 0) {
            console.log('⚠️ Dados de seed já existem. Use --force para recriar.');
            return false;
        }

        const transaction = db.transaction(() => {
            // Inserir perfis de usuário
            const insertUser = db.prepare(`
                INSERT INTO users (
                    user_id, username, display_name, message_count, 
                    personality_traits, interests, communication_style,
                    first_seen, last_seen, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
            `);

            for (const profile of INITIAL_SEED_DATA.userProfiles) {
                insertUser.run(
                    profile.user_id, profile.username, profile.display_name,
                    profile.message_count, profile.personality_traits,
                    profile.interests, profile.communication_style,
                    profile.first_seen, profile.last_seen
                );
            }

            // Inserir mensagens
            const insertMessage = db.prepare(`
                INSERT INTO messages (
                    message_id, user_id, guild_id, channel_id, content,
                    is_mention, is_reply, sentiment_score, emotion_category,
                    content_length, has_attachments, timestamp
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `);

            for (const msg of INITIAL_SEED_DATA.initialMessages) {
                insertMessage.run(
                    msg.message_id, msg.user_id, msg.guild_id, msg.channel_id,
                    msg.content, msg.is_mention || 0, msg.is_reply || 0,
                    msg.sentiment_score, msg.emotion_category,
                    msg.content.length, msg.has_attachments || 0, msg.timestamp
                );
            }

            // Inserir tópicos
            const insertTopic = db.prepare(`
                INSERT INTO topics (
                    keyword, user_id, guild_id, frequency, 
                    last_mentioned, created_at
                ) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
            `);

            for (const topic of INITIAL_SEED_DATA.topicsData) {
                insertTopic.run(
                    topic.keyword, topic.user_id, topic.guild_id, topic.frequency
                );
            }

            // Inserir configurações de privacidade
            const insertPrivacy = db.prepare(`
                INSERT INTO privacy_settings (
                    user_id, data_collection_enabled, context_sharing_enabled,
                    auto_delete_days, created_at, updated_at
                ) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
            `);

            for (const privacy of INITIAL_SEED_DATA.privacySettings) {
                insertPrivacy.run(
                    privacy.user_id, privacy.data_collection_enabled,
                    privacy.context_sharing_enabled, privacy.auto_delete_days
                );
            }
        });

        transaction();

        console.log('✅ Seed de dados sociais concluído com sucesso!');
        console.log(`📊 Dados criados:`);
        console.log(`   - ${INITIAL_SEED_DATA.userProfiles.length} perfis de usuário`);
        console.log(`   - ${INITIAL_SEED_DATA.initialMessages.length} mensagens de exemplo`);
        console.log(`   - ${INITIAL_SEED_DATA.topicsData.length} tópicos de interesse`);
        console.log(`   - ${INITIAL_SEED_DATA.privacySettings.length} configurações de privacidade`);

        return true;

    } catch (error) {
        console.error('❌ Erro durante seed de dados:', error);
        throw error;
    }
}

/**
 * Cria perfil inicial inteligente baseado nas primeiras mensagens do usuário
 */
export function createSmartUserProfile(userId, recentMessages = []) {
    try {
        // Analisar padrões nas mensagens
        let templateType = 'new_user';
        
        if (recentMessages.length >= 3) {
            const content = recentMessages.map(m => m.content.toLowerCase()).join(' ');
            
            // Detectar tipo de usuário baseado no conteúdo
            if (content.includes('código') || content.includes('programação') || content.includes('dev')) {
                templateType = 'developer';
            } else if (content.includes('jogo') || content.includes('anime') || content.includes('😄')) {
                templateType = 'casual_gamer';
            } else if (content.includes('moderação') || content.includes('servidor') || content.includes('comunidade')) {
                templateType = 'community_manager';
            }
        }

        const template = CONTEXT_TEMPLATES[templateType];
        
        return {
            user_id: userId,
            personality_traits: JSON.stringify(template.personality_traits),
            interests: JSON.stringify(template.interests),
            communication_style: template.communication_style,
            message_count: 0
        };

    } catch (error) {
        console.error('❌ Erro ao criar perfil inteligente:', error);
        return CONTEXT_TEMPLATES.new_user;
    }
}

/**
 * Remove dados de seed (para limpeza)
 */
export async function removeSeedData() {
    try {
        const db = getSocialDB();
        
        console.log('🗑️ Removendo dados de seed...');

        const transaction = db.transaction(() => {
            // Remover em ordem devido às foreign keys
            db.prepare('DELETE FROM messages WHERE user_id LIKE ?').run('seed_%');
            db.prepare('DELETE FROM topics WHERE user_id LIKE ?').run('seed_%');
            db.prepare('DELETE FROM privacy_settings WHERE user_id LIKE ?').run('seed_%');
            db.prepare('DELETE FROM users WHERE user_id LIKE ?').run('seed_%');
        });

        transaction();
        
        console.log('✅ Dados de seed removidos com sucesso!');
        return true;

    } catch (error) {
        console.error('❌ Erro ao remover dados de seed:', error);
        return false;
    }
}

/**
 * Força recriação do seed
 */
export async function forceSeedData() {
    try {
        console.log('🔄 Forçando recriação do seed...');
        await removeSeedData();
        await runSeedData();
        return true;
    } catch (error) {
        console.error('❌ Erro ao forçar seed:', error);
        return false;
    }
}

export default {
    runSeedData,
    createSmartUserProfile,
    removeSeedData,
    forceSeedData,
    CONTEXT_TEMPLATES
};