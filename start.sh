#!/bin/bash

# Script único de inicialização do MaryBot - Arquitetura Microserviços
# Suporta modo desenvolvimento e produção com Docker

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
CYAN='\033[0;36m'
WHITE='\033[1;37m'
NC='\033[0m' # No Color

# Variáveis padrão
MODE=""
SERVICE="all"
CLEAN=false

# Função para mostrar ajuda
show_help() {
    echo -e "${WHITE}
Uso: ./start.sh [OPÇÕES]

OPÇÕES:
    -m, --mode MODE       Modo de execução: 'dev' ou 'prod'
    -s, --service SVC     Serviço específico: 'api', 'backend', 'bot', 'admin', 'all'
    -c, --clean          Limpar containers e volumes (apenas modo prod)
    -h, --help           Mostrar esta ajuda

EXEMPLOS:
    ./start.sh -m dev                    # Modo desenvolvimento
    ./start.sh -m prod                   # Modo produção
    ./start.sh -m dev -s api            # Apenas API Service
    ./start.sh -m prod -c               # Produção com limpeza
${NC}"
}

# Função para mostrar header
show_header() {
    clear
    echo -e "${MAGENTA}
╔═══════════════════════════════════════════════════════════════╗
║                    🎌 MARYBOT LAUNCHER 🎌                    ║
║                   Microservices Architecture                  ║
╚═══════════════════════════════════════════════════════════════╝
${NC}"
}

# Função para verificar pré-requisitos
test_prerequisites() {
    echo -e "${CYAN}🔍 Verificando pré-requisitos...${NC}"
    
    # Verificar Node.js
    if command -v node > /dev/null 2>&1; then
        NODE_VERSION=$(node --version)
        echo -e "${GREEN}✅ Node.js: $NODE_VERSION${NC}"
    else
        echo -e "${RED}❌ Node.js não encontrado. Instale Node.js 18+ primeiro.${NC}"
        exit 1
    fi
    
    # Verificar Docker (apenas para modo prod)
    if [ "$MODE" = "prod" ]; then
        if command -v docker > /dev/null 2>&1; then
            DOCKER_VERSION=$(docker --version)
            echo -e "${GREEN}✅ Docker: $DOCKER_VERSION${NC}"
        else
            echo -e "${RED}❌ Docker não encontrado. Instale Docker primeiro.${NC}"
            exit 1
        fi
        
        if command -v docker-compose > /dev/null 2>&1; then
            COMPOSE_VERSION=$(docker-compose --version)
            echo -e "${GREEN}✅ Docker Compose: $COMPOSE_VERSION${NC}"
        else
            echo -e "${RED}❌ Docker Compose não encontrado.${NC}"
            exit 1
        fi
    fi
    
    # Verificar arquivo .env
    if [ ! -f ".env" ]; then
        echo -e "${YELLOW}⚠️ Arquivo .env não encontrado. Criando exemplo...${NC}"
        if [ -f ".env.example" ]; then
            cp .env.example .env
        fi
        echo -e "${YELLOW}📝 Configure o arquivo .env com suas credenciais antes de continuar.${NC}"
        echo -e "${YELLOW}   Pressione Enter após configurar o .env${NC}"
        read -r
    else
        echo -e "${GREEN}✅ Arquivo .env encontrado${NC}"
    fi
}

# Função para instalar dependências
install_dependencies() {
    echo -e "\n${CYAN}📦 Instalando dependências...${NC}"
    
    services=("api" "backend" "bot" "admin-panel")
    
    for svc in "${services[@]}"; do
        if [ "$SERVICE" = "all" ] || [ "$SERVICE" = "$svc" ] || ([ "$SERVICE" = "admin" ] && [ "$svc" = "admin-panel" ]); then
            if [ -d "$svc" ]; then
                echo -e "${BLUE}📦 Instalando dependências: $svc${NC}"
                cd "$svc" || exit
                npm install
                if [ $? -ne 0 ]; then
                    echo -e "${RED}❌ Erro ao instalar dependências em $svc${NC}"
                    exit 1
                fi
                cd ..
                echo -e "${GREEN}✅ Dependências instaladas: $svc${NC}"
            fi
        fi
    done
}

