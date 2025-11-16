/**
 * 🔐 Privacy Manager
 * Gerenciamento de privacidade e compliance (LGPD/GDPR)
 */

import { getSocialDB } from '../database/socialDB.js';

export default class PrivacyManager {
    constructor() {
        this.db = null;
        this.cleanupInterval = null;
        this.init();
    }

    /**
     * Inicializa o Privacy Manager
     */
    init() {
        try {
            this.db = getSocialDB();
            this.prepareStatements();
        } catch (error) {
            console.error('❌ Erro ao inicializar PrivacyManager:', error);
        }
    }

    /**
     * Prepara statements SQL
     */
    prepareStatements() {
        this.statements = {
            // Obter configurações de privacidade
            getPrivacySettings: this.db.prepare(`
                SELECT * FROM privacy_settings WHERE user_id = ?
            `),

            // Inserir/atualizar configurações
            upsertPrivacySettings: this.db.prepare(`
                INSERT OR REPLACE INTO privacy_settings 
                (user_id, data_collection_enabled, context_sharing_enabled, auto_delete_days, updated_at)
                VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
            `),

            // Deletar dados do usuário
            deleteUserMessages: this.db.prepare(`
                DELETE FROM messages WHERE user_id = ?
            `),

            deleteUserTopics: this.db.prepare(`
                DELETE FROM topics WHERE user_id = ?
            `),

            deleteUserConversations: this.db.prepare(`
                DELETE FROM conversations WHERE user_id = ?
            `),

            deleteUserProfile: this.db.prepare(`
                DELETE FROM users WHERE user_id = ?
            `),

            deleteUserPrivacySettings: this.db.prepare(`
                DELETE FROM privacy_settings WHERE user_id = ?
            `),

            // Limpeza automática por data
            deleteOldMessages: this.db.prepare(`
                DELETE FROM messages 
                WHERE datetime(timestamp) < datetime('now', '-' || ? || ' days')
            `),

            deleteOldTopics: this.db.prepare(`
                DELETE FROM topics 
                WHERE datetime(last_mentioned) < datetime('now', '-' || ? || ' days')
            `),

            // Encontrar usuários para limpeza automática
            getUsersForAutoCleanup: this.db.prepare(`
                SELECT DISTINCT u.user_id, ps.auto_delete_days
                FROM users u
                LEFT JOIN privacy_settings ps ON u.user_id = ps.user_id
                WHERE (ps.auto_delete_days IS NOT NULL AND ps.auto_delete_days > 0)
                   OR (ps.auto_delete_days IS NULL AND 30 > 0)
            `)
        };
    }

    /**
     * Obtém configurações de privacidade do usuário
     * @param {string} userId - ID do usuário
     * @returns {Object} Configurações de privacidade
     */
    getPrivacySettings(userId) {
        try {
            return this.statements.getPrivacySettings.get(userId) || {
                user_id: userId,
                data_collection_enabled: true,
                context_sharing_enabled: true,
                auto_delete_days: 30
            };
        } catch (error) {
            console.error('❌ Erro ao obter configurações de privacidade:', error);
            return null;
        }
    }

    /**
     * Atualiza configurações de privacidade
     * @param {string} userId - ID do usuário
     * @param {Object} settings - Novas configurações
     */
    updatePrivacySettings(userId, settings) {
        try {
            this.statements.upsertPrivacySettings.run(
                userId,
                settings.data_collection_enabled ?? true,
                settings.context_sharing_enabled ?? true,
                settings.auto_delete_days ?? 30
            );
            
            console.log(`✅ Configurações de privacidade atualizadas para usuário ${userId}`);
            return true;
        } catch (error) {
            console.error('❌ Erro ao atualizar configurações:', error);
            return false;
        }
    }

    /**
     * Verifica se coleta de dados está habilitada para o usuário
     * @param {string} userId - ID do usuário
     * @returns {boolean}
     */
    isDataCollectionEnabled(userId) {
        const settings = this.getPrivacySettings(userId);
        return settings?.data_collection_enabled ?? true;
    }

    /**
     * Verifica se compartilhamento de contexto está habilitado
     * @param {string} userId - ID do usuário
     * @returns {boolean}
     */
    isContextSharingEnabled(userId) {
        const settings = this.getPrivacySettings(userId);
        return settings?.context_sharing_enabled ?? true;
    }

    /**
     * Remove todos os dados de um usuário (GDPR Right to be Forgotten)
     * @param {string} userId - ID do usuário
     * @returns {boolean} Sucesso da operação
     */
    clearUserData(userId) {
        try {
            const transaction = this.db.transaction(() => {
                this.statements.deleteUserMessages.run(userId);
                this.statements.deleteUserTopics.run(userId);
                this.statements.deleteUserConversations.run(userId);
                this.statements.deleteUserProfile.run(userId);
                this.statements.deleteUserPrivacySettings.run(userId);
            });

            transaction();
            
            console.log(`🗑️ Dados do usuário ${userId} removidos com sucesso`);
            return true;
        } catch (error) {
            console.error('❌ Erro ao limpar dados do usuário:', error);
            return false;
        }
    }

