#!/bin/bash

# Script para gerenciar o MaryBot
# Uso: ./manage.sh [comando]

set -e

case "$1" in
    "start-db")
        echo "🗄️ Iniciando banco de dados..."
        docker-compose up -d db
        echo "✅ Banco iniciado na porta 5433"
        ;;
    "stop-db")
        echo "🛑 Parando banco de dados..."
        docker-compose stop db
        ;;
    "start-all")
        echo "🚀 Iniciando todos os serviços..."
        docker-compose up -d
        ;;
    "stop-all")
        echo "🛑 Parando todos os serviços..."
        docker-compose down
        ;;
    "logs")
        echo "📋 Mostrando logs..."
        docker-compose logs -f
        ;;
    "logs-db")
        echo "📋 Mostrando logs do banco..."
        docker-compose logs -f db
        ;;
    "logs-bot")
        echo "📋 Mostrando logs do bot..."
        docker-compose logs -f bot
        ;;
    "restart")
        echo "🔄 Reiniciando serviços..."
        docker-compose restart
        ;;
    "clean")
        echo "🧹 Limpando containers e volumes..."
        docker-compose down -v
        docker system prune -f
        ;;
    "status")
        echo "📊 Status dos serviços:"
        docker-compose ps
        ;;
    "studio")
        echo "🎨 Iniciando Prisma Studio..."
        docker-compose --profile dev up -d prisma-studio
        echo "📱 Acesse: http://localhost:5555"
        ;;
    *)
        echo "🤖 MaryBot Management Script"
        echo ""
        echo "Comandos disponíveis:"
        echo "  start-db    - Iniciar apenas o banco de dados"
        echo "  stop-db     - Parar o banco de dados"
        echo "  start-all   - Iniciar todos os serviços"
        echo "  stop-all    - Parar todos os serviços"
        echo "  logs        - Ver logs de todos os serviços"
        echo "  logs-db     - Ver logs do banco"
        echo "  logs-bot    - Ver logs do bot"
        echo "  restart     - Reiniciar serviços"
        echo "  clean       - Limpar containers e volumes"
        echo "  status      - Ver status dos serviços"
        echo "  studio      - Iniciar Prisma Studio"
        echo ""
        echo "Exemplo: ./manage.sh start-db"
        ;;
esac