# Função para configurar banco de dados
setup_database() {
    if [ "$SERVICE" = "all" ] || [ "$SERVICE" = "api" ]; then
        echo -e "\n${CYAN}🗄️ Configurando banco de dados...${NC}"
        
        if [ "$MODE" = "dev" ]; then
            # Modo desenvolvimento - iniciar PostgreSQL via Docker
            echo -e "${BLUE}🐘 Iniciando PostgreSQL...${NC}"
            docker-compose up -d db
            sleep 10
        fi
        
        # Executar migrações Prisma
        echo -e "${BLUE}🔄 Executando migrações Prisma...${NC}"
        cd api || exit
        npx prisma db push
        npx prisma db seed
        cd ..
        echo -e "${GREEN}✅ Banco de dados configurado${NC}"
    fi
}

# Função para iniciar modo desenvolvimento
start_development() {
    echo -e "\n${GREEN}🚀 Iniciando modo DESENVOLVIMENTO...${NC}"
    
    # Array para armazenar PIDs dos processos
    declare -a PIDS=()
    
    # Função para cleanup
    cleanup() {
        echo -e "\n${YELLOW}🛑 Parando serviços...${NC}"
        for pid in "${PIDS[@]}"; do
            kill "$pid" 2>/dev/null
        done
        exit 0
    }
    
    # Capturar Ctrl+C
    trap cleanup SIGINT SIGTERM
    
    if [ "$SERVICE" = "all" ] || [ "$SERVICE" = "api" ]; then
        echo -e "${BLUE}🔗 Iniciando API Service (porta 3001)...${NC}"
        cd api && npm run dev &
        PIDS+=($!)
        cd ..
        sleep 3
    fi
    
    if [ "$SERVICE" = "all" ] || [ "$SERVICE" = "backend" ]; then
        echo -e "${BLUE}🔄 Iniciando Backend Service (porta 3002)...${NC}"
        cd backend && npm run dev &
        PIDS+=($!)
        cd ..
        sleep 3
    fi
    
    if [ "$SERVICE" = "all" ] || [ "$SERVICE" = "bot" ]; then
        echo -e "${BLUE}🤖 Iniciando Bot Service...${NC}"
        cd bot && npm run dev &
        PIDS+=($!)
        cd ..
        sleep 3
    fi
    
    if [ "$SERVICE" = "all" ] || [ "$SERVICE" = "admin" ]; then
        echo -e "${BLUE}🎛️ Iniciando Admin Panel (porta 3003)...${NC}"
        cd admin-panel && npm run dev &
        PIDS+=($!)
        cd ..
        sleep 3
    fi
    
    echo -e "\n${GREEN}✅ Todos os serviços foram iniciados!${NC}"
    echo -e "${CYAN}🌐 URLs de acesso:${NC}"
    echo -e "${WHITE}   • API Service: http://localhost:3001${NC}"
    echo -e "${WHITE}   • Backend Service: http://localhost:3002${NC}"
    echo -e "${WHITE}   • Admin Panel: http://localhost:3003${NC}"
    echo -e "\n${YELLOW}📝 Logs estão sendo exibidos no terminal${NC}"
    echo -e "${RED}❌ Pressione Ctrl+C para parar todos os serviços${NC}"
    
    # Aguardar indefinidamente
    wait
}

# Função para iniciar modo produção
start_production() {
    echo -e "\n${GREEN}🚀 Iniciando modo PRODUÇÃO (Docker)...${NC}"
    
    if [ "$CLEAN" = true ]; then
        echo -e "${YELLOW}🧹 Limpando containers e volumes...${NC}"
        docker-compose down -v
        docker system prune -f
    fi
    
    # Build e start com Docker Compose
    if [ "$SERVICE" = "all" ]; then
        echo -e "${BLUE}🐳 Construindo e iniciando todos os serviços...${NC}"
        docker-compose up --build -d
        
        # Aguardar serviços ficarem saudáveis
        echo -e "${YELLOW}⏳ Aguardando serviços ficarem saudáveis...${NC}"
        sleep 30
        
        # Verificar status dos serviços
        show_services_status
        
    else
        # Iniciar serviço específico
        case $SERVICE in
            "api") SERVICE_NAME="api" ;;
            "backend") SERVICE_NAME="backend" ;;
            "bot") SERVICE_NAME="bot" ;;
            "admin") SERVICE_NAME="admin-panel" ;;
            *) SERVICE_NAME=$SERVICE ;;
        esac
        
        echo -e "${BLUE}🐳 Iniciando serviço: $SERVICE_NAME${NC}"
        docker-compose up --build -d "$SERVICE_NAME"
    fi
    
    echo -e "\n${GREEN}✅ Serviços Docker iniciados!${NC}"
    echo -e "${CYAN}📊 Use 'docker-compose logs -f' para ver logs${NC}"
    echo -e "${CYAN}🛑 Use 'docker-compose down' para parar${NC}"
}

