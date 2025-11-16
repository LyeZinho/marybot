@echo off
echo ========================================
echo     MaryBot AI Server - Setup
echo ========================================
echo.

cd /d "%~dp0"

echo Verificando Node.js...
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERRO] Node.js não encontrado! Instale Node.js 18+ primeiro.
    pause
    exit /b 1
)

echo [OK] Node.js encontrado
echo.

echo Instalando dependências...
call npm install
if %errorlevel% neq 0 (
    echo [ERRO] Falha na instalação das dependências
    pause
    exit /b 1
)

echo [OK] Dependências instaladas
echo.

echo Verificando arquivo .env...
if not exist ".env" (
    echo Criando arquivo .env a partir do exemplo...
    copy ".env.example" ".env"
    echo [AVISO] Configure o arquivo .env com suas chaves API
) else (
    echo [OK] Arquivo .env já existe
)

echo.
echo Verificando modelos...
if not exist "gpt2\config.json" (
    echo Modelos GPT-2 não encontrados. Deseja baixar? (s/n)
    set /p download="Digite s para sim, n para não: "
    if /i "%download%"=="s" (
        echo Baixando modelos do Hugging Face...
        call npm run clone-models
    )
) else (
    echo [OK] Modelo GPT-2 encontrado
)

echo.
echo ========================================
echo            Setup Concluído!
echo ========================================
echo.
echo Para iniciar o servidor:
echo   npm start          (produção)
echo   npm run dev        (desenvolvimento)
echo.
echo Para testar:
echo   npm test
echo.
echo Para exemplos:
echo   node examples/usage.js
echo.
echo Documentação completa: README.md
echo ========================================
pause