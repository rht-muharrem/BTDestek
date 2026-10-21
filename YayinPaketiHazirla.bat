@echo off
chcp 65001 >nul
title Destek Masasi - Yayinlama Paketi Hazirla

echo ==========================================
echo   YAYINLAMA PAKETI HAZIRLANIYOR
echo ==========================================
echo.

cd /d "%~dp0"

REM --- Gereksinim kontrolu ---
where dotnet >nul 2>nul
if errorlevel 1 (
    echo [HATA] .NET SDK bulunamadi.
    pause
    exit /b 1
)
where npm >nul 2>nul
if errorlevel 1 (
    echo [HATA] Node.js / npm bulunamadi.
    pause
    exit /b 1
)

REM --- 1) React'i derle ---
echo [1/3] Frontend derleniyor...
cd myapp-client
if not exist "node_modules" (
    echo     paketler kuruluyor...
    call npm install
)
call npm run build
if errorlevel 1 (
    echo [HATA] Frontend derlemesi basarisiz.
    cd ..
    pause
    exit /b 1
)
cd ..

REM --- 2) React ciktisini backend'in wwwroot klasorune kopyala ---
echo [2/3] Frontend ciktisi backend'e kopyalaniyor...
if exist "MyApp.Api\wwwroot" rmdir /s /q "MyApp.Api\wwwroot"
mkdir "MyApp.Api\wwwroot"
xcopy /E /I /Y /Q "myapp-client\dist\*" "MyApp.Api\wwwroot\" >nul

REM --- 3) Backend'i yayinla ---
echo [3/3] Backend yayinlaniyor...
cd MyApp.Api
call dotnet publish -c Release -o "..\yayin"
if errorlevel 1 (
    echo [HATA] Backend yayinlamasi basarisiz.
    cd ..
    pause
    exit /b 1
)
cd ..

REM --- Hizmet kurulum scriptlerini yayin klasorune kopyala ---
copy /Y "HizmetKur.bat" "yayin\" >nul
copy /Y "HizmetKaldir.bat" "yayin\" >nul

echo.
echo ==========================================
echo   HAZIR!
echo.
echo   Paket klasoru: %~dp0yayin
echo.
echo   SUNUCUYA KURULUM:
echo   1) 'yayin' klasorunun TAMAMINI sunucuya kopyalayin
echo   2) appsettings.Production.json dosyasini duzenleyin
echo      (veritabani baglantisi + Jwt anahtari)
echo   3) HizmetKur.bat dosyasina SAG TIK - Yonetici olarak calistir
echo.
echo   Detaylar icin README.md ^> "Sunucuya Kurulum"
echo ==========================================
echo.
pause
