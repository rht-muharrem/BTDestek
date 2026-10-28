@echo off
chcp 65001 >nul
title Destek Masasi - Yayin Surumu

cd /d "%~dp0"

if not exist "yayin\MyApp.Api.exe" (
    echo [HATA] 'yayin' klasoru bulunamadi.
    echo Once YayinPaketiHazirla.bat dosyasina cift tiklayin.
    echo.
    pause
    exit /b 1
)

set ASPNETCORE_ENVIRONMENT=Production

set ASPNETCORE_URLS=http://0.0.0.0:8080

echo ==========================================
echo   DESTEK MASASI - Yayin Surumu
echo ==========================================
echo.
echo   Bu bilgisayardan : http://localhost:8080
echo.
echo   Agdaki diger bilgisayarlardan erisim icin
echo   bu bilgisayarin IP adresini kullanin:
ipconfig | findstr /C:"IPv4"
echo.
echo   Kapatmak icin bu pencereyi kapatin veya Ctrl+C.
echo ==========================================
echo.

timeout /t 3 /nobreak >nul
start http://localhost:8080

cd yayin
MyApp.Api.exe
