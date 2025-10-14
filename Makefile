# =============================================================================
# MARYBOT - Makefile para Microserviços
# =============================================================================

.PHONY: help install dev prod clean logs status stop restart build test

# Configurações padrão
COMPOSE_PROJECT_NAME ?= marybot
DOCKER_COMPOSE_FILE = docker-compose.yml

# Cores para output
RED = \033[0;31m
GREEN = \033[0;32m
YELLOW = \033[1;33m
BLUE = \033[0;34m
CYAN = \033[0;36m
NC = \033[0m # No Color

# =============================================================================
# COMANDOS PRINCIPAIS
# =============================================================================

help: ## 📖 Mostrar ajuda com todos os comandos disponíveis
	@echo "$(CYAN)🎌 MARYBOT - Comandos Disponíveis$(NC)"
	@echo "$(CYAN)================================$(NC)"
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / {printf "$(GREEN)%-15s$(NC) %s\n", $$1, $$2}' $(MAKEFILE_LIST)

install: ## 📦 Instalar dependências de todos os serviços
	@echo "$(YELLOW)📦 Instalando dependências...$(NC)"
	@cd api && npm install
	@cd backend && npm install  
	@cd bot && npm install
	@cd admin-panel && npm install
	@echo "$(GREEN)✅ Dependências instaladas!$(NC)"

dev: ## 🚀 Iniciar todos os serviços em modo desenvolvimento
	@echo "$(GREEN)🚀 Iniciando modo desenvolvimento...$(NC)"
	@if [ "$$OS" = "Windows_NT" ]; then \
		powershell -ExecutionPolicy Bypass -File start.ps1 -Mode dev; \
	else \
		./start.sh -m dev; \
	fi

prod: ## 🐳 Iniciar todos os serviços em modo produção (Docker)
	@echo "$(GREEN)🐳 Iniciando modo produção...$(NC)"
	@docker-compose up --build -d
	@echo "$(GREEN)✅ Serviços Docker iniciados!$(NC)"
	@make status

clean: ## 🧹 Limpar containers, volumes e cache
	@echo "$(YELLOW)🧹 Limpando ambiente...$(NC)"
	@docker-compose down -v
	@docker system prune -f
	@echo "$(GREEN)✅ Ambiente limpo!$(NC)"

logs: ## 📊 Mostrar logs de todos os serviços
	@docker-compose logs -f

status: ## 📈 Mostrar status dos serviços
	@echo "$(CYAN)📊 Status dos Serviços:$(NC)"
	@docker-compose ps

stop: ## 🛑 Parar todos os serviços
	@echo "$(YELLOW)🛑 Parando serviços...$(NC)"
	@docker-compose down
	@echo "$(GREEN)✅ Serviços parados!$(NC)"

restart: stop prod ## 🔄 Reiniciar todos os serviços

build: ## 🔨 Rebuild de todos os containers
	@echo "$(BLUE)🔨 Fazendo rebuild dos containers...$(NC)"
	@docker-compose build --no-cache
	@echo "$(GREEN)✅ Rebuild concluído!$(NC)"

# =============================================================================
# COMANDOS POR SERVIÇO
# =============================================================================

dev-api: ## 🔗 Iniciar apenas API Service em desenvolvimento
	@echo "$(BLUE)🔗 Iniciando API Service...$(NC)"
	@cd api && npm run dev

dev-backend: ## 🔄 Iniciar apenas Backend Service em desenvolvimento  
	@echo "$(BLUE)🔄 Iniciando Backend Service...$(NC)"
	@cd backend && npm run dev

dev-bot: ## 🤖 Iniciar apenas Bot Service em desenvolvimento
	@echo "$(BLUE)🤖 Iniciando Bot Service...$(NC)"
	@cd bot && npm run dev

dev-admin: ## 🎛️ Iniciar apenas Admin Panel em desenvolvimento
	@echo "$(BLUE)🎛️ Iniciando Admin Panel...$(NC)"
	@cd admin-panel && npm run dev

# =============================================================================
# COMANDOS DE BANCO DE DADOS
# =============================================================================

db-up: ## 🐘 Iniciar apenas PostgreSQL
	@echo "$(BLUE)🐘 Iniciando PostgreSQL...$(NC)"
	@docker-compose up -d db

db-migrate: ## 🔄 Executar migrações Prisma
	@echo "$(BLUE)🔄 Executando migrações...$(NC)"
	@cd api && npx prisma db push

db-seed: ## 🌱 Popular banco com dados iniciais
	@echo "$(BLUE)🌱 Populando banco de dados...$(NC)"
	@cd api && npx prisma db seed

db-reset: ## ⚠️ Resetar banco de dados (CUIDADO!)
	@echo "$(RED)⚠️ ATENÇÃO: Isso vai apagar todos os dados!$(NC)"
	@echo "$(YELLOW)Pressione Ctrl+C para cancelar...$(NC)"
	@sleep 5
	@cd api && npx prisma db push --force-reset
	@make db-seed

db-studio: ## 🎛️ Abrir Prisma Studio para gerenciar banco
	@echo "$(CYAN)🎛️ Abrindo Prisma Studio...$(NC)"
	@cd api && npx prisma studio

# =============================================================================
# COMANDOS DE LOGS ESPECÍFICOS
# =============================================================================

logs-api: ## 📊 Logs apenas do API Service
	@docker-compose logs -f api

logs-backend: ## 📊 Logs apenas do Backend Service
	@docker-compose logs -f backend

logs-bot: ## 📊 Logs apenas do Bot Service
	@docker-compose logs -f bot

logs-admin: ## 📊 Logs apenas do Admin Panel
	@docker-compose logs -f admin-panel

logs-db: ## 📊 Logs apenas do PostgreSQL
	@docker-compose logs -f db

# =============================================================================
# COMANDOS DE MONITORAMENTO
# =============================================================================

health: ## 🏥 Verificar saúde de todos os serviços
	@echo "$(CYAN)🏥 Verificando saúde dos serviços...$(NC)"
	@echo "$(BLUE)API Service:$(NC)"
	@curl -s -o /dev/null -w "Status: %{http_code}\n" http://localhost:3001/health || echo "❌ Indisponível"
	@echo "$(BLUE)Backend Service:$(NC)"
	@curl -s -o /dev/null -w "Status: %{http_code}\n" http://localhost:3002/health || echo "❌ Indisponível"
	@echo "$(BLUE)Admin Panel:$(NC)"
	@curl -s -o /dev/null -w "Status: %{http_code}\n" http://localhost:3003 || echo "❌ Indisponível"

monitor: ## 📊 Monitoramento contínuo dos serviços
	@echo "$(CYAN)📊 Monitoramento contínuo (Ctrl+C para parar)...$(NC)"
	@watch -n 5 'docker-compose ps && echo "=== HEALTH CHECK ===" && curl -s http://localhost:3001/health && echo "" && curl -s http://localhost:3002/health'

# =============================================================================
# COMANDOS DE DESENVOLVIMENTO
# =============================================================================

lint: ## ✨ Executar linting em todos os serviços
	@echo "$(BLUE)✨ Executando linting...$(NC)"
	@cd api && npm run lint || true
	@cd backend && npm run lint || true
	@cd bot && npm run lint || true
	@cd admin-panel && npm run lint || true

test: ## 🧪 Executar testes (quando implementados)
	@echo "$(BLUE)🧪 Executando testes...$(NC)"
	@echo "$(YELLOW)⚠️ Testes não implementados ainda$(NC)"

deploy: ## 🚀 Deploy para produção
	@echo "$(GREEN)🚀 Fazendo deploy...$(NC)"
	@make clean
	@make build
	@make prod
	@echo "$(GREEN)✅ Deploy concluído!$(NC)"

# =============================================================================
# COMANDOS UTILITÁRIOS
# =============================================================================

setup: ## ⚙️ Configuração inicial completa
	@echo "$(CYAN)⚙️ Configuração inicial do projeto...$(NC)"
	@make install
	@make db-up
	@sleep 10
	@make db-migrate
	@make db-seed
	@echo "$(GREEN)✅ Configuração inicial concluída!$(NC)"

env: ## 📝 Criar arquivos .env a partir dos exemplos
	@echo "$(BLUE)📝 Criando arquivos .env...$(NC)"
	@cp -n .env.example .env 2>/dev/null || echo ".env já existe"
	@cp -n api/.env.example api/.env 2>/dev/null || echo "api/.env já existe"
	@cp -n backend/.env.example backend/.env 2>/dev/null || echo "backend/.env já existe"
	@cp -n bot/.env.example bot/.env 2>/dev/null || echo "bot/.env já existe"
	@cp -n admin-panel/.env.example admin-panel/.env 2>/dev/null || echo "admin-panel/.env já existe"
	@echo "$(YELLOW)⚠️ Configure os arquivos .env com suas credenciais!$(NC)"

update: ## 🔄 Atualizar dependências de todos os serviços
	@echo "$(BLUE)🔄 Atualizando dependências...$(NC)"
	@cd api && npm update
	@cd backend && npm update
	@cd bot && npm update
	@cd admin-panel && npm update
	@echo "$(GREEN)✅ Dependências atualizadas!$(NC)"

backup: ## 💾 Fazer backup do banco de dados
	@echo "$(BLUE)💾 Fazendo backup do banco...$(NC)"
	@mkdir -p backups
	@docker exec marybot_db pg_dump -U botuser marybot > backups/backup_$(shell date +%Y%m%d_%H%M%S).sql
	@echo "$(GREEN)✅ Backup criado em backups/$(NC)"

# =============================================================================
# COMANDOS DE DOCKER
# =============================================================================

docker-clean: ## 🐳 Limpeza profunda do Docker
	@echo "$(YELLOW)🐳 Limpeza profunda do Docker...$(NC)"
	@docker system prune -a -f --volumes
	@echo "$(GREEN)✅ Docker limpo!$(NC)"

docker-rebuild: ## 🔨 Rebuild completo sem cache
	@echo "$(BLUE)🔨 Rebuild completo sem cache...$(NC)"
	@docker-compose build --no-cache --pull
	@echo "$(GREEN)✅ Rebuild concluído!$(NC)"

# =============================================================================
# CONFIGURAÇÃO PADRÃO
# =============================================================================

# Comando padrão quando executar apenas 'make'
.DEFAULT_GOAL := help