namespace MyApp.Api.Models;

public class TicketComment
{
    public int Id { get; set; }
    public int TicketId { get; set; }
    public int AuthorUserId { get; set; }
    public string Message { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
