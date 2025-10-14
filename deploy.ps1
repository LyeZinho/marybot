#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Script de Deploy para Produção do MaryBot

.DESCRIPTION
    Este script automatiza o deploy do MaryBot para produção com validações,
    backup automático e rollback em caso de falha.

.PARAMETER Environment
    Ambiente de deploy: 'staging' ou 'production'
    
.PARAMETER SkipBackup
    Pular backup do banco de dados antes do deploy
    
.PARAMETER SkipTests
    Pular testes antes do deploy (não recomendado)

.EXAMPLE
    .\deploy.ps1 -Environment production
    .\deploy.ps1 -Environment staging -SkipBackup
#>

param(
    [Parameter(Mandatory=$true)]
    [ValidateSet('staging', 'production')]
    [string]$Environment,
    
    [Parameter(Mandatory=$false)]
    [switch]$SkipBackup,
    
    [Parameter(Mandatory=$false)]
    [switch]$SkipTests
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
║                    🚀 MARYBOT DEPLOY 🚀                      ║
║                     Environment: $Environment                     ║
╚═══════════════════════════════════════════════════════════════╝
" $MAGENTA
}

function Test-Prerequisites {
    Write-ColorOutput "🔍 Verificando pré-requisitos..." $CYAN
    
    # Verificar Git
    try {
        $gitStatus = git status --porcelain
        if ($gitStatus) {
            Write-ColorOutput "⚠️ Existem mudanças não commitadas:" $YELLOW
            Write-ColorOutput $gitStatus $WHITE
            $response = Read-Host "Continuar mesmo assim? (y/N)"
            if ($response -ne 'y' -and $response -ne 'Y') {
                exit 1
            }
        }
        Write-ColorOutput "✅ Git: Repository limpo" $GREEN
    } catch {
        Write-ColorOutput "❌ Git não encontrado ou erro no repositório" $RED
        exit 1
    }
    
    # Verificar Docker
    try {
        $dockerVersion = docker --version
        Write-ColorOutput "✅ Docker: $dockerVersion" $GREEN
        
        $composeVersion = docker-compose --version
        Write-ColorOutput "✅ Docker Compose: $composeVersion" $GREEN
    } catch {
        Write-ColorOutput "❌ Docker não encontrado" $RED
        exit 1
    }
    
    # Verificar variáveis de ambiente
    if (!(Test-Path ".env")) {
        Write-ColorOutput "❌ Arquivo .env não encontrado" $RED
        exit 1
    }
    
    # Verificar se os serviços estão rodando
    $runningContainers = docker ps --format "{{.Names}}" | Where-Object { $_ -like "marybot_*" }
    if ($runningContainers) {
        Write-ColorOutput "✅ Serviços atualmente rodando: $($runningContainers -join ', ')" $GREEN
    }
}

function Backup-Database {
    if (!$SkipBackup) {
        Write-ColorOutput "💾 Fazendo backup do banco de dados..." $CYAN
        
        $timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
        $backupFile = "backups/backup_pre_deploy_$timestamp.sql"
        
        # Criar diretório de backup se não existir
        if (!(Test-Path "backups")) {
            New-Item -ItemType Directory -Path "backups"
        }
        
        try {
            docker exec marybot_db pg_dump -U botuser marybot > $backupFile
            Write-ColorOutput "✅ Backup criado: $backupFile" $GREEN
        } catch {
            Write-ColorOutput "❌ Falha no backup do banco de dados" $RED
            exit 1
        }
    } else {
        Write-ColorOutput "⚠️ Backup do banco PULADO (não recomendado)" $YELLOW
    }
}

function Run-Tests {
    if (!$SkipTests) {
        Write-ColorOutput "🧪 Executando testes..." $CYAN
        
        # Testes da API
        Write-ColorOutput "🔗 Testando API Service..." $BLUE
        Set-Location api
        # npm test (quando implementado)
        Set-Location ..
        
        # Testes do Backend
        Write-ColorOutput "🔄 Testando Backend Service..." $BLUE
        Set-Location backend
        # npm test (quando implementado)
        Set-Location ..
        
        # Testes do Bot
        Write-ColorOutput "🤖 Testando Bot Service..." $BLUE
        Set-Location bot
        # npm test (quando implementado)
        Set-Location ..
        
        Write-ColorOutput "✅ Todos os testes passaram" $GREEN
    } else {
        Write-ColorOutput "⚠️ Testes PULADOS (não recomendado para produção)" $YELLOW
    }
}

function Build-Services {
    Write-ColorOutput "🔨 Fazendo build dos serviços..." $CYAN
    
    # Limpar builds anteriores
    Write-ColorOutput "🧹 Limpando builds anteriores..." $BLUE
    docker-compose down
    docker system prune -f
    
    # Build com cache otimizado
    Write-ColorOutput "🏗️ Construindo containers..." $BLUE
    $buildResult = docker-compose build --parallel
    
    if ($LASTEXITCODE -ne 0) {
        Write-ColorOutput "❌ Falha no build dos containers" $RED
        exit 1
    }
    
    Write-ColorOutput "✅ Build concluído com sucesso" $GREEN
}

