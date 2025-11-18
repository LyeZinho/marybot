@echo off
echo ========================================
echo    Instalacao do Flite (Festival Lite)
echo ========================================
echo.

cd /d "%~dp0"

echo Criando diretorio bin se nao existir...
if not exist "bin" mkdir bin

echo Verificando se o Flite ja esta instalado...
where flite >nul 2>&1
if %errorlevel% equ 0 (
    echo [OK] Flite ja esta disponivel no PATH
    flite --version
    goto :test
)

echo Baixando Flite pre-compilado...
echo NOTA: Flite nao esta disponivel no Chocolatey.
echo.
echo Opcoes para instalar o Flite:
echo.
echo 1. Baixar binario pre-compilado do site oficial
echo 2. Usar WSL com apt-get install flite
echo 3. Compilar do codigo fonte
echo 4. Usar alternativa como espeak-ng
echo.

choice /c 1234 /m "Escolha uma opcao"
if errorlevel 4 goto :espeak
if errorlevel 3 goto :compile
if errorlevel 2 goto :wsl
if errorlevel 1 goto :download

:download
echo.
echo Para instalar o Flite manualmente:
echo 1. Visite: http://festvox.org/flite/
echo 2. Baixe o binario para Windows
echo 3. Extraia para a pasta 'bin' deste projeto
echo 4. Execute este script novamente
echo.
pause
goto :end

:wsl
echo.
echo Tentando instalar via WSL...
wsl -e bash -c "sudo apt-get update && sudo apt-get install -y flite"
if %errorlevel% equ 0 (
    echo [OK] Flite instalado via WSL
    echo Para usar, execute: wsl flite
) else (
    echo [ERRO] Falha ao instalar via WSL
)
goto :end

:compile
echo.
echo Compilacao do Flite requer ferramentas de desenvolvimento
echo Visite: https://github.com/festvox/flite
echo.
pause
goto :end

:espeak
echo.
echo Instalando espeak-ng como alternativa...
choco install espeak-ng -y
if %errorlevel% equ 0 (
    echo [OK] espeak-ng instalado com sucesso
    echo Voce pode usar espeak-ng como alternativa ao flite
) else (
    echo [ERRO] Falha ao instalar espeak-ng
)
goto :end

:test
echo.
echo Testando o Flite...
flite -t "Ola, este e um teste do flite" -o "test_flite.wav"
if exist "test_flite.wav" (
    echo [OK] Teste do Flite bem-sucedido!
    del "test_flite.wav"
) else (
    echo [ERRO] Teste do Flite falhou
)

:end
echo.
echo Pressione qualquer tecla para sair...
pause >nul