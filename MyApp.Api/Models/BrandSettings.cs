namespace MyApp.Api.Models;

public class BrandSettings
{
    public int Id { get; set; } = 1;
    public string CompanyName { get; set; } = "Destek Masası";

    public string? LogoDataBase64 { get; set; }
    public string? LogoContentType { get; set; }

    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
