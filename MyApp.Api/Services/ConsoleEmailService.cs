namespace MyApp.Api.Services;

// GEÇİCİ: Gerçek bir SMTP sunucusu tanımlanana kadar e-postaları konsola loglar.
// Gerçek gönderim için: appsettings.json'a SMTP ayarlarını ekleyip bu sınıfı
// System.Net.Mail.SmtpClient (veya MailKit) kullanan bir SmtpEmailService ile değiştir,
// sonra Program.cs'te "AddScoped<IEmailService, ConsoleEmailService>()" satırını güncelle.
public class ConsoleEmailService : IEmailService
{
    private readonly ILogger<ConsoleEmailService> _logger;

    public ConsoleEmailService(ILogger<ConsoleEmailService> logger)
    {
        _logger = logger;
    }

    public Task SendAsync(string toEmail, string subject, string body)
    {
        _logger.LogInformation("📧 [MOCK E-POSTA] Kime: {To} | Konu: {Subject} | İçerik: {Body}", toEmail, subject, body);
        return Task.CompletedTask;
    }
}
