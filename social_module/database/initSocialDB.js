/**
 * Script para inicialização do banco SQLite social
 */

import { initSocialDatabase } from './socialDB.js';

async function main() {
    try {
        await initSocialDatabase();
        console.log('🎉 Banco de dados social inicializado com sucesso!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Erro:', error);
        process.exit(1);
    }
}

main();