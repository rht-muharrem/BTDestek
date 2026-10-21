namespace MyApp.Api.Models;

// Tek satırlık (singleton) ayar tablosu — her zaman Id=1 kullanılır.
public class BrandSettings
{
    public int Id { get; set; } = 1;
    public string CompanyName { get; set; } = "Destek Masası";

    // Logo, veritabanında base64 olarak saklanır (küçük bir dosya olduğu için — ekler gibi)
    public string? LogoDataBase64 { get; set; }
    public string? LogoContentType { get; set; }

    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
