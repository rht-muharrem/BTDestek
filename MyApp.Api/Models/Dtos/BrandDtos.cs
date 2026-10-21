namespace MyApp.Api.Models.Dtos;

public record BrandSettingsResponse(string CompanyName, string? LogoDataUrl);

public record UpdateBrandSettingsRequest(string CompanyName, string? LogoBase64, string? LogoContentType);
