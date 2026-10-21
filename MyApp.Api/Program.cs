using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authentication.Negotiate;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using MyApp.Api.Data;
using MyApp.Api.Hubs;
using MyApp.Api.Services;

var builder = WebApplication.CreateBuilder(args);

// --- Windows Service desteği ---
// Uygulama bir Windows hizmeti olarak kurulduğunda devreye girer: hizmet
// yaşam döngüsünü (başlat/durdur) yönetir ve çalışma dizinini exe'nin bulunduğu
// klasöre ayarlar (hizmetler varsayılan olarak System32'de başlar, bu da
// appsettings.json'ın bulunamamasına yol açardı).
builder.Host.UseWindowsService(options =>
{
    options.ServiceName = "DestekMasasi";
});

// --- EF Core / MSSQL ---
var connectionString = builder.Configuration.GetConnectionString("DefaultConnection");
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlServer(connectionString));

// --- JWT Authentication (normal e-posta/şifre girişi + tüm API çağrıları için) ---
var jwtSection = builder.Configuration.GetSection("Jwt");
var jwtKey = jwtSection["Key"]!;

builder.Services.AddAuthentication(options =>
{
    // Varsayılan şema JWT: /api/tickets gibi normal endpoint'ler bunu kullanır.
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuer = true,
        ValidateAudience = true,
        ValidateLifetime = true,
        ValidateIssuerSigningKey = true,
        ValidIssuer = jwtSection["Issuer"],
        ValidAudience = jwtSection["Audience"],
        IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey))
    };

    // SignalR WebSocket bağlantıları Authorization header'ı gönderemez;
    // token'ı query string'den (?access_token=...) okumamız gerekiyor.
    options.Events = new JwtBearerEvents
    {
        OnMessageReceived = context =>
        {
            var accessToken = context.Request.Query["access_token"];
            var path = context.HttpContext.Request.Path;
            if (!string.IsNullOrEmpty(accessToken) && path.StartsWithSegments("/hubs"))
            {
                context.Token = accessToken;
            }
            return Task.CompletedTask;
        }
    };
})
// Windows Authentication (Kerberos/NTLM) — sadece /api/auth/windows-login endpoint'i kullanır.
.AddNegotiate();

builder.Services.AddAuthorization();
builder.Services.AddScoped<TokenService>();
builder.Services.AddScoped<ActiveDirectoryService>();
builder.Services.AddSignalR();

// --- Servisler: e-posta bildirimi (mock/log) + otomatik öncelik yükseltme ---
builder.Services.AddScoped<IEmailService, ConsoleEmailService>();
builder.Services.AddHostedService<PriorityEscalationService>();

// --- AI öneri katmanı: Anthropic:ApiKey appsettings.json'da tanımlıysa gerçek Claude API'yi,
// tanımlı değilse hiçbir anahtar gerektirmeyen kural tabanlı öneri motorunu kullanır.
var anthropicApiKey = builder.Configuration["Anthropic:ApiKey"];
if (!string.IsNullOrWhiteSpace(anthropicApiKey))
{
    builder.Services.AddHttpClient<IAiSuggestionService, ClaudeAiSuggestionService>();
}
else
{
    builder.Services.AddScoped<IAiSuggestionService, RuleBasedAiSuggestionService>();
}

// --- Controllers & Swagger ---
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(options =>
{
    // Swagger UI üzerinden "Authorize" ile JWT token girebilmek için
    options.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Name = "Authorization",
        Type = SecuritySchemeType.Http,
        Scheme = "Bearer",
        BearerFormat = "JWT",
        In = ParameterLocation.Header,
        Description = "JWT token'ı 'Bearer {token}' formatında girin."
    });
    options.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme
            {
                Reference = new OpenApiReference { Type = ReferenceType.SecurityScheme, Id = "Bearer" }
            },
            Array.Empty<string>()
        }
    });
});

// --- CORS ---
// Sadece GELİŞTİRME için gerekli: orada React (5173) ve API (5000) ayrı portlarda çalışır.
// Üretimde ikisi aynı adresten sunulduğu için CORS devreye girmez.
const string CorsPolicyName = "AllowReactApp";
var devClientUrl = builder.Configuration["ClientUrl"] ?? "http://localhost:5173";
builder.Services.AddCors(options =>
{
    options.AddPolicy(CorsPolicyName, policy =>
    {
        policy.WithOrigins(devClientUrl)
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials(); // Windows kimlik bilgilerinin tarayıcıdan gönderilebilmesi için şart
    });
});

var app = builder.Build();

// --- Veritabanını oluştur + varsayılan hesapları ekle ---
// Windows hizmeti olarak çalışırken uygulama, SQL Server'dan ÖNCE başlayabiliyor.
// Bu yüzden birkaç kez tekrar deniyoruz — ancak toplam süre, Windows'un hizmetlere
// tanıdığı 30 saniyelik başlatma limitini AŞMAMALI, yoksa "Error 1053" alınır.
// 4 deneme x 3 saniye = en fazla ~12 saniye bekleme.
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    var startupLogger = scope.ServiceProvider.GetRequiredService<ILogger<Program>>();

    const int maxAttempts = 4;
    for (var attempt = 1; attempt <= maxAttempts; attempt++)
    {
        try
        {
            DbSeeder.Seed(db);
            startupLogger.LogInformation("Veritabanı hazır.");
            break;
        }
        catch (Exception ex) when (attempt < maxAttempts)
        {
            startupLogger.LogWarning(ex,
                "Veritabanına bağlanılamadı ({Attempt}/{Max}). 3 saniye sonra tekrar denenecek.",
                attempt, maxAttempts);
            Thread.Sleep(TimeSpan.FromSeconds(3));
        }
        catch (Exception ex)
        {
            // Son deneme de başarısız: hatayı Olay Görüntüleyici'ye yaz ve uygulamayı
            // yine de başlat. Böylece hizmet ayakta kalır, sorunu web arayüzündeki
            // hata mesajından veya günlükten teşhis edebilirsin.
            startupLogger.LogError(ex,
                "Veritabanına {Max} denemede bağlanılamadı. Bağlantı dizesini kontrol edin.",
                maxAttempts);
        }
    }
}

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
    // HTTPS yönlendirmesi sadece geliştirmede: üretimde bunu IIS/ters proxy yapar,
    // uygulama içinde tekrar yönlendirmek sonsuz döngüye yol açabiliyor.
    app.UseHttpsRedirection();
}

// --- React derlemesini (wwwroot) sun ---
// Üretimde frontend ve backend AYNI adresten yayınlanır: bu sayede CORS'a gerek kalmaz
// ve tek bir uygulama dağıtmak yeterli olur.
app.UseDefaultFiles();
app.UseStaticFiles();

app.UseCors(CorsPolicyName);

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();
app.MapHub<TicketHub>("/hubs/tickets");

// React Router istemci tarafında çalıştığı için, /tickets veya /admin gibi adresler
// doğrudan açıldığında (F5) sunucu bunları bilmez — hepsini index.html'e yönlendiriyoruz.
app.MapFallbackToFile("index.html");

app.Run();
