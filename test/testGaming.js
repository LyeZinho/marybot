/**
 * 🧪 Teste do Sistema de Jogos
 * Script para testar a funcionalidade do sistema de gaming
 */

import { gamingManager } from '../src/gaming/GamingManager.js';
import { logger } from '../src/utils/logger.js';

async function testGamingSystem() {
  try {
    logger.info('🧪 Iniciando testes do sistema de gaming...');

    // 1. Testar inicialização
    logger.info('1️⃣ Testando inicialização...');
    await gamingManager.initialize();
    logger.success('✅ Sistema inicializado com sucesso');

    // 2. Testar servidor de jogos
    logger.info('2️⃣ Testando servidor de jogos...');
    const serverUrl = gamingManager.getGameServerUrl();
    logger.info(`📍 URL do servidor: ${serverUrl}`);

    // Testar conexão HTTP
    const fetch = (await import('node-fetch')).default;
    const response = await fetch(serverUrl);
    if (response.ok) {
      logger.success('✅ Servidor HTTP respondendo');
    } else {
      logger.error('❌ Servidor HTTP não está respondendo');
    }

    // 3. Testar jogos disponíveis
    logger.info('3️⃣ Testando jogos disponíveis...');
    const games = await gamingManager.getAvailableGames();
    logger.info(`🎮 ${games.length} jogo(s) encontrado(s):`);
    
    games.forEach(game => {
      logger.info(`  • ${game.name || game.gameId} (${game.type})`);
    });

    // 4. Testar URLs dos jogos
    logger.info('4️⃣ Testando URLs dos jogos...');
    const gameUrls = [
      '/tic-tac-toe/index.html',
      '/snake/index.html',
      '/chess/index.html',
      '/connect4/index.html',
      '/2048/index.html'
    ];

    for (const gameUrl of gameUrls) {
      try {
        const fullUrl = gamingManager.getGameServerUrl(gameUrl);
        const gameResponse = await fetch(fullUrl);
        
        if (gameResponse.ok) {
          logger.success(`✅ ${gameUrl} - OK`);
        } else {
          logger.error(`❌ ${gameUrl} - Status: ${gameResponse.status}`);
        }
      } catch (error) {
        logger.error(`❌ ${gameUrl} - Erro: ${error.message}`);
      }
    }

    // 5. Testar criação de sessão (simulada)
    logger.info('5️⃣ Testando criação de sessão...');
    try {
      const session = await gamingManager.startGameSession('test-user-123', 'tic-tac-toe', {
        url: gamingManager.getGameServerUrl('/tic-tac-toe/index.html'),
        enableAI: true,
        aiDifficulty: 'medium'
      });
      
      if (session) {
        logger.success('✅ Sessão de teste criada');
        
        // Encerrar sessão de teste
        await gamingManager.endGameSession('test-user-123');
        logger.success('✅ Sessão de teste encerrada');
      }
    } catch (error) {
      logger.error('❌ Erro na sessão de teste:', error.message);
    }

    // 6. Testar estatísticas da IA
    logger.info('6️⃣ Testando estatísticas da IA...');
    try {
      const aiStats = await gamingManager.getAIStats();
      logger.info('📊 Estatísticas da IA:');
      logger.info(`  • Jogos treinados: ${Object.keys(aiStats.models || {}).length}`);
      logger.info(`  • Total de ações: ${aiStats.totalActions || 0}`);
      logger.info(`  • Sessões completadas: ${aiStats.completedSessions || 0}`);
    } catch (error) {
      logger.error('❌ Erro nas estatísticas:', error.message);
    }

    // 7. Teste final
    logger.info('7️⃣ Teste final - Verificação de saúde...');
    const healthCheck = {
      serverRunning: !!gamingManager.gameServerProcess,
      browserEngineReady: !!gamingManager.browserEngine,
      aiEngineReady: !!gamingManager.gameAI,
      gamesLoaded: games.length > 0,
      systemInitialized: gamingManager.isInitialized
    };

    logger.info('🏥 Status de saúde do sistema:');
    Object.entries(healthCheck).forEach(([key, value]) => {
      const status = value ? '✅' : '❌';
      logger.info(`  ${status} ${key}: ${value}`);
    });

    const allHealthy = Object.values(healthCheck).every(Boolean);
    
    if (allHealthy) {
      logger.success('🎉 TODOS OS TESTES PASSARAM! Sistema funcionando perfeitamente!');
    } else {
      logger.warn('⚠️ Alguns componentes falharam. Verifique os logs acima.');
    }

    logger.info('');
    logger.info('🌐 Acesse o portal de jogos em: ' + serverUrl);
    logger.info('🎮 Use o comando /gaming no Discord para interagir');
    logger.info('');

  } catch (error) {
    logger.error('❌ Erro durante os testes:', error);
  }
}

// Executar testes se o script for executado diretamente
if (process.argv[1].endsWith('testGaming.js')) {
  testGamingSystem()
    .then(() => {
      logger.info('🧪 Testes concluídos. Pressione Ctrl+C para encerrar o servidor.');
      
      // Manter o processo vivo para testar o servidor
      setInterval(() => {
        // Keep alive
      }, 30000);
      
    })
    .catch(error => {
      logger.error('❌ Falha nos testes:', error);
      process.exit(1);
    });
}

export { testGamingSystem };