# Função para mostrar status dos serviços
show_services_status() {
    echo -e "\n${CYAN}📊 Status dos Serviços:${NC}"
    
    services=(
        "marybot_db:Database:localhost:5400"
        "marybot_api:API Service:http://localhost:3001/health"
        "marybot_backend:Backend Service:http://localhost:3002/health"
        "marybot_bot:Bot Service:N/A"
        "marybot_admin:Admin Panel:http://localhost:3003"
    )
    
    for service_info in "${services[@]}"; do
        IFS=':' read -r container_name service_name url <<< "$service_info"
        
        status=$(docker ps --filter "name=$container_name" --format "{{.Status}}" 2>/dev/null)
        if [ -n "$status" ]; then
            echo -e "${GREEN}✅ $service_name: $status${NC}"
        else
            echo -e "${RED}❌ $service_name: Não executando${NC}"
        fi
    done
    
    echo -e "\n${CYAN}🌐 URLs de acesso:${NC}"
    echo -e "${WHITE}   • Admin Panel: http://localhost:3003${NC}"
    echo -e "${WHITE}   • API Docs: http://localhost:3001/health${NC}"
    echo -e "${WHITE}   • Backend Status: http://localhost:3002/health${NC}"
}

# Função para mostrar comandos úteis
show_useful_commands() {
    echo -e "${WHITE}
📖 Comandos úteis do MaryBot:

🔧 Desenvolvimento:
   ./start.sh -m dev                    # Iniciar todos os serviços
   ./start.sh -m dev -s api            # Apenas API Service
   ./start.sh -m dev -s bot            # Apenas Bot Service

🐳 Produção (Docker):
   ./start.sh -m prod                   # Todos os serviços Docker
   ./start.sh -m prod -c               # Limpar e reiniciar
   
📊 Monitoramento:
   docker-compose logs -f              # Ver logs de todos os serviços
   docker-compose logs -f api          # Logs apenas do API
   docker-compose ps                   # Status dos containers
   
🛑 Parar serviços:
   docker-compose down                 # Parar containers
   docker-compose down -v              # Parar e remover volumes
${NC}"
}

# Parse de argumentos da linha de comando
while [[ $# -gt 0 ]]; do
    case $1 in
        -m|--mode)
            MODE="$2"
            shift 2
            ;;
        -s|--service)
            SERVICE="$2"
            shift 2
            ;;
        -c|--clean)
            CLEAN=true
            shift
            ;;
        -h|--help)
            show_help
            exit 0
            ;;
        *)
            echo -e "${RED}Opção desconhecida: $1${NC}"
            show_help
            exit 1
            ;;
    esac
done

# Validar argumentos obrigatórios
if [ -z "$MODE" ]; then
    echo -e "${RED}❌ Modo é obrigatório. Use -m dev ou -m prod${NC}"
    show_help
    exit 1
fi

if [[ "$MODE" != "dev" && "$MODE" != "prod" ]]; then
    echo -e "${RED}❌ Modo deve ser 'dev' ou 'prod'${NC}"
    exit 1
fi

if [[ "$SERVICE" != "all" && "$SERVICE" != "api" && "$SERVICE" != "backend" && "$SERVICE" != "bot" && "$SERVICE" != "admin" ]]; then
    echo -e "${RED}❌ Serviço deve ser 'all', 'api', 'backend', 'bot' ou 'admin'${NC}"
    exit 1
fi

# ============================================================================
# EXECUÇÃO PRINCIPAL
# ============================================================================

show_header

# Verificar pré-requisitos
test_prerequisites

# Instalar dependências (apenas modo dev)
if [ "$MODE" = "dev" ]; then
    install_dependencies
fi

# Configurar banco de dados
setup_database

# Iniciar serviços baseado no modo
case $MODE in
    "dev")
        start_development
        ;;
    "prod")
        start_production
        ;;
esac

# Mostrar informações úteis
if [ "$MODE" = "prod" ]; then
    show_services_status
fi

show_useful_commands

echo -e "\n${GREEN}🎉 MaryBot está pronto para uso!${NC}"