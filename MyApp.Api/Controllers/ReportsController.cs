using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MyApp.Api.Data;
using MyApp.Api.Models;
using MyApp.Api.Models.Dtos;
using MyApp.Api.Services;

namespace MyApp.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "ITStaff")]
public class ReportsController : ControllerBase
{
    private readonly AppDbContext _db;

    public ReportsController(AppDbContext db)
    {
        _db = db;
    }

    [HttpGet("summary")]
    public async Task<ActionResult<ReportSummaryResponse>> Summary()
    {
        var tickets = await _db.Tickets.ToListAsync();
        var users = await _db.Users.ToListAsync();
        var now = DateTime.UtcNow;

        var resolvedOrClosed = tickets.Where(t => t.ResolvedAt.HasValue).ToList();
        var avgHours = resolvedOrClosed.Count == 0
            ? 0
            : resolvedOrClosed.Average(t => (t.ResolvedAt!.Value - t.CreatedAt).TotalHours);

        var byCategory = tickets.GroupBy(t => t.Category.ToString()).ToDictionary(g => g.Key, g => g.Count());
        var byPriority = tickets.GroupBy(t => t.Priority.ToString()).ToDictionary(g => g.Key, g => g.Count());

        var byStaff = users
            .Where(u => u.Role == UserRole.ITStaff)
            .Select(staff => new StaffPerformance(
                staff.FullName,
                tickets.Count(t => t.AssignedToUserId == staff.Id),
                tickets.Count(t => t.AssignedToUserId == staff.Id && (t.Status == TicketStatus.Resolved || t.Status == TicketStatus.Closed))
            ))
            .ToList();

        var rated = tickets.Where(t => t.SatisfactionRating.HasValue).ToList();
        double? avgSatisfaction = rated.Count == 0 ? null : Math.Round(rated.Average(t => t.SatisfactionRating!.Value), 2);

        var overdue = tickets
            .Where(t => t.Status == TicketStatus.Open || t.Status == TicketStatus.InProgress)
            .Where(t => (now - t.CreatedAt).TotalHours > SlaPolicy.Hours[t.Priority])
            .Select(t =>
            {
                var assignedTo = t.AssignedToUserId.HasValue ? users.FirstOrDefault(u => u.Id == t.AssignedToUserId) : null;
                return new OverdueTicketInfo(
                    t.Id, t.Title, t.Priority.ToString(), t.Category.ToString(),
                    (int)(now - t.CreatedAt).TotalHours, SlaPolicy.Hours[t.Priority], assignedTo?.FullName
                );
            })
            .OrderByDescending(o => o.HoursOpen - o.SlaHours)
            .ToList();

        var last30 = Enumerable.Range(0, 30)
            .Select(offset => now.Date.AddDays(-29 + offset))
            .Select(day => new DailyCount(day.ToString("dd.MM"), tickets.Count(t => t.CreatedAt.Date == day)))
            .ToList();

        var response = new ReportSummaryResponse(
            tickets.Count,
            tickets.Count(t => t.Status == TicketStatus.Open),
            tickets.Count(t => t.Status == TicketStatus.InProgress),
            tickets.Count(t => t.Status == TicketStatus.Resolved),
            tickets.Count(t => t.Status == TicketStatus.Closed),
            Math.Round(avgHours, 1),
            byCategory,
            byPriority,
            byStaff,
            avgSatisfaction,
            rated.Count,
            overdue,
            last30
        );

        return Ok(response);
    }
}
