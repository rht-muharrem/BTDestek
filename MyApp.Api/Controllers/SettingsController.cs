using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MyApp.Api.Data;
using MyApp.Api.Models;
using MyApp.Api.Models.Dtos;

namespace MyApp.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class SettingsController : ControllerBase
{
    private readonly AppDbContext _db;

    public SettingsController(AppDbContext db)
    {
        _db = db;
    }

    // Login ekranı bile bu bilgiyi göstermesi gerektiği için (henüz giriş yapılmamışken)
    // bu endpoint kimlik doğrulaması gerektirmiyor.
    [HttpGet("branding")]
    [AllowAnonymous]
    public async Task<ActionResult<BrandSettingsResponse>> GetBranding()
    {
        var settings = await _db.BrandSettings.FirstOrDefaultAsync(b => b.Id == 1);
        if (settings is null)
            return Ok(new BrandSettingsResponse("Destek Masası", null));

        var logoDataUrl = settings.LogoDataBase64 is not null
            ? $"data:{settings.LogoContentType};base64,{settings.LogoDataBase64}"
            : null;

        return Ok(new BrandSettingsResponse(settings.CompanyName, logoDataUrl));
    }

    [HttpPut("branding")]
    [Authorize(Roles = "ITStaff")]
    public async Task<ActionResult<BrandSettingsResponse>> UpdateBranding(UpdateBrandSettingsRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.CompanyName))
            return BadRequest("Şirket adı boş olamaz.");

        // Logo yaklaşık 2MB'ı geçmesin — base64 olarak ~%33 daha büyük saklanır, veritabanını şişirmesin diye.
        if (request.LogoBase64 is { Length: > 2_800_000 })
            return BadRequest("Logo çok büyük (maksimum ~2MB).");

        var settings = await _db.BrandSettings.FirstOrDefaultAsync(b => b.Id == 1);
        if (settings is null)
        {
            settings = new BrandSettings { Id = 1 };
            _db.BrandSettings.Add(settings);
        }

        settings.CompanyName = request.CompanyName.Trim();

        // LogoBase64 null gönderilirse mevcut logo korunur; boş string gönderilirse logo kaldırılır.
        if (request.LogoBase64 is not null)
        {
            settings.LogoDataBase64 = request.LogoBase64.Length == 0 ? null : request.LogoBase64;
            settings.LogoContentType = request.LogoBase64.Length == 0 ? null : request.LogoContentType;
        }

        settings.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        var logoDataUrl = settings.LogoDataBase64 is not null
            ? $"data:{settings.LogoContentType};base64,{settings.LogoDataBase64}"
            : null;

        return Ok(new BrandSettingsResponse(settings.CompanyName, logoDataUrl));
    }
}