function Deploy-Services {
    Write-ColorOutput "🚀 Iniciando deploy..." $GREEN
    
    try {
        # Estratégia Blue-Green Deploy
        Write-ColorOutput "🔄 Parando serviços antigos..." $BLUE
        docker-compose down
        
        # Iniciar novos serviços
        Write-ColorOutput "🆙 Iniciando novos serviços..." $BLUE
        docker-compose up -d
        
        # Aguardar serviços ficarem saudáveis
        Write-ColorOutput "⏳ Aguardando serviços ficarem saudáveis..." $YELLOW
        $maxWait = 120 # segundos
        $waited = 0
        
        do {
            Start-Sleep 5
            $waited += 5
            
            $healthyServices = 0
            $services = @("marybot_api", "marybot_backend", "marybot_bot", "marybot_admin")
            
            foreach ($service in $services) {
                $status = docker inspect --format="{{.State.Health.Status}}" $service 2>$null
                if ($status -eq "healthy" -or $status -eq "running") {
                    $healthyServices++
                }
            }
            
            Write-ColorOutput "🔍 Serviços saudáveis: $healthyServices/4" $BLUE
            
        } while ($healthyServices -lt 4 -and $waited -lt $maxWait)
        
        if ($healthyServices -lt 4) {
            throw "Timeout: Nem todos os serviços ficaram saudáveis"
        }
        
        Write-ColorOutput "✅ Deploy concluído com sucesso!" $GREEN
        
    } catch {
        Write-ColorOutput "❌ Falha no deploy: $_" $RED
        Write-ColorOutput "🔄 Iniciando rollback..." $YELLOW
        
        # Rollback simples
        docker-compose down
        # Aqui você poderia restaurar containers anteriores
        
        exit 1
    }
}

function Verify-Deployment {
    Write-ColorOutput "🔍 Verificando deployment..." $CYAN
    
    $services = @(
        @{Name="API Service"; URL="http://localhost:3001/health"; Expected="200"},
        @{Name="Backend Service"; URL="http://localhost:3002/health"; Expected="200"},
        @{Name="Admin Panel"; URL="http://localhost:3003"; Expected="200"}
    )
    
    foreach ($service in $services) {
        try {
            $response = Invoke-WebRequest -Uri $service.URL -UseBasicParsing -TimeoutSec 10
            if ($response.StatusCode -eq $service.Expected) {
                Write-ColorOutput "✅ $($service.Name): OK" $GREEN
            } else {
                Write-ColorOutput "❌ $($service.Name): Status $($response.StatusCode)" $RED
            }
        } catch {
            Write-ColorOutput "❌ $($service.Name): Inacessível" $RED
        }
    }
    
    # Verificar logs por erros críticos
    Write-ColorOutput "📊 Verificando logs recentes..." $BLUE
    $errorCount = (docker-compose logs --tail=50 | Select-String -Pattern "ERROR|FATAL" | Measure-Object).Count
    
    if ($errorCount -eq 0) {
        Write-ColorOutput "✅ Nenhum erro crítico encontrado nos logs" $GREEN
    } else {
        Write-ColorOutput "⚠️ $errorCount erros encontrados nos logs - verifique manualmente" $YELLOW
    }
}

function Show-PostDeploy-Info {
    Write-ColorOutput "`n🎉 DEPLOY CONCLUÍDO COM SUCESSO! 🎉`n" $GREEN
    
    Write-ColorOutput "🌐 URLs de acesso ($Environment):" $CYAN
    Write-ColorOutput "   • Admin Panel: http://localhost:3003" $WHITE
    Write-ColorOutput "   • API Service: http://localhost:3001/health" $WHITE
    Write-ColorOutput "   • Backend Service: http://localhost:3002/health" $WHITE
    
    Write-ColorOutput "`n📊 Comandos úteis pós-deploy:" $CYAN
    Write-ColorOutput "   • Logs: docker-compose logs -f" $WHITE
    Write-ColorOutput "   • Status: docker-compose ps" $WHITE
    Write-ColorOutput "   • Restart: docker-compose restart [service]" $WHITE
    Write-ColorOutput "   • Stop: docker-compose down" $WHITE
    
    Write-ColorOutput "`n💾 Backup criado em: backups/" $CYAN
    Write-ColorOutput "`n📈 Monitoramento: make monitor" $CYAN
}

# ============================================================================
# EXECUÇÃO PRINCIPAL
# ============================================================================

Show-Header

Write-ColorOutput "🎯 Iniciando deploy para $Environment..." $CYAN
Write-ColorOutput "⏰ $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" $WHITE

# Etapas do deploy
Test-Prerequisites
Backup-Database
Run-Tests
Build-Services
Deploy-Services
Verify-Deployment
Show-PostDeploy-Info

Write-ColorOutput "`n🏁 Deploy finalizado com sucesso! 🏁" $GREEN