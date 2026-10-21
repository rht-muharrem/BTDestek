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

    // AppDbContext.cs içindeki ilişkiler için navigasyon alanları
    public User? CreatedByUser { get; set; }
    public User? AssignedToUser { get; set; }

    // Talebin ilgili olduğu cihaz/varlık (opsiyonel) — Envanter modülüyle bağlantı
    public int? AssetId { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }
    public DateTime? ResolvedAt { get; set; }
    public DateTime? ClosedAt { get; set; }

    // Otomatik öncelik yükseltmesinin tekrar tekrar tetiklenmemesi için
    public bool EscalatedOnce { get; set; }

    // Kullanıcının kapanan talebe verdiği memnuniyet puanı (1-5)
    public int? SatisfactionRating { get; set; }

    // Bu talep başka (asıl/ana) bir talebe birleştirildiyse, o talebin Id'si
    public int? MergedIntoTicketId { get; set; }
}
