namespace MyApp.Api.Models;

public class Ticket
{
    public int Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public TicketStatus Status { get; set; } = TicketStatus.Open;
    public TicketPriority Priority { get; set; } = TicketPriority.Medium;
    public TicketCategory Category { get; set; } = TicketCategory.Other;

    public int CreatedByUserId { get; set; }
    public int? AssignedToUserId { get; set; }

    public User? CreatedByUser { get; set; }
    public User? AssignedToUser { get; set; }

    public int? AssetId { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }
    public DateTime? ResolvedAt { get; set; }
    public DateTime? ClosedAt { get; set; }

    public bool EscalatedOnce { get; set; }

    public int? SatisfactionRating { get; set; }

    public int? MergedIntoTicketId { get; set; }
}
