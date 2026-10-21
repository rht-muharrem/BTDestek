using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MyApp.Api.Data;
using MyApp.Api.Models.Dtos;

namespace MyApp.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "ITStaff")]
public class AuditController : ControllerBase
{
    private readonly AppDbContext _db;

    public AuditController(AppDbContext db)
    {
        _db = db;
    }

    // GET /api/audit?entityType=Ticket&action=StatusChanged&search=...
    [HttpGet]
    public async Task<ActionResult<IEnumerable<AuditLogResponse>>> GetAll(
        [FromQuery] string? entityType,
        [FromQuery] string? action,
        [FromQuery] string? search)
    {
        var query = _db.AuditLogs.AsQueryable();

        if (!string.IsNullOrWhiteSpace(entityType))
            query = query.Where(a => a.EntityType == entityType);

        if (!string.IsNullOrWhiteSpace(action))
            query = query.Where(a => a.Action == action);

        if (!string.IsNullOrWhiteSpace(search))
        {
            var s = search.Trim();
            query = query.Where(a => EF.Functions.Like(a.Details, $"%{s}%") || EF.Functions.Like(a.PerformedByName, $"%{s}%"));
        }

        var logs = await query
            .OrderByDescending(a => a.Timestamp)
            .Take(500) // bellek/performans için son 500 kayıt
            .Select(a => new AuditLogResponse(a.Id, a.Action, a.EntityType, a.EntityId, a.PerformedByName, a.Details, a.Timestamp))
            .ToListAsync();

        return Ok(logs);
    }
}
