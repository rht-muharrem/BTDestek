@echo off
chcp 65001 >nul
title Destek Masasi - Windows Hizmeti Kurulumu


net session >nul 2>&1
if errorlevel 1 (
    echo [HATA] Bu script YONETICI olarak calistirilmalidir.
    echo Dosyaya sag tiklayip "Yonetici olarak calistir" secin.
    echo.
    pause
    exit /b 1
)

cd /d "%~dp0"

set SERVICE_NAME=DestekMasasi
set EXE_PATH=%~dp0MyApp.Api.exe
set PORT=8080

if not exist "%EXE_PATH%" (
    echo [HATA] MyApp.Api.exe bulunamadi: %EXE_PATH%
    echo Bu scripti 'yayin' klasorunun ICINE koyup oradan calistirin.
    echo.
    pause
    exit /b 1
)

echo ==========================================
echo   DESTEK MASASI - Hizmet Kurulumu
echo ==========================================
echo.
echo   Hizmet adi : %SERVICE_NAME%
echo   Konum      : %EXE_PATH%
echo   Port       : %PORT%
echo.

sc query %SERVICE_NAME% >nul 2>&1
if not errorlevel 1 (
    echo [!] Ayni isimde bir hizmet zaten var, kaldiriliyor...
    sc stop %SERVICE_NAME% >nul 2>&1
    timeout /t 3 /nobreak >nul
    sc delete %SERVICE_NAME% >nul 2>&1
    timeout /t 2 /nobreak >nul
)

echo [1/4] Hizmet olusturuluyor...
sc create %SERVICE_NAME% binPath= "\"%EXE_PATH%\"" start= auto DisplayName= "Destek Masasi"
if errorlevel 1 (
    echo [HATA] Hizmet olusturulamadi.
    pause
    exit /b 1
)

sc description %SERVICE_NAME% "Bilgi Islem destek talep sistemi. Web arayuzu: http://localhost:%PORT%"

echo [2/4] Otomatik kurtarma ayarlaniyor...
sc failure %SERVICE_NAME% reset= 86400 actions= restart/5000/restart/10000/restart/30000

echo [3/4] Guvenlik duvari kurali ekleniyor (port %PORT%)...
netsh advfirewall firewall delete rule name="Destek Masasi (%PORT%)" >nul 2>&1
netsh advfirewall firewall add rule name="Destek Masasi (%PORT%)" dir=in action=allow protocol=TCP localport=%PORT% >nul

echo [4/4] Hizmet baslatiliyor...
sc start %SERVICE_NAME%
if errorlevel 1 (
    echo.
    echo [UYARI] Hizmet baslatilamadi. Olasi nedenler:
    echo   - appsettings.Production.json icindeki veritabani baglantisi hatali
    echo   - Hizmet hesabinin SQL Server'a erisim yetkisi yok
    echo.
    echo Detayli hata icin: Olay Goruntuleyici ^> Windows Gunlukleri ^> Uygulama
    echo.
    pause
    exit /b 1
)

echo.
echo ==========================================
echo   KURULUM TAMAMLANDI
echo.
echo   Erisim adresi:
ipconfig | findstr /C:"IPv4"
echo   Port: %PORT%
echo.
echo   Sunucu yeniden baslatildiginda hizmet
echo   OTOMATIK olarak calisacaktir.
echo.
echo   Yonetim: services.msc ^> "Destek Masasi"
echo ==========================================
echo.
pause
