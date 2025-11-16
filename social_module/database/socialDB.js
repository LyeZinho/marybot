/**
 * 🗄️ Banco de Dados Social SQLite
 * Configuração e inicialização do banco local para mensagens
 */

import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Caminho do banco de dados
const DB_PATH = join(__dirname, '..', 'data', 'social.db');

let db = null;

/**
 * Schema das tabelas
 */
const SCHEMA = {
    // Tabela de usuários
    users: `
        CREATE TABLE IF NOT EXISTS users (
            user_id TEXT PRIMARY KEY,
            username TEXT NOT NULL,
            display_name TEXT,
            first_seen DATETIME DEFAULT CURRENT_TIMESTAMP,
            last_seen DATETIME DEFAULT CURRENT_TIMESTAMP,
            message_count INTEGER DEFAULT 0,
            personality_traits TEXT, -- JSON string
            interests TEXT, -- JSON string  
            communication_style TEXT, -- casual, formal, emoji_heavy, etc
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `,

    // Tabela de mensagens
    messages: `
        CREATE TABLE IF NOT EXISTS messages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            message_id TEXT UNIQUE NOT NULL,
            user_id TEXT NOT NULL,
            guild_id TEXT NOT NULL,
            channel_id TEXT NOT NULL,
            content TEXT NOT NULL,
            is_mention BOOLEAN DEFAULT 0,
            is_reply BOOLEAN DEFAULT 0,
            reply_to_message_id TEXT,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
            sentiment_score REAL, -- -1 to 1
            emotion_category TEXT, -- happy, sad, angry, neutral, etc
            content_length INTEGER,
            has_attachments BOOLEAN DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(user_id)
        )
    `,

    // Tabela de contexto conversacional
    conversations: `
        CREATE TABLE IF NOT EXISTS conversations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id TEXT NOT NULL,
            guild_id TEXT NOT NULL,
            session_start DATETIME DEFAULT CURRENT_TIMESTAMP,
            session_end DATETIME,
            message_count INTEGER DEFAULT 0,
            topic_summary TEXT,
            conversation_type TEXT, -- casual, support, question, etc
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(user_id)
        )
    `,

    // Tabela de análise de tópicos
    topics: `
        CREATE TABLE IF NOT EXISTS topics (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            keyword TEXT NOT NULL,
            user_id TEXT NOT NULL,
            guild_id TEXT NOT NULL,
            frequency INTEGER DEFAULT 1,
            last_mentioned DATETIME DEFAULT CURRENT_TIMESTAMP,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(user_id)
        )
    `,

    // Tabela de configurações de privacidade
    privacy_settings: `
        CREATE TABLE IF NOT EXISTS privacy_settings (
            user_id TEXT PRIMARY KEY,
            data_collection_enabled BOOLEAN DEFAULT 1,
            context_sharing_enabled BOOLEAN DEFAULT 1,
            auto_delete_days INTEGER DEFAULT 30,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(user_id)
        )
    `
};

/**
 * Índices para performance
 */
const INDEXES = [
    'CREATE INDEX IF NOT EXISTS idx_messages_user_id ON messages(user_id)',
    'CREATE INDEX IF NOT EXISTS idx_messages_guild_id ON messages(guild_id)',
    'CREATE INDEX IF NOT EXISTS idx_messages_timestamp ON messages(timestamp)',
    'CREATE INDEX IF NOT EXISTS idx_messages_user_guild ON messages(user_id, guild_id)',
    'CREATE INDEX IF NOT EXISTS idx_users_last_seen ON users(last_seen)',
    'CREATE INDEX IF NOT EXISTS idx_conversations_user_guild ON conversations(user_id, guild_id)',
    'CREATE INDEX IF NOT EXISTS idx_topics_user_keyword ON topics(user_id, keyword)'
];

/**
 * Inicializa o banco de dados social
 */
export async function initSocialDatabase() {
    try {
        console.log('🗄️ Inicializando banco SQLite social...');
        
        // Criar diretório se não existir
        const { mkdirSync } = await import('fs');
        const { dirname } = await import('path');
        
        try {
            mkdirSync(dirname(DB_PATH), { recursive: true });
        } catch (err) {
            if (err.code !== 'EEXIST') throw err;
        }
        
        // Conectar ao banco
        db = new Database(DB_PATH);
        
        // Configurar WAL mode para melhor performance
        db.pragma('journal_mode = WAL');
        db.pragma('synchronous = NORMAL');
        db.pragma('cache_size = 1000');
        db.pragma('temp_store = memory');
        
        // Criar tabelas
        for (const [tableName, schema] of Object.entries(SCHEMA)) {
            db.exec(schema);
            console.log(`✅ Tabela ${tableName} criada/verificada`);
        }
        
        // Criar índices
        for (const index of INDEXES) {
            db.exec(index);
        }
        
        console.log('✅ Banco SQLite social inicializado com sucesso!');
        return db;
        
    } catch (error) {
        console.error('❌ Erro ao inicializar banco SQLite:', error);
        throw error;
    }
}

/**
 * Obtém a instância do banco
 */
export function getSocialDB() {
    if (!db) {
        throw new Error('Banco social não inicializado. Chame initSocialDatabase() primeiro.');
    }
    return db;
}

/**
 * Fecha a conexão com o banco
 */
export function closeSocialDB() {
    if (db) {
        db.close();
        db = null;
        console.log('🔒 Banco SQLite social fechado');
    }
}

export default {
    initSocialDatabase,
    getSocialDB,
    closeSocialDB
};