    /**
     * Limpeza automática baseada na configuração de cada usuário
     */
    performAutoCleanup() {
        try {
            const users = this.statements.getUsersForAutoCleanup.all();
            let totalCleaned = 0;
            
            for (const user of users) {
                const daysToKeep = user.auto_delete_days || 30;
                
                // Limpar mensagens antigas
                const messagesResult = this.statements.deleteOldMessages.run(daysToKeep);
                const topicsResult = this.statements.deleteOldTopics.run(daysToKeep);
                
                totalCleaned += messagesResult.changes + topicsResult.changes;
            }
            
            if (totalCleaned > 0) {
                console.log(`🧹 Limpeza automática concluída: ${totalCleaned} registros removidos`);
            }
            
            return totalCleaned;
        } catch (error) {
            console.error('❌ Erro na limpeza automática:', error);
            return 0;
        }
    }

    /**
     * Inicia limpeza automática agendada
     */
    startAutoCleanup() {
        // Executar limpeza a cada 6 horas
        this.cleanupInterval = setInterval(() => {
            this.performAutoCleanup();
        }, 6 * 60 * 60 * 1000); // 6 horas

        // Executar primeira limpeza após 1 minuto
        setTimeout(() => {
            this.performAutoCleanup();
        }, 60000);

        console.log('🔄 Limpeza automática de dados iniciada (a cada 6 horas)');
    }

    /**
     * Para limpeza automática
     */
    stopAutoCleanup() {
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
            this.cleanupInterval = null;
            console.log('🛑 Limpeza automática de dados parada');
        }
    }

    /**
     * Obtém estatísticas de dados armazenados
     * @returns {Object} Estatísticas
     */
    getDataStats() {
        try {
            const stats = this.db.prepare(`
                SELECT 
                    (SELECT COUNT(*) FROM users) as total_users,
                    (SELECT COUNT(*) FROM messages) as total_messages,
                    (SELECT COUNT(*) FROM topics) as total_topics,
                    (SELECT COUNT(*) FROM conversations) as total_conversations,
                    (SELECT COUNT(*) FROM privacy_settings WHERE data_collection_enabled = 0) as users_opted_out
            `).get();

            return stats;
        } catch (error) {
            console.error('❌ Erro ao obter estatísticas:', error);
            return null;
        }
    }

    /**
     * Exporta dados do usuário (GDPR Data Portability)
     * @param {string} userId - ID do usuário
     * @returns {Object} Dados do usuário
     */
    exportUserData(userId) {
        try {
            const userData = {
                profile: this.db.prepare('SELECT * FROM users WHERE user_id = ?').get(userId),
                messages: this.db.prepare('SELECT * FROM messages WHERE user_id = ?').all(userId),
                topics: this.db.prepare('SELECT * FROM topics WHERE user_id = ?').all(userId),
                conversations: this.db.prepare('SELECT * FROM conversations WHERE user_id = ?').all(userId),
                privacy_settings: this.db.prepare('SELECT * FROM privacy_settings WHERE user_id = ?').get(userId),
                export_timestamp: new Date().toISOString()
            };

            return userData;
        } catch (error) {
            console.error('❌ Erro ao exportar dados:', error);
            return null;
        }
    }

    /**
     * Gera relatório de compliance
     * @returns {Object} Relatório
     */
    generateComplianceReport() {
        try {
            const stats = this.getDataStats();
            const now = new Date();
            
            return {
                generated_at: now.toISOString(),
                data_retention: {
                    total_users: stats.total_users,
                    total_messages: stats.total_messages,
                    users_opted_out: stats.users_opted_out,
                    opt_out_percentage: ((stats.users_opted_out / stats.total_users) * 100).toFixed(2)
                },
                privacy_compliance: {
                    auto_cleanup_enabled: this.cleanupInterval !== null,
                    last_cleanup: 'Baseado na configuração individual de cada usuário',
                    data_retention_period: '30 dias por padrão, configurável por usuário'
                },
                gdpr_features: {
                    right_to_access: 'Implementado via exportUserData()',
                    right_to_rectification: 'Dados atualizados automaticamente',
                    right_to_erasure: 'Implementado via clearUserData()',
                    right_to_data_portability: 'Implementado via exportUserData()'
                }
            };
        } catch (error) {
            console.error('❌ Erro ao gerar relatório:', error);
            return null;
        }
    }
}