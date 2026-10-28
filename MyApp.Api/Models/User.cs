namespace MyApp.Api.Models;

public class User
{
    public int Id { get; set; }
    public string FullName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string PasswordHash { get; set; } = string.Empty;
    public UserRole Role { get; set; } = UserRole.Requester;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public string? WindowsUsername { get; set; }

    public string? Department { get; set; }
    public string? JobTitle { get; set; }
    public string? Manager { get; set; }
    public string? Phone { get; set; }
    public string? Office { get; set; }

    public List<Ticket> CreatedTickets { get; set; } = new();
    public List<Ticket> AssignedTickets { get; set; } = new();
}
