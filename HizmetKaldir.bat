@echo off
chcp 65001 >nul
title Destek Masasi - Hizmeti Kaldir

net session >nul 2>&1
if errorlevel 1 (
    echo [HATA] Bu script YONETICI olarak calistirilmalidir.
    echo.
    pause
    exit /b 1
)

set SERVICE_NAME=DestekMasasi
set PORT=8080

echo ==========================================
echo   DESTEK MASASI - Hizmet Kaldiriliyor
echo ==========================================
echo.

sc query %SERVICE_NAME% >nul 2>&1
if errorlevel 1 (
    echo Boyle bir hizmet bulunamadi: %SERVICE_NAME%
    echo.
    pause
    exit /b 0
)

echo [1/3] Hizmet durduruluyor...
sc stop %SERVICE_NAME% >nul 2>&1
timeout /t 3 /nobreak >nul

echo [2/3] Hizmet kaldiriliyor...
sc delete %SERVICE_NAME%

echo [3/3] Guvenlik duvari kurali kaldiriliyor...
netsh advfirewall firewall delete rule name="Destek Masasi (%PORT%)" >nul 2>&1

echo.
echo Hizmet kaldirildi.
echo (Veritabani ve dosyalar SILINMEDI.)
echo.
pause
