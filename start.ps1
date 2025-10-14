#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Script único de inicialização do MaryBot - Arquitetura Microserviços

.DESCRIPTION
    Este script automatiza a inicialização completa do MaryBot com todos os seus serviços.
    Suporta modo desenvolvimento e produção com Docker.

.PARAMETER Mode
    Modo de execução: 'dev' para desenvolvimento, 'prod' para produção com Docker
    
.PARAMETER Service
    Serviço específico para iniciar: 'api', 'backend', 'bot', 'admin', 'all'
    
.PARAMETER Clean
    Limpa containers e volumes antes de iniciar (apenas modo prod)

.EXAMPLE
    .\start.ps1 -Mode dev
    .\start.ps1 -Mode prod
    .\start.ps1 -Mode dev -Service api
    .\start.ps1 -Mode prod -Clean
#>

param(
    [Parameter(Mandatory=$true)]
    [ValidateSet('dev', 'prod')]
    [string]$Mode,
    
    [Parameter(Mandatory=$false)]
    [ValidateSet('api', 'backend', 'bot', 'admin', 'all')]
    [string]$Service = 'all',
    
    [Parameter(Mandatory=$false)]
    [switch]$Clean
)

# Cores para output
$RED = "`e[31m"
$GREEN = "`e[32m"
$YELLOW = "`e[33m"
$BLUE = "`e[34m"
$MAGENTA = "`e[35m"
$CYAN = "`e[36m"
$WHITE = "`e[37m"
$RESET = "`e[0m"

function Write-ColorOutput {
    param([string]$Message, [string]$Color = $WHITE)
    Write-Host "$Color$Message$RESET"
}

function Show-Header {
    Clear-Host
    Write-ColorOutput "
╔═══════════════════════════════════════════════════════════════╗
║                    🎌 MARYBOT LAUNCHER 🎌                    ║
║                   Microservices Architecture                  ║
╚═══════════════════════════════════════════════════════════════╝
" $MAGENTA
}

function Test-Prerequisites {
    Write-ColorOutput "🔍 Verificando pré-requisitos..." $CYAN
    
    # Verificar Node.js
    try {
        $nodeVersion = node --version
        Write-ColorOutput "✅ Node.js: $nodeVersion" $GREEN
    } catch {
        Write-ColorOutput "❌ Node.js não encontrado. Instale Node.js 18+ primeiro." $RED
        exit 1
    }
    
    # Verificar Docker (apenas para modo prod)
    if ($Mode -eq 'prod') {
        try {
            $dockerVersion = docker --version
            Write-ColorOutput "✅ Docker: $dockerVersion" $GREEN
            
            $composeVersion = docker-compose --version
            Write-ColorOutput "✅ Docker Compose: $composeVersion" $GREEN
        } catch {
            Write-ColorOutput "❌ Docker não encontrado. Instale Docker Desktop primeiro." $RED
            exit 1
        }
    }
    
    # Verificar arquivo .env
    if (!(Test-Path ".env")) {
        Write-ColorOutput "⚠️ Arquivo .env não encontrado. Criando exemplo..." $YELLOW
        Copy-Item ".env.example" ".env" -ErrorAction SilentlyContinue
        Write-ColorOutput "📝 Configure o arquivo .env com suas credenciais antes de continuar." $YELLOW
        Start-Process notepad ".env"
        Read-Host "Pressione Enter após configurar o .env"
    } else {
        Write-ColorOutput "✅ Arquivo .env encontrado" $GREEN
    }
}

function Install-Dependencies {
    Write-ColorOutput "`n📦 Instalando dependências..." $CYAN
    
    $services = @('api', 'backend', 'bot', 'admin-panel')
    
    foreach ($svc in $services) {
        if ($Service -eq 'all' -or $Service -eq $svc -or ($Service -eq 'admin' -and $svc -eq 'admin-panel')) {
            if (Test-Path $svc) {
                Write-ColorOutput "📦 Instalando dependências: $svc" $BLUE
                Set-Location $svc
                npm install
                if ($LASTEXITCODE -ne 0) {
                    Write-ColorOutput "❌ Erro ao instalar dependências em $svc" $RED
                    exit 1
                }
                Set-Location ..
                Write-ColorOutput "✅ Dependências instaladas: $svc" $GREEN
            }
        }
    }
}

