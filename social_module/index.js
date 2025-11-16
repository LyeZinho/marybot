/**
 * 📊 Módulo Social MaryBot
 * Sistema de coleta e análise de mensagens para contexto conversacional
 */

import MessageCollector from './services/MessageCollector.js';
import SocialContextAPI from './services/SocialContextAPI.js';
import PrivacyManager from './services/PrivacyManager.js';
import { initSocialDatabase } from './database/socialDB.js';

class SocialModule {
    constructor() {
        this.messageCollector = null;
        this.contextAPI = null;
        this.privacyManager = null;
        this.initialized = false;
    }

    /**
     * Inicializa o módulo social
     */
    async initialize() {
        try {
            console.log('📊 Inicializando módulo social...');
            
            // Inicializar banco de dados
            await initSocialDatabase();
            
            // Executar seed inicial se necessário
            await this.runInitialSeed();
            
            // Inicializar serviços
            this.messageCollector = new MessageCollector();
            this.contextAPI = new SocialContextAPI();
            this.privacyManager = new PrivacyManager();
            
            // Inicializar cleanup automático
            this.privacyManager.startAutoCleanup();
            
            this.initialized = true;
            console.log('✅ Módulo social inicializado com sucesso!');
            
        } catch (error) {
            console.error('❌ Erro ao inicializar módulo social:', error);
            throw error;
        }
    }

    /**
     * Executa seed inicial de dados se o banco estiver vazio
     */
    async runInitialSeed() {
        try {
            const { runSeedData } = await import('./database/seedData.js');
            const seedResult = await runSeedData();
            
            if (seedResult) {
                console.log('🌱 Dados iniciais criados para melhor contexto da IA');
            }
        } catch (error) {
            console.warn('⚠️ Não foi possível criar seed inicial:', error.message);
            // Não falhar a inicialização por causa do seed
        }
    }

    /**
     * Coleta mensagem do usuário
     * @param {Object} message - Objeto da mensagem do Discord
     */
    async collectMessage(message) {
        if (!this.initialized) {
            console.warn('⚠️ Módulo social não inicializado, ignorando mensagem');
            return;
        }

        try {
            await this.messageCollector.collect(message);
        } catch (error) {
            console.error('❌ Erro ao coletar mensagem:', error);
        }
    }

    /**
     * Obtém contexto conversacional para IA
     * @param {string} userId - ID do usuário
     * @param {string} guildId - ID do servidor
     * @param {number} limit - Limite de mensagens
     * @returns {Object} Contexto conversacional
     */
    async getConversationContext(userId, guildId, limit = 10) {
        if (!this.initialized) {
            return { messages: [], userProfile: null, contextSummary: null };
        }

        try {
            return await this.contextAPI.getContext(userId, guildId, limit);
        } catch (error) {
            console.error('❌ Erro ao obter contexto:', error);
            return { messages: [], userProfile: null, contextSummary: null };
        }
    }

    /**
     * Obtém perfil do usuário para personalização
     * @param {string} userId - ID do usuário
     * @returns {Object} Perfil do usuário
     */
    async getUserProfile(userId) {
        if (!this.initialized) {
            return null;
        }

        try {
            return await this.contextAPI.getUserProfile(userId);
        } catch (error) {
            console.error('❌ Erro ao obter perfil:', error);
            return null;
        }
    }

    /**
     * Limpa dados de um usuário (GDPR compliance)
     * @param {string} userId - ID do usuário
     */
    async clearUserData(userId) {
        if (!this.initialized) {
            return false;
        }

        try {
            return await this.privacyManager.clearUserData(userId);
        } catch (error) {
            console.error('❌ Erro ao limpar dados:', error);
            return false;
        }
    }

    /**
     * Finaliza o módulo social
     */
    async shutdown() {
        if (this.privacyManager) {
            this.privacyManager.stopAutoCleanup();
        }
        
        console.log('🛑 Módulo social finalizado');
    }
}

// Exportar instância singleton
export default new SocialModule();