using Microsoft.EntityFrameworkCore;
using MyApp.Api.Data;
using MyApp.Api.Models;

namespace MyApp.Api.Services;

public class PriorityEscalationService : BackgroundService
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<PriorityEscalationService> _logger;

    private static readonly Dictionary<TicketPriority, TimeSpan> Thresholds = new()
    {
        [TicketPriority.Critical] = TimeSpan.FromMinutes(2),
        [TicketPriority.High] = TimeSpan.FromMinutes(5),
        [TicketPriority.Medium] = TimeSpan.FromMinutes(15),
        [TicketPriority.Low] = TimeSpan.FromMinutes(30),
    };

    public PriorityEscalationService(IServiceScopeFactory scopeFactory, ILogger<PriorityEscalationService> logger)
    {
        _scopeFactory = scopeFactory;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await CheckAndEscalateAsync();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Öncelik yükseltme kontrolünde hata");
            }

            await Task.Delay(TimeSpan.FromSeconds(30), stoppingToken);
        }
    }

    private async Task CheckAndEscalateAsync()
    {
        using var scope = _scopeFactory.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        var now = DateTime.UtcNow;

        var candidates = await db.Tickets
            .Where(t => t.Status == TicketStatus.Open && !t.EscalatedOnce && t.Priority != TicketPriority.Critical)
            .ToListAsync();

        var staffList = await db.Users.Where(u => u.Role == UserRole.ITStaff).ToListAsync();
        var anyChanges = false;

        foreach (var ticket in candidates)
        {
            if (!Thresholds.TryGetValue(ticket.Priority, out var threshold)) continue;
            if (now - ticket.CreatedAt < threshold) continue;

            var oldPriority = ticket.Priority;
            ticket.Priority = ticket.Priority switch
            {
                TicketPriority.Low => TicketPriority.Medium,
                TicketPriority.Medium => TicketPriority.High,
                TicketPriority.High => TicketPriority.Critical,
                _ => ticket.Priority
            };
            ticket.EscalatedOnce = true;
            ticket.UpdatedAt = now;
            anyChanges = true;

            _logger.LogInformation("⏫ Talep #{Id} önceliği otomatik yükseltildi: {Old} -> {New}", ticket.Id, oldPriority, ticket.Priority);

            db.AuditLogs.Add(new AuditLog
            {
                Action = "PriorityAutoEscalated",
                EntityType = "Ticket",
                EntityId = ticket.Id,
                PerformedByUserId = 0,
                PerformedByName = "Sistem (otomatik)",
                Details = $"#{ticket.Id} önceliği uzun süre bekleme nedeniyle {oldPriority} -> {ticket.Priority} olarak otomatik yükseltildi."
            });

            db.Notifications.Add(new AppNotification
            {
                UserId = ticket.CreatedByUserId,
                Message = $"#{ticket.Id} numaralı talebiniz uzun süredir bekliyor, önceliği {ticket.Priority} olarak yükseltildi.",
                TicketId = ticket.Id
            });

            foreach (var staff in staffList)
            {
                db.Notifications.Add(new AppNotification
                {
                    UserId = staff.Id,
                    Message = $"#{ticket.Id} \"{ticket.Title}\" talebi uzun süredir atanmadı, önceliği yükseltildi.",
                    TicketId = ticket.Id
                });
            }
        }

        if (anyChanges)
            await db.SaveChangesAsync();
    }
}
