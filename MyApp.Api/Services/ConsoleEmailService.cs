namespace MyApp.Api.Services;

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
