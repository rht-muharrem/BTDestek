namespace MyApp.Api.Models;

public class User
{
    public int Id { get; set; }
    public string FullName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string PasswordHash { get; set; } = string.Empty;
    public UserRole Role { get; set; } = UserRole.Requester;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Active Directory / Windows kimliğiyle eşleşen alan (örn. "SIRKET\ayse.yilmaz").
    // Windows Authentication ile otomatik giriş yapan kullanıcılar için doldurulur.
    public string? WindowsUsername { get; set; }

    // Active Directory'den otomatik çekilen ek bilgiler (WindowsUsername ile girenler için doldurulur)
    public string? Department { get; set; }
    public string? JobTitle { get; set; }
    public string? Manager { get; set; }
    public string? Phone { get; set; }
    public string? Office { get; set; }

    // Navigation
    public List<Ticket> CreatedTickets { get; set; } = new();
    public List<Ticket> AssignedTickets { get; set; } = new();
}
