namespace MyApp.Api.Models;

public class TicketAttachment
{
    public int Id { get; set; }
    public int TicketId { get; set; }
    public int UploadedByUserId { get; set; }
    public string FileName { get; set; } = string.Empty;
    public string ContentType { get; set; } = string.Empty;
    // Basit çözüm: dosya, base64 olarak bellekte tutuluyor (gerçek dosya sunucusu yok).
    public string DataBase64 { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
