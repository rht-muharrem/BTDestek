@echo off
chcp 65001 >nul
title Destek Masasi - Baslatici

echo ==========================================
echo   DESTEK MASASI - Baslatiliyor
echo ==========================================
echo.


cd /d "%~dp0"


where dotnet >nul 2>nul
if errorlevel 1 (
    echo [HATA] .NET SDK bulunamadi.
    echo Lutfen https://dotnet.microsoft.com/download adresinden .NET 8 SDK kurun.
    echo.
    pause
    exit /b 1
)

where npm >nul 2>nul
if errorlevel 1 (
    echo [HATA] Node.js / npm bulunamadi.
    echo Lutfen https://nodejs.org adresinden Node.js LTS surumunu kurun.
    echo.
    pause
    exit /b 1
)


if not exist "myapp-client\node_modules" (
    echo [1/3] Frontend paketleri ilk kez kuruluyor, bu birkac dakika surebilir...
    cd myapp-client
    call npm install
    cd ..
    echo.
)


echo [2/3] Backend baslatiliyor... ^(http://localhost:5000^)
start "Destek Masasi - Backend (API)" cmd /k "cd /d "%~dp0MyApp.Api" && dotnet run"


timeout /t 6 /nobreak >nul


echo [3/3] Frontend baslatiliyor... ^(http://localhost:5173^)
start "Destek Masasi - Frontend (React)" cmd /k "cd /d "%~dp0myapp-client" && npm run dev"


timeout /t 8 /nobreak >nul
start http://localhost:5173

echo.
echo ==========================================
echo   Uygulama baslatildi!
echo.
echo   Frontend : http://localhost:5173
echo   Backend  : http://localhost:5000
echo   Swagger  : http://localhost:5000/swagger
echo.
echo   Kapatmak icin acilan iki siyah pencereyi
echo   kapatmaniz yeterli.
echo ==========================================
echo.
timeout /t 10 /nobreak >nul
exit
