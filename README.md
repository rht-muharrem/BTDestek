# Destek Talep Sistemi (IT Ticket System)

ASP.NET Core Web API (C# + EF Core + MSSQL + JWT Auth) ve React (TypeScript) ile hazırlanmış,
bilgi işlem departmanına destek talebi açma/yönetme uygulaması.

## Özellikler

- **Kayıt / Giriş** (JWT tabanlı kimlik doğrulama) + **Windows/AD ile otomatik giriş** (domain ortamında)
- **Kurumsal marka özelleştirme**: Şirket logosu ve adı Admin panelinden yüklenebilir — sidebar,
  giriş ekranı ve tarayıcı sekme ikonunda (favicon) otomatik görünür
- **İki rol**: `Requester` (normal kullanıcı) ve `ITStaff` (bilgi işlem personeli)
- Kullanıcı: talep oluşturur, sadece **kendi taleplerini** görür
- IT personeli: **tüm talepleri** görür, bir talebi **üstüne alır**, **durumunu günceller**
- **Yorum/geçmiş akışı**, **dosya/ekran görüntüsü eki**, **kategori etiketi**
- **Arama ve filtreleme**, **talep kapatma onayı**, **memnuniyet puanlama (yıldız)**
- **Öncelik otomatik yükseltme** (arka planda çalışan servis)
- **Toplu işlem** (çoklu seçip üstlenme/durum güncelleme) ve **talep birleştirme**
- **SLA takibi**: her talep kartında canlı geri sayım, Dashboard'da SLA aşan talepler listesi
- **Bildirimler**: uygulama içi bildirim zili + e-posta bildirimi (şu an konsola loglanan simülasyon)
- **Admin paneli**, **Denetim kaydı (audit log)**, **Dashboard/raporlama** (Word/PDF olarak indirilebilir)
- **Oturum zaman aşımı uyarısı**, **karanlık mod**, **mobil uyumlu arayüz**
- **Gerçek zamanlı güncellemeler (SignalR)**: yeni talep, yeni yorum ve durum değişiklikleri sayfa
  yenilenmeden anında ekrana düşer
- **Genişletilmiş Active Directory entegrasyonu**: Windows girişinde departman, unvan, yönetici,
  telefon, ofis bilgisi otomatik çekilir (Admin panelinde "AD Bilgisi" ile görüntülenebilir)
- **Envanter / Varlık Yönetimi**: şirket cihazlarını (bilgisayar, laptop, yazıcı, switch, sunucu vb.)
  kayıt altına alma, kullanıcıya zimmetleme, bir talebe cihaz bağlama ve cihaz bazlı talep geçmişi
- **AI destekli talep önerisi**: Kullanıcı talep yazarken kategori, alt kategori, öncelik, önerilen
  ekip ve geçmişteki benzer talepler otomatik önerilir (bkz. aşağıdaki "AI Katmanı" bölümü)

### 🤖 AI Katmanı Hakkında Not

`Services/RuleBasedAiSuggestionService.cs` **varsayılan olarak aktif** ve hiçbir API anahtarı
gerektirmez — anahtar kelime eşleştirmesiyle çalışır (örn. "internet", "vpn" geçen bir talep
otomatik "Ağ" kategorisine, "acil"/"sunucu" gibi ifadeler yüksek önceliğe işaret eder).

Gerçek bir yapay zekaya (Claude API) geçmek istersen:
1. [console.anthropic.com](https://console.anthropic.com) üzerinden bir API anahtarı al
2. `MyApp.Api/appsettings.json` içindeki `"Anthropic": { "ApiKey": "" }` alanına anahtarını yapıştır
3. Başka hiçbir şey yapmana gerek yok — `Program.cs` anahtar varsa otomatik olarak
   `ClaudeAiSuggestionService`'i devreye sokuyor, anahtar geldiği anda "gerçek AI" çalışmaya başlar

İki servis de aynı arayüzü (`IAiSuggestionService`) kullandığı için controller ve frontend
tarafında hiçbir değişiklik gerekmiyor.

### 🔌 Gerçek Zamanlı (SignalR) Hakkında Not

`Hubs/TicketHub.cs` üzerinden çalışır. IT personeli ekranındayken yeni bir talep açıldığında
listeye anında düşer ve kısa süre kırmızı çerçeveyle vurgulanır; bir talebin detayı açıkken biri
yorum yazarsa sayfa yenilenmeden görünür. Sunucuya bağlanılamazsa (backend kapalıysa) sessizce
devre dışı kalır, uygulamanın geri kalanı normal (polling ile) çalışmaya devam eder.

### 🏢 Active Directory Genişletmesi Hakkında Not

`Services/ActiveDirectoryService.cs`, `System.DirectoryServices.AccountManagement` kullanır —
bu **sadece domain'e bağlı bir Windows makinesinde** çalışır (Windows Authentication ile aynı
kısıt). Domain dışı bir ortamda (Mac/Linux geliştirme, domain dışı Windows) sessizce atlanır,
giriş akışını bozmaz — sadece ek profil bilgileri boş kalır.

### 📧 E-posta Bildirimi Hakkında Not

Gerçek bir SMTP sunucu bilgisi verilmediği için e-postalar şu an **gerçekten gönderilmiyor**,
sadece backend konsoluna loglanıyor (`Services/ConsoleEmailService.cs`). Gerçek gönderim için
SMTP bilgilerinizi paylaştığınızda `SmtpEmailService : IEmailService` sınıfını birlikte ekleriz.

### ⏫ Öncelik Otomatik Yükseltme Hakkında Not

`Services/PriorityEscalationService.cs` içindeki eşikler **demo amaçlı kısaltılmış** (dakikalar
cinsinden) — gerçek kullanımda `Thresholds` sözlüğünü saat/gün cinsine çevirmen gerekir.

## Veri Katmanı: SQL Server (EF Core + Migration)

Proje **gerçek bir SQL Server veritabanı** kullanıyor (`MyApp.Api/Data/AppDbContext.cs`) ve
**EF Core Migration** ile şema yönetiyor. Bunun anlamı: proje her genişlediğinde (yeni tablo/alan
eklendiğinde) veritabanını silmene gerek kalmadan, sadece yeni bir migration uygulayarak şemayı
güncelleyebilirsin — mevcut talep/kullanıcı verilerin korunur.

## Klasör Yapısı

```
MyApp/
├── MyApp.Api/          → Backend (ASP.NET Core Web API + EF Core + SQL Server)
└── myapp-client/        → Frontend (React + Vite + TypeScript)
```

## 1. Gereksinimler

- [.NET 8 SDK](https://dotnet.microsoft.com/download)
- [Node.js 18+](https://nodejs.org)
- **SQL Server** (kurulu olmalı — `Server=MUHARREMRAHAT`)

## 2. İlk Kurulum: Migration Oluştur ve Uygula

> Bu adımı **sadece bir kez** yapman gerekiyor (ya da yeni bir migration eklediğimizde tekrar).
> Daha önce `EnsureCreated()` ile oluşturulmuş bir `SupportTicketDb` veritabanın varsa,
> migration'a geçmeden önce onu silmen gerekiyor (aşağıdaki "Eski Veritabanından Geçiş" bölümüne bak).

```bash
# dotnet-ef aracı kurulu değilse (bir kereye mahsus):
dotnet tool install --global dotnet-ef

cd MyApp.Api
dotnet restore
dotnet ef migrations add InitialCreate
dotnet ef database update
```

Bu iki komut: (1) mevcut model'e göre bir migration dosyası üretir, (2) o migration'ı
`MUHARREMRAHAT` sunucusundaki `SupportTicketDb` veritabanına uygulayıp tüm tabloları
(Users, Tickets, Comments, Attachments, Notifications, AuditLogs, Assets) oluşturur.

### Eski (EnsureCreated ile oluşturulmuş) Veritabanından Geçiş

Daha önce uygulamayı çalıştırdıysan ve "Invalid column name" gibi bir hata alıyorsan,
eski veritabanı migration geçmişini bilmiyor demektir. SSMS'te ya da `sqlcmd` ile:

```powershell
sqlcmd -S MUHARREMRAHAT -Q "DROP DATABASE SupportTicketDb"
```

çalıştırıp yukarıdaki `dotnet ef database update` komutunu tekrar çalıştır.

## 3. Backend'i Çalıştır

```bash
cd MyApp.Api
dotnet run
```

Uygulama açılırken `DbSeeder.cs` otomatik olarak 2 varsayılan hesap ekler (yoksa):

| Rol | E-posta | Şifre |
|---|---|---|
| Bilgi İşlem Personeli | `itstaff@example.com` | `Staff123!` |
| Normal Kullanıcı (örnek) | `demo@example.com` | `Demo123!` |

API adresi: `http://localhost:5000` — Swagger: `http://localhost:5000/swagger`

> Veriler **kalıcı** — uygulamayı kapatıp açtığında talepler ve kullanıcılar silinmez.

### Modele Yeni Bir Alan/Tablo Eklendiğinde (bundan sonraki geliştirmeler için)

Ben modele (User/Ticket/Asset vb.) yeni bir alan eklediğimde, sen şunu çalıştırman yeterli —
veritabanını silmene gerek yok, mevcut veriler korunur:

```bash
cd MyApp.Api
dotnet ef migrations add <KisaBirIsim>
dotnet ef database update
```

## 4. Frontend'i Çalıştır

```bash
cd myapp-client
npm install
npm run dev
```

Uygulama: `http://localhost:5173`

## ⚡ Kolay Yol: Tek Tıkla Başlatma

İlk kurulumu (migration) bir kez yaptıktan sonra, her seferinde iki ayrı terminal açmak yerine
proje kök klasöründeki dosyaya **çift tıklaman yeterli**:

| Dosya | Ne yapar |
|---|---|
| **`Baslat.bat`** | Backend + frontend'i ayrı pencerelerde başlatır, tarayıcıyı otomatik açar |
| **`Durdur.bat`** | Çalışan backend ve frontend süreçlerini kapatır |

`Baslat.bat` ilk çalıştığında `node_modules` yoksa `npm install`'ı da kendisi çalıştırır, yani
zip'i açıp doğrudan çift tıklayabilirsin. .NET SDK veya Node.js kurulu değilse uyarı verip durur.

> Not: Bu dosyalar yalnızca uygulamayı çalıştırır — veritabanı şeması değiştiğinde
> (`dotnet ef database update`) yine manuel çalıştırman gerekir.

## Kullanım Akışı

1. **Normal kullanıcı** olarak `/register` üzerinden kayıt ol → giriş yap → "Yeni Talep" ile destek talebi oluştur.
2. **Bilgi işlem personeli** olarak yukarıdaki hesapla giriş yap → tüm talepleri gör → üstlen → durum güncelle.
3. Kullanıcı sadece **kendi geçmiş taleplerini** görür; artık bu veri SQL Server'da kalıcı olarak duruyor.

## Yeni Bilgi İşlem Personeli Ekleme

```
POST /api/auth/register-staff
Authorization: Bearer <IT_PERSONELI_TOKEN>
Body: { "fullName": "...", "email": "...", "password": "..." }
```

Swagger UI üzerinden (Authorize → token gir → endpoint'i dene) kolayca yapılabilir.

## Veri Yapısı (özet)

- **User**: Id, FullName, Email (benzersiz), PasswordHash, Role, WindowsUsername, CreatedAt
- **Ticket**: Id, Title, Description, Status, Priority, Category, CreatedByUserId,
  AssignedToUserId, CreatedAt/UpdatedAt/ResolvedAt/ClosedAt, SatisfactionRating, MergedIntoTicketId
- **TicketComment**, **TicketAttachment**: TicketId'ye bağlı, yazar/yükleyen bilgisiyle
- **AppNotification**: UserId'ye bağlı, okunma durumu
- **AuditLog**: Kim/ne zaman/ne yaptı kaydı (sistem eylemleri "Sistem (otomatik)" olarak görünür)

## Windows Authentication (Otomatik Giriş) — Active Directory Ortamları İçin

Domain'e bağlı bir şirket ağında çalıştırıldığında, kullanıcı **hiçbir login formu görmeden**
otomatik olarak tanınır:

1. Tarayıcı `POST /api/auth/windows-login` isteğini Kerberos/NTLM ile otomatik gönderir
2. Backend domain kullanıcı adını okur; sistemde yoksa **Requester** rolüyle otomatik oluşturur
   (artık veritabanında kalıcı olarak saklanır)
3. JWT token üretilir, kullanıcı doğrudan "Taleplerim" ekranına yönlenir

Kısıtlar: API'nin domain'e bağlı bir Windows makinesinde çalışması gerekir; Firefox yerine
Edge/Chrome kullanın.

## 🚀 Sunucuya Kurulum (Production)

Üretimde frontend ve backend **tek bir uygulama** olarak yayınlanır: React derlemesi
backend'in `wwwroot` klasörüne kopyalanır ve ASP.NET Core hem API'yi hem sayfaları
aynı adresten sunar. Bu sayede CORS ayarına gerek kalmaz ve tek klasör dağıtmak yeterlidir.

### A) Önce Kendi Bilgisayarında Dene (IIS gerekmez — en kolay yol)

Uygulama kendi web sunucusunu (Kestrel) içerdiği için IIS kurmadan da çalışır:

1. **`YayinPaketiHazirla.bat`** → çift tıkla (React'i derler, `yayin` klasörünü hazırlar)
2. **`YayiniCalistir.bat`** → çift tıkla

Tarayıcı otomatik `http://localhost:8080` adresinde açılır. Script ayrıca bilgisayarının
IP adresini de yazdırır — ağdaki başka bir bilgisayardan `http://SENIN_IP:8080` ile
erişmeyi deneyebilirsin (Windows Güvenlik Duvarı ilk seferde izin isteyebilir).

> Bu, sunucuya taşımadan önce her şeyin üretim modunda düzgün çalıştığını görmek için
> ideal bir ara adım — geliştirme sunucusundan (Vite) farklı olarak gerçek derlenmiş
> sürümü çalıştırır.

### B) Sunucuya Windows Hizmeti Olarak Kurma (önerilen)

Windows hizmeti olarak kurulduğunda uygulama **sunucu her açıldığında otomatik başlar**,
kimsenin oturum açmasına gerek kalmaz ve çökerse kendini yeniden başlatır. IIS gerekmez.

#### 1. Paketi hazırla (geliştirme makinende)

**`YayinPaketiHazirla.bat`** → çift tıkla. `yayin` klasörü oluşur (hizmet scriptleri de içinde).

#### 2. Sunucuya kopyala

`yayin` klasörünün tamamını sunucuda kalıcı bir yere kopyala, örneğin:

```
C:\Uygulamalar\DestekMasasi\
```

> Masaüstü veya `Downloads` gibi geçici yerlere koyma — hizmet bu yoldan çalışacak.

#### 3. Ayarları düzenle

Sunucudaki `appsettings.Production.json` dosyasını aç:

```json
"Kestrel": {
  "Endpoints": { "Http": { "Url": "http://0.0.0.0:8080" } }
},
"ConnectionStrings": {
  "DefaultConnection": "Server=localhost;Database=SupportTicketDb;Trusted_Connection=True;TrustServerCertificate=True;"
},
"Jwt": {
  "Key": "buraya-rastgele-en-az-32-karakterlik-gizli-bir-metin-yaz"
}
```

- **Port**: 8080 kullanılıyorsa başka bir port seç (ör. 5000, 9000)
- **SQL Server** sunucunun kendisindeyse `localhost` yeterli; başka makinedeyse adını/IP'sini yaz
- **Jwt:Key**'i mutlaka değiştir

#### 4. Veritabanını oluştur

Geliştirme makinenden, sunucudaki veritabanına:

```powershell
cd MyApp.Api
dotnet ef database update --connection "Server=192.168.2.185;Database=SupportTicketDb;Trusted_Connection=True;TrustServerCertificate=True;"
```

SQL Server yalnızca sunucudan erişilebilir durumdaysa, bunun yerine sunucuda
SSMS ile boş bir `SupportTicketDb` veritabanı oluştur — uygulama ilk çalıştığında
tabloları kendisi kuracaktır.

#### 5. Hizmeti kur

Sunucuda `yayin` klasöründeki **`HizmetKur.bat`** dosyasına **sağ tık → Yönetici olarak çalıştır**.

Script şunları yapar:
- `DestekMasasi` adında bir Windows hizmeti oluşturur (başlangıç türü: **Otomatik**)
- Çökme durumunda kendini yeniden başlatacak şekilde ayarlar
- Güvenlik duvarında ilgili portu açar
- Hizmeti başlatır

#### 6. Test et

Tarayıcıda `http://192.168.2.185:8080` adresini aç.

### Hizmet Hesabı ve Veritabanı Yetkisi

Hizmet varsayılan olarak **LocalSystem** hesabıyla çalışır. `Trusted_Connection=True`
kullanıyorsan bu hesabın SQL Server'da yetkisi olmalı. İki seçenek:

**a)** SQL Server'da makine hesabına yetki ver (SSMS → Security → Logins → New Login →
`DOMAIN\SUNUCUADI$` → db_owner)

**b)** Ya da hizmeti belirli bir domain hesabıyla çalıştır:
`services.msc` → Destek Masası → Properties → **Log On** sekmesi → "This account"

> **Active Directory entegrasyonu** için (b) seçeneği daha güvenilirdir: departman/unvan
> bilgilerini AD'den çekebilmek için hizmet hesabının domain'de okuma yetkisi olmalı.

### Hizmet Yönetimi

| İşlem | Nasıl |
|---|---|
| Durumu gör / durdur / başlat | `services.msc` → "Destek Masası" |
| Komut satırından | `sc start DestekMasasi` / `sc stop DestekMasasi` |
| Hata günlükleri | Olay Görüntüleyici → Windows Günlükleri → Uygulama |
| Kaldır | `HizmetKaldir.bat` (Yönetici olarak) |

### Güncelleme Yaparken

1. Geliştirme makinende `YayinPaketiHazirla.bat` çalıştır
2. Sunucuda hizmeti durdur: `sc stop DestekMasasi`
3. `yayin` içeriğini sunucudaki klasöre kopyala —
   **`appsettings.Production.json` dosyasının üzerine yazma!**
4. Hizmeti başlat: `sc start DestekMasasi`

Veritabanı şeması değiştiyse ayrıca `dotnet ef database update` çalıştır.

### Kullanıcıların Tarayıcısını Yönlendirme (opsiyonel)

Chrome'un açılışta doğrudan bu adresi açması için Group Policy'de
`RestoreOnStartupURLs` ayarını `http://192.168.2.185:8080` yapabilirsin.

