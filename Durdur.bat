@echo off
chcp 65001 >nul
title Destek Masasi - Durdurucu

echo ==========================================
echo   DESTEK MASASI - Durduruluyor
echo ==========================================
echo.


for %%P in (5000 5173) do (
    echo Port %%P kontrol ediliyor...
    for /f "tokens=5" %%A in ('netstat -aon ^| findstr ":%%P" ^| findstr "LISTENING"') do (
        echo   - PID %%A kapatiliyor
        taskkill /F /PID %%A >nul 2>nul
    )
)

echo.
echo Uygulama durduruldu.
timeout /t 3 /nobreak >nul
exit
