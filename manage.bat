@echo off
REM Script para gerenciar o MaryBot no Windows
REM Uso: manage.bat [comando]

if "%1"=="start-db" (
    echo 🗄️ Iniciando banco de dados...
    docker-compose up -d db
    echo ✅ Banco iniciado na porta 5433
    goto :eof
)

if "%1"=="stop-db" (
    echo 🛑 Parando banco de dados...
    docker-compose stop db
    goto :eof
)

if "%1"=="start-all" (
    echo 🚀 Iniciando todos os serviços...
    docker-compose up -d
    goto :eof
)

if "%1"=="stop-all" (
    echo 🛑 Parando todos os serviços...
    docker-compose down
    goto :eof
)

if "%1"=="logs" (
    echo 📋 Mostrando logs...
    docker-compose logs -f
    goto :eof
)

if "%1"=="logs-db" (
    echo 📋 Mostrando logs do banco...
    docker-compose logs -f db
    goto :eof
)

if "%1"=="logs-bot" (
    echo 📋 Mostrando logs do bot...
    docker-compose logs -f bot
    goto :eof
)

if "%1"=="restart" (
    echo 🔄 Reiniciando serviços...
    docker-compose restart
    goto :eof
)

if "%1"=="clean" (
    echo 🧹 Limpando containers e volumes...
    docker-compose down -v
    docker system prune -f
    goto :eof
)

if "%1"=="status" (
    echo 📊 Status dos serviços:
    docker-compose ps
    goto :eof
)

if "%1"=="studio" (
    echo 🎨 Iniciando Prisma Studio...
    docker-compose --profile dev up -d prisma-studio
    echo 📱 Acesse: http://localhost:5555
    goto :eof
)

echo 🤖 MaryBot Management Script
echo.
echo Comandos disponíveis:
echo   start-db    - Iniciar apenas o banco de dados
echo   stop-db     - Parar o banco de dados
echo   start-all   - Iniciar todos os serviços
echo   stop-all    - Parar todos os serviços
echo   logs        - Ver logs de todos os serviços
echo   logs-db     - Ver logs do banco
echo   logs-bot    - Ver logs do bot
echo   restart     - Reiniciar serviços
echo   clean       - Limpar containers e volumes
echo   status      - Ver status dos serviços
echo   studio      - Iniciar Prisma Studio
echo.
echo Exemplo: manage.bat start-db