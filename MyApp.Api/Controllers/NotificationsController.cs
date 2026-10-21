using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MyApp.Api.Data;
using MyApp.Api.Models.Dtos;

namespace MyApp.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class NotificationsController : ControllerBase
{
    private readonly AppDbContext _db;

    public NotificationsController(AppDbContext db)
    {
        _db = db;
    }

    private int CurrentUserId => int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    [HttpGet]
    public async Task<ActionResult<IEnumerable<NotificationResponse>>> GetMine()
    {
        var list = await _db.Notifications
            .Where(n => n.UserId == CurrentUserId)
            .OrderByDescending(n => n.CreatedAt)
            .Take(50)
            .Select(n => new NotificationResponse(n.Id, n.Message, n.TicketId, n.IsRead, n.CreatedAt))
            .ToListAsync();

        return Ok(list);
    }

    [HttpPut("{id:int}/read")]
    public async Task<IActionResult> MarkRead(int id)
    {
        var n = await _db.Notifications.FirstOrDefaultAsync(x => x.Id == id && x.UserId == CurrentUserId);
        if (n is null) return NotFound();
        n.IsRead = true;
        await _db.SaveChangesAsync();
        return NoContent();
    }

    [HttpPut("read-all")]
    public async Task<IActionResult> MarkAllRead()
    {
        var unread = await _db.Notifications.Where(x => x.UserId == CurrentUserId && !x.IsRead).ToListAsync();
        foreach (var n in unread) n.IsRead = true;
        await _db.SaveChangesAsync();
        return NoContent();
    }
}
