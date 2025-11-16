/**
 * 🌱 Script de Seed para Dados Sociais
 * Executa o seed inicial de dados para melhorar contexto da IA
 */

import { initSocialDatabase } from './socialDB.js';
import { runSeedData, forceSeedData, removeSeedData } from './seedData.js';

async function main() {
    const command = process.argv[2];
    
    try {
        // Inicializar banco se necessário
        await initSocialDatabase();
        
        switch (command) {
            case 'seed':
                console.log('🌱 Executando seed de dados sociais...');
                await runSeedData();
                break;
                
            case 'force':
                console.log('🔄 Forçando recriação do seed...');
                await forceSeedData();
                break;
                
            case 'clean':
                console.log('🗑️ Removendo dados de seed...');
                await removeSeedData();
                break;
                
            default:
                console.log(`
🌱 Gerenciador de Seed - Módulo Social MaryBot

Uso: node database/runSeed.js [comando]

Comandos disponíveis:
  seed    - Criar dados iniciais (apenas se não existirem)
  force   - Recriar dados iniciais (remove existentes)
  clean   - Remover todos os dados de seed
  
Exemplos:
  node database/runSeed.js seed
  node database/runSeed.js force
  node database/runSeed.js clean
`);
                break;
        }
        
        console.log('🎉 Operação concluída com sucesso!');
        process.exit(0);
        
    } catch (error) {
        console.error('❌ Erro:', error);
        process.exit(1);
    }
}

main();