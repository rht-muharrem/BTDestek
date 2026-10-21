using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MyApp.Api.Data;
using MyApp.Api.Models;
using MyApp.Api.Models.Dtos;

namespace MyApp.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class AssetsController : ControllerBase
{
    private readonly AppDbContext _db;

    public AssetsController(AppDbContext db)
    {
        _db = db;
    }

    private int CurrentUserId => int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
    private string CurrentUserRole => User.FindFirstValue(ClaimTypes.Role)!;

    private async Task<AssetResponse> ToResponseAsync(Asset a)
    {
        var assignedUser = a.AssignedUserId.HasValue
            ? await _db.Users.FirstOrDefaultAsync(u => u.Id == a.AssignedUserId)
            : null;

        return new AssetResponse(
            a.Id, a.AssetTag, a.Type.ToString(), a.Brand, a.Model, a.SerialNumber,
            a.IpAddress, a.MacAddress, a.OperatingSystem, a.Ram, a.Cpu,
            a.AssignedUserId, assignedUser?.FullName, a.Department, a.Location, a.Notes,
            a.IsRetired, a.CreatedAt, a.UpdatedAt
        );
    }

    // IT personeli -> tüm envanteri görür. Normal kullanıcı -> sadece bu endpoint'i kullanamaz,
    // "mine" endpoint'ini kullanır (kendi cihazlarını görmek için).
    [HttpGet]
    [Authorize(Roles = "ITStaff")]
    public async Task<ActionResult<IEnumerable<AssetResponse>>> GetAll([FromQuery] string? search, [FromQuery] string? type)
    {
        var query = _db.Assets.AsQueryable();

        if (!string.IsNullOrWhiteSpace(search))
        {
            var s = search.Trim();
            query = query.Where(a =>
                EF.Functions.Like(a.AssetTag, $"%{s}%") ||
                (a.Brand != null && EF.Functions.Like(a.Brand, $"%{s}%")) ||
                (a.Model != null && EF.Functions.Like(a.Model, $"%{s}%")) ||
                (a.SerialNumber != null && EF.Functions.Like(a.SerialNumber, $"%{s}%")));
        }

        if (!string.IsNullOrWhiteSpace(type) && Enum.TryParse<AssetType>(type, true, out var t))
            query = query.Where(a => a.Type == t);

        var assets = await query.OrderBy(a => a.AssetTag).ToListAsync();
        var results = new List<AssetResponse>();
        foreach (var a in assets) results.Add(await ToResponseAsync(a));
        return Ok(results);
    }

    // Kendi üzerine kayıtlı cihazlar -> talep açarken "hangi cihaz" seçimi için kullanılır.
    [HttpGet("mine")]
    public async Task<ActionResult<IEnumerable<AssetResponse>>> GetMine()
    {
        var assets = await _db.Assets.Where(a => a.AssignedUserId == CurrentUserId && !a.IsRetired).ToListAsync();
        var results = new List<AssetResponse>();
        foreach (var a in assets) results.Add(await ToResponseAsync(a));
        return Ok(results);
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<AssetResponse>> GetById(int id)
    {
        var asset = await _db.Assets.FirstOrDefaultAsync(a => a.Id == id);
        if (asset is null) return NotFound();

        if (CurrentUserRole != nameof(UserRole.ITStaff) && asset.AssignedUserId != CurrentUserId)
            return Forbid();

        return Ok(await ToResponseAsync(asset));
    }

    // Bir cihazın geçmişindeki tüm talepler -> "PC-000142 daha önce hangi sorunları yaşamış?"
    [HttpGet("{id:int}/tickets")]
    [Authorize(Roles = "ITStaff")]
    public async Task<ActionResult<IEnumerable<AssetTicketHistoryItem>>> GetTicketHistory(int id)
    {
        var exists = await _db.Assets.AnyAsync(a => a.Id == id);
        if (!exists) return NotFound();

        var history = await _db.Tickets
            .Where(t => t.AssetId == id)
            .OrderByDescending(t => t.CreatedAt)
            .Select(t => new AssetTicketHistoryItem(t.Id, t.Title, t.Status.ToString(), t.CreatedAt))
            .ToListAsync();

        return Ok(history);
    }

    [HttpPost]
    [Authorize(Roles = "ITStaff")]
    public async Task<ActionResult<AssetResponse>> Create(CreateAssetRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.AssetTag))
            return BadRequest("Varlık etiketi (Asset Tag) zorunludur.");

        if (await _db.Assets.AnyAsync(a => a.AssetTag == request.AssetTag))
            return BadRequest("Bu varlık etiketi zaten kullanılıyor.");

        if (!Enum.TryParse<AssetType>(request.Type, true, out var type))
            return BadRequest("Geçersiz cihaz tipi.");

        var asset = new Asset
        {
            AssetTag = request.AssetTag.Trim(),
            Type = type,
            Brand = request.Brand,
            Model = request.Model,
            SerialNumber = request.SerialNumber,
            IpAddress = request.IpAddress,
            MacAddress = request.MacAddress,
            OperatingSystem = request.OperatingSystem,
            Ram = request.Ram,
            Cpu = request.Cpu,
            AssignedUserId = request.AssignedUserId,
            Department = request.Department,
            Location = request.Location,
            Notes = request.Notes
        };

        _db.Assets.Add(asset);
        await _db.SaveChangesAsync();
        return CreatedAtAction(nameof(GetById), new { id = asset.Id }, await ToResponseAsync(asset));
    }

    [HttpPut("{id:int}")]
    [Authorize(Roles = "ITStaff")]
    public async Task<ActionResult<AssetResponse>> Update(int id, UpdateAssetRequest request)
    {
        var asset = await _db.Assets.FirstOrDefaultAsync(a => a.Id == id);
        if (asset is null) return NotFound();

        if (!Enum.TryParse<AssetType>(request.Type, true, out var type))
            return BadRequest("Geçersiz cihaz tipi.");

        asset.Type = type;
        asset.Brand = request.Brand;
        asset.Model = request.Model;
        asset.SerialNumber = request.SerialNumber;
        asset.IpAddress = request.IpAddress;
        asset.MacAddress = request.MacAddress;
        asset.OperatingSystem = request.OperatingSystem;
        asset.Ram = request.Ram;
        asset.Cpu = request.Cpu;
        asset.AssignedUserId = request.AssignedUserId;
        asset.Department = request.Department;
        asset.Location = request.Location;
        asset.Notes = request.Notes;
        asset.IsRetired = request.IsRetired;
        asset.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync();
        return Ok(await ToResponseAsync(asset));
    }

    [HttpDelete("{id:int}")]
    [Authorize(Roles = "ITStaff")]
    public async Task<IActionResult> Delete(int id)
    {
        var asset = await _db.Assets.FirstOrDefaultAsync(a => a.Id == id);
        if (asset is null) return NotFound();

        _db.Assets.Remove(asset);
        await _db.SaveChangesAsync();
        return NoContent();
    }
}
