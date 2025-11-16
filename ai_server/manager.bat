@echo off
setlocal EnableDelayedExpansion

:menu
echo.
echo ===============================================
echo          MaryBot AI Server Manager
echo ===============================================
echo.
echo 1. Iniciar servidor
echo 2. Parar servidor (finalizar processos na porta)
echo 3. Reiniciar servidor
echo 4. Ver status do servidor
echo 5. Executar testes
echo 6. Ver logs
echo 7. Sair
echo.
set /p choice="Escolha uma opção (1-7): "

if "%choice%"=="1" goto start_server
if "%choice%"=="2" goto stop_server  
if "%choice%"=="3" goto restart_server
if "%choice%"=="4" goto status_server
if "%choice%"=="5" goto run_tests
if "%choice%"=="6" goto view_logs
if "%choice%"=="7" goto exit
echo Opção inválida!
goto menu

:start_server
echo.
echo Iniciando servidor AI...
cd /d "%~dp0"
node server.js
pause
goto menu

:stop_server
echo.
echo Parando servidor AI (porta 3001)...
netstat -ano | findstr :3001 > nul
if !errorlevel! equ 0 (
    for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3001') do (
        echo Finalizando processo %%a...
        taskkill /PID %%a /F > nul 2>&1
    )
    echo Servidor parado com sucesso!
) else (
    echo Nenhum processo encontrado na porta 3001
)
pause
goto menu

:restart_server
echo.
echo Reiniciando servidor...
call :stop_server
timeout /t 2 /nobreak > nul
call :start_server
goto menu

:status_server
echo.
echo Status do servidor AI:
echo.
netstat -ano | findstr :3001 > nul
if !errorlevel! equ 0 (
    echo ✅ Servidor está rodando na porta 3001
    for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3001') do (
        echo    PID: %%a
    )
) else (
    echo ❌ Servidor não está rodando
)
echo.
if exist "logs\ai_server.log" (
    echo Últimas linhas do log:
    echo ------------------------
    powershell -Command "Get-Content 'logs\ai_server.log' -Tail 5"
) else (
    echo Arquivo de log não encontrado
)
pause
goto menu

:run_tests
echo.
echo Executando testes do servidor...
cd /d "%~dp0"

REM Verificar se o servidor está rodando
netstat -ano | findstr :3001 > nul
if !errorlevel! neq 0 (
    echo Servidor não está rodando. Iniciando...
    start /min node server.js
    timeout /t 3 /nobreak > nul
)

node test\testServer.js
pause
goto menu

:view_logs
echo.
if exist "logs\ai_server.log" (
    echo Exibindo log do servidor:
    echo =========================
    type "logs\ai_server.log"
) else (
    echo Arquivo de log não encontrado
)
pause
goto menu

:exit
echo.
echo Finalizando...
exit /b 0