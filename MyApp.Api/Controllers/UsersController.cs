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
[Authorize(Roles = "ITStaff")]
public class UsersController : ControllerBase
{
    private readonly AppDbContext _db;

    public UsersController(AppDbContext db)
    {
        _db = db;
    }

    private int CurrentUserId => int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    [HttpGet]
    public async Task<ActionResult<IEnumerable<UserAdminResponse>>> GetAll()
    {
        var users = await _db.Users
            .OrderBy(u => u.FullName)
            .Select(u => new UserAdminResponse(
                u.Id, u.FullName, u.Email, u.Role.ToString(), u.WindowsUsername, u.CreatedAt,
                u.Department, u.JobTitle, u.Manager, u.Phone, u.Office))
            .ToListAsync();

        return Ok(users);
    }

    [HttpPut("{id:int}/role")]
    public async Task<IActionResult> UpdateRole(int id, UpdateUserRoleRequest request)
    {
        if (!Enum.TryParse<UserRole>(request.Role, true, out var newRole))
            return BadRequest("Geçersiz rol.");

        var user = await _db.Users.FirstOrDefaultAsync(u => u.Id == id);
        if (user is null) return NotFound();

        var me = await _db.Users.FirstAsync(u => u.Id == CurrentUserId);
        var previousRole = user.Role;
        user.Role = newRole;

        _db.AuditLogs.Add(new AuditLog
        {
            Action = "RoleChanged",
            EntityType = "User",
            EntityId = user.Id,
            PerformedByUserId = me.Id,
            PerformedByName = me.FullName,
            Details = $"{user.FullName} kullanıcısının rolü {previousRole} -> {newRole} olarak değiştirildi."
        });

        await _db.SaveChangesAsync();
        return NoContent();
    }
}