function Setup-Database {
    if ($Service -eq 'all' -or $Service -eq 'api') {
        Write-ColorOutput "`n🗄️ Configurando banco de dados..." $CYAN
        
        if ($Mode -eq 'dev') {
            # Modo desenvolvimento - assumir PostgreSQL local ou Docker
            Write-ColorOutput "🐘 Iniciando PostgreSQL..." $BLUE
            docker-compose up -d db
            Start-Sleep 10
        }
        
        # Executar migrações Prisma
        Write-ColorOutput "🔄 Executando migrações Prisma..." $BLUE
        Set-Location api
        npx prisma db push
        npx prisma db seed
        Set-Location ..
        Write-ColorOutput "✅ Banco de dados configurado" $GREEN
    }
}

function Start-Development {
    Write-ColorOutput "`n🚀 Iniciando modo DESENVOLVIMENTO..." $GREEN
    
    # Criar scripts temporários para cada serviço
    $processes = @()
    
    if ($Service -eq 'all' -or $Service -eq 'api') {
        Write-ColorOutput "🔗 Iniciando API Service (porta 3001)..." $BLUE
        $apiProcess = Start-Process pwsh -ArgumentList "-Command", "cd api; npm run dev" -PassThru
        $processes += $apiProcess
        Start-Sleep 3
    }
    
    if ($Service -eq 'all' -or $Service -eq 'backend') {
        Write-ColorOutput "🔄 Iniciando Backend Service (porta 3002)..." $BLUE
        $backendProcess = Start-Process pwsh -ArgumentList "-Command", "cd backend; npm run dev" -PassThru
        $processes += $backendProcess
        Start-Sleep 3
    }
    
    if ($Service -eq 'all' -or $Service -eq 'bot') {
        Write-ColorOutput "🤖 Iniciando Bot Service..." $BLUE
        $botProcess = Start-Process pwsh -ArgumentList "-Command", "cd bot; npm run dev" -PassThru
        $processes += $botProcess
        Start-Sleep 3
    }
    
    if ($Service -eq 'all' -or $Service -eq 'admin') {
        Write-ColorOutput "🎛️ Iniciando Admin Panel (porta 3003)..." $BLUE
        $adminProcess = Start-Process pwsh -ArgumentList "-Command", "cd admin-panel; npm run dev" -PassThru
        $processes += $adminProcess
        Start-Sleep 3
    }
    
    Write-ColorOutput "`n✅ Todos os serviços foram iniciados!" $GREEN
    Write-ColorOutput "🌐 URLs de acesso:" $CYAN
    Write-ColorOutput "   • API Service: http://localhost:3001" $WHITE
    Write-ColorOutput "   • Backend Service: http://localhost:3002" $WHITE
    Write-ColorOutput "   • Admin Panel: http://localhost:3003" $WHITE
    Write-ColorOutput "`n📝 Logs estão sendo exibidos em janelas separadas" $YELLOW
    Write-ColorOutput "❌ Pressione Ctrl+C para parar todos os serviços" $RED
    
    # Aguardar interrupção
    try {
        while ($true) {
            Start-Sleep 1
        }
    } finally {
        Write-ColorOutput "`n🛑 Parando serviços..." $YELLOW
        $processes | ForEach-Object { 
            if (!$_.HasExited) { 
                Stop-Process $_.Id -Force -ErrorAction SilentlyContinue
            }
        }
    }
}

