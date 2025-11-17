/**
 * 🌐 Servidor HTTP para Jogos
 * Servidor local para hospedar os jogos web
 */

import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { logger } from '../src/utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3002;
const GAMES_DIR = __dirname;

// MIME types
const MIME_TYPES = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

// Criar servidor HTTP
const server = http.createServer((req, res) => {
  try {
    let urlPath = req.url === '/' ? '/index.html' : req.url;
    
    // Remover query parameters
    urlPath = urlPath.split('?')[0];
    
    // Segurança: prevenir path traversal
    if (urlPath.includes('..')) {
      res.writeHead(400);
      res.end('Bad Request');
      return;
    }

    // Roteamento principal
    if (urlPath === '/index.html' || urlPath === '/') {
      sendGamesList(res);
      return;
    }

    // Servir arquivos dos jogos
    const filePath = path.join(GAMES_DIR, urlPath);
    
    // Verificar se arquivo existe
    if (!fs.existsSync(filePath)) {
      res.writeHead(404);
      res.end('File not found');
      return;
    }

    // Obter extensão do arquivo
    const ext = path.extname(filePath).toLowerCase();
    const mimeType = MIME_TYPES[ext] || 'application/octet-stream';

    // Ler e enviar arquivo
    fs.readFile(filePath, (err, data) => {
      if (err) {
        res.writeHead(500);
        res.end('Internal server error');
        return;
      }

      res.writeHead(200, { 'Content-Type': mimeType });
      res.end(data);
    });

  } catch (error) {
    logger.error('Erro no servidor de jogos:', error);
    res.writeHead(500);
    res.end('Internal server error');
  }
});

// Página principal com lista de jogos
function sendGamesList(res) {
  try {
    // Escanear diretório de jogos
    const games = [];
    
    if (fs.existsSync(GAMES_DIR)) {
      const gameDirectories = fs.readdirSync(GAMES_DIR, { withFileTypes: true })
        .filter(dirent => dirent.isDirectory())
        .map(dirent => dirent.name);
      
      gameDirectories.forEach(gameDir => {
        const indexPath = path.join(GAMES_DIR, gameDir, 'index.html');
        if (fs.existsSync(indexPath)) {
          games.push({
            id: gameDir,
            name: formatGameName(gameDir),
            url: `/${gameDir}/index.html`,
            description: getGameDescription(gameDir)
          });
        }
      });
    }

    const html = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>🎮 Portal de Jogos - MaryBot</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            color: white;
        }

        .container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
        }

        .header {
            text-align: center;
            margin-bottom: 40px;
        }

        .header h1 {
            font-size: 3em;
            margin-bottom: 10px;
            text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
        }

        .header p {
            font-size: 1.2em;
            opacity: 0.9;
        }

        .games-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 30px;
            margin-top: 40px;
        }

        .game-card {
            background: rgba(255, 255, 255, 0.1);
            backdrop-filter: blur(10px);
            border-radius: 15px;
            padding: 25px;
            text-align: center;
            transition: all 0.3s ease;
            border: 1px solid rgba(255, 255, 255, 0.2);
        }

        .game-card:hover {
            transform: translateY(-5px);
            background: rgba(255, 255, 255, 0.15);
            box-shadow: 0 10px 30px rgba(0,0,0,0.3);
        }

        .game-icon {
            font-size: 4em;
            margin-bottom: 15px;
        }

        .game-title {
            font-size: 1.5em;
            font-weight: bold;
            margin-bottom: 10px;
        }

        .game-description {
            font-size: 0.9em;
            opacity: 0.8;
            margin-bottom: 20px;
            line-height: 1.4;
        }

        .play-button {
            display: inline-block;
            background: linear-gradient(45deg, #FF6B6B, #4ECDC4);
            color: white;
            text-decoration: none;
            padding: 12px 25px;
            border-radius: 25px;
            font-weight: bold;
            transition: all 0.3s ease;
            border: none;
            cursor: pointer;
        }

        .play-button:hover {
            transform: scale(1.05);
            box-shadow: 0 5px 15px rgba(0,0,0,0.3);
        }

        .info-section {
            background: rgba(255, 255, 255, 0.1);
            backdrop-filter: blur(10px);
            border-radius: 15px;
            padding: 25px;
            margin-top: 40px;
            border: 1px solid rgba(255, 255, 255, 0.2);
        }

        .bot-info {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px;
            margin-top: 20px;
        }

        .bot-feature {
            background: rgba(255, 255, 255, 0.05);
            padding: 15px;
            border-radius: 10px;
            text-align: center;
        }

        .status-indicator {
            display: inline-block;
            width: 10px;
            height: 10px;
            background: #4ECDC4;
            border-radius: 50%;
            margin-right: 8px;
            animation: pulse 2s infinite;
        }

        @keyframes pulse {
            0% { opacity: 1; }
            50% { opacity: 0.5; }
            100% { opacity: 1; }
        }

        .footer {
            text-align: center;
            margin-top: 40px;
            opacity: 0.7;
            font-size: 0.9em;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🎮 Portal de Jogos</h1>
            <p>Jogos web para treinamento de IA - MaryBot</p>
            <p><span class="status-indicator"></span>Servidor ativo na porta ${PORT}</p>
        </div>

        <div class="games-grid">
            ${games.map(game => `
                <div class="game-card">
                    <div class="game-icon">${getGameIcon(game.id)}</div>
                    <div class="game-title">${game.name}</div>
                    <div class="game-description">${game.description}</div>
                    <a href="${game.url}" class="play-button" target="_blank">
                        🎯 Jogar Agora
                    </a>
                </div>
            `).join('')}
        </div>

        <div class="info-section">
            <h2>🤖 Sobre o Sistema de IA</h2>
            <p>Estes jogos foram criados para treinar a IA do MaryBot usando deep learning e automação de browser. 
            A IA analisa o estado do jogo, toma decisões estratégicas e aprende com cada jogada.</p>
            
            <div class="bot-info">
                <div class="bot-feature">
                    <h3>🧠 Deep Learning</h3>
                    <p>Algoritmos avançados de aprendizado de máquina</p>
                </div>
                <div class="bot-feature">
                    <h3>🕸️ Browser Automation</h3>
                    <p>Controle automatizado via Puppeteer</p>
                </div>
                <div class="bot-feature">
                    <h3>📊 Análise em Tempo Real</h3>
                    <p>Processamento de estado do jogo</p>
                </div>
                <div class="bot-feature">
                    <h3>🎯 Estratégias Adaptativas</h3>
                    <p>IA que se adapta e melhora com o tempo</p>
                </div>
            </div>
        </div>

        <div class="footer">
            <p>🚀 Desenvolvido para MaryBot | Servidor de Jogos v1.0</p>
            <p>Use /gaming no Discord para interagir com os jogos!</p>
        </div>
    </div>

    <script>
        // Atualizar status do servidor
        function updateServerStatus() {
            fetch('/ping')
                .then(response => {
                    if (response.ok) {
                        console.log('✅ Servidor de jogos ativo');
                    }
                })
                .catch(error => {
                    console.log('⚠️ Erro de conexão:', error);
                });
        }

        // Verificar status a cada 30 segundos
        setInterval(updateServerStatus, 30000);
        updateServerStatus();

        // Log para debugging
        console.log('🎮 Portal de Jogos carregado');
        console.log('📍 Servidor rodando na porta ${PORT}');
        console.log('🎯 ${games.length} jogos disponíveis');
    </script>
</body>
</html>`;

    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(html);

  } catch (error) {
    logger.error('Erro ao gerar lista de jogos:', error);
    res.writeHead(500);
    res.end('Erro interno do servidor');
  }
}

// Formatar nome do jogo
function formatGameName(gameId) {
  const names = {
    'tic-tac-toe': 'Jogo da Velha',
    'snake': 'Snake Game',
    'chess': 'Xadrez',
    'connect4': 'Conecta 4',
    '2048': '2048'
  };
  return names[gameId] || gameId.charAt(0).toUpperCase() + gameId.slice(1);
}

// Obter ícone do jogo
function getGameIcon(gameId) {
  const icons = {
    'tic-tac-toe': '⭕',
    'snake': '🐍',
    'chess': '♛',
    'connect4': '🔴',
    '2048': '🎯'
  };
  return icons[gameId] || '🎮';
}

// Obter descrição do jogo
function getGameDescription(gameId) {
  const descriptions = {
    'tic-tac-toe': 'Clássico jogo da velha com IA estratégica. Bot vs Player em turnos alternados.',
    'snake': 'Jogo da cobrinha com IA que usa algoritmos de pathfinding. Coma frutas sem bater!',
    'chess': 'Xadrez completo com IA usando algoritmo minimax. Estratégia avançada implementada.',
    'connect4': 'Conecta 4 com IA usando expectiminimax. Conecte 4 peças em linha para vencer!',
    '2048': 'Puzzle numérico com IA otimizada. Combine números para chegar ao tile 2048!'
  };
  return descriptions[gameId] || 'Jogo interativo para treinamento de IA com estratégias avançadas.';
}

// Iniciar servidor
server.listen(PORT, () => {
  logger.success(`🌐 Servidor de jogos rodando na porta ${PORT}`);
  logger.info(`📍 URL: http://localhost:${PORT}`);
  logger.info(`📂 Diretório de jogos: ${GAMES_DIR}`);
  
  // Listar jogos disponíveis
  if (fs.existsSync(GAMES_DIR)) {
    const games = fs.readdirSync(GAMES_DIR, { withFileTypes: true })
      .filter(dirent => dirent.isDirectory())
      .map(dirent => dirent.name);
    
    logger.info(`🎮 ${games.length} jogo(s) disponível(eis): ${games.join(', ')}`);
  }
});

// Tratamento de erros
server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    logger.error(`❌ Porta ${PORT} já está em uso`);
  } else {
    logger.error('❌ Erro no servidor de jogos:', error);
  }
});

// Graceful shutdown
process.on('SIGINT', () => {
  logger.info('🛑 Encerrando servidor de jogos...');
  server.close(() => {
    logger.info('✅ Servidor de jogos encerrado');
    process.exit(0);
  });
});

process.on('SIGTERM', () => {
  logger.info('🛑 Encerrando servidor de jogos...');
  server.close(() => {
    logger.info('✅ Servidor de jogos encerrado');
    process.exit(0);
  });
});

export { server };