function Start-Production {
    Write-ColorOutput "`n🚀 Iniciando modo PRODUÇÃO (Docker)..." $GREEN
    
    if ($Clean) {
        Write-ColorOutput "🧹 Limpando containers e volumes..." $YELLOW
        docker-compose down -v
        docker system prune -f
    }
    
    # Build e start com Docker Compose
    if ($Service -eq 'all') {
        Write-ColorOutput "🐳 Construindo e iniciando todos os serviços..." $BLUE
        docker-compose up --build -d
        
        # Aguardar serviços ficarem saudáveis
        Write-ColorOutput "⏳ Aguardando serviços ficarem saudáveis..." $YELLOW
        Start-Sleep 30
        
        # Verificar status dos serviços
        Show-Services-Status
        
    } else {
        # Iniciar serviço específico
        $serviceName = switch ($Service) {
            'api' { 'api' }
            'backend' { 'backend' }
            'bot' { 'bot' }
            'admin' { 'admin-panel' }
        }
        
        Write-ColorOutput "🐳 Iniciando serviço: $serviceName" $BLUE
        docker-compose up --build -d $serviceName
    }
    
    Write-ColorOutput "`n✅ Serviços Docker iniciados!" $GREEN
    Write-ColorOutput "📊 Use 'docker-compose logs -f' para ver logs" $CYAN
    Write-ColorOutput "🛑 Use 'docker-compose down' para parar" $CYAN
}

function Show-Services-Status {
    Write-ColorOutput "`n📊 Status dos Serviços:" $CYAN
    
    $services = @(
        @{Name="Database"; URL="localhost:5400"; Container="marybot_db"},
        @{Name="API Service"; URL="http://localhost:3001/health"; Container="marybot_api"},
        @{Name="Backend Service"; URL="http://localhost:3002/health"; Container="marybot_backend"},
        @{Name="Bot Service"; URL="N/A"; Container="marybot_bot"},
        @{Name="Admin Panel"; URL="http://localhost:3003"; Container="marybot_admin"}
    )
    
    foreach ($service in $services) {
        try {
            $status = docker ps --filter "name=$($service.Container)" --format "{{.Status}}"
            if ($status) {
                Write-ColorOutput "✅ $($service.Name): $status" $GREEN
            } else {
                Write-ColorOutput "❌ $($service.Name): Não executando" $RED
            }
        } catch {
            Write-ColorOutput "❓ $($service.Name): Status desconhecido" $YELLOW
        }
    }
    
    Write-ColorOutput "`n🌐 URLs de acesso:" $CYAN
    Write-ColorOutput "   • Admin Panel: http://localhost:3003" $WHITE
    Write-ColorOutput "   • API Docs: http://localhost:3001/health" $WHITE
    Write-ColorOutput "   • Backend Status: http://localhost:3002/health" $WHITE
}

function Show-Help {
    Write-ColorOutput "
📖 Comandos úteis do MaryBot:

🔧 Desenvolvimento:
   .\start.ps1 -Mode dev                 # Iniciar todos os serviços
   .\start.ps1 -Mode dev -Service api    # Apenas API Service
   .\start.ps1 -Mode dev -Service bot    # Apenas Bot Service

🐳 Produção (Docker):
   .\start.ps1 -Mode prod                # Todos os serviços Docker
   .\start.ps1 -Mode prod -Clean         # Limpar e reiniciar
   
📊 Monitoramento:
   docker-compose logs -f               # Ver logs de todos os serviços
   docker-compose logs -f api           # Logs apenas do API
   docker-compose ps                    # Status dos containers
   
🛑 Parar serviços:
   docker-compose down                  # Parar containers
   docker-compose down -v               # Parar e remover volumes
" $WHITE
}

# ============================================================================
# EXECUÇÃO PRINCIPAL
# ============================================================================

Show-Header

# Verificar pré-requisitos
Test-Prerequisites

# Instalar dependências (apenas modo dev)
if ($Mode -eq 'dev') {
    Install-Dependencies
}

# Configurar banco de dados
Setup-Database

# Iniciar serviços baseado no modo
switch ($Mode) {
    'dev' { Start-Development }
    'prod' { Start-Production }
}

# Mostrar informações úteis
if ($Mode -eq 'prod') {
    Show-Services-Status
}

Show-Help

Write-ColorOutput "`n🎉 MaryBot está pronto para uso!" $GREEN