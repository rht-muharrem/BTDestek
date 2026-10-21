using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using MyApp.Api.Data;
using MyApp.Api.Hubs;
using MyApp.Api.Models;
using MyApp.Api.Models.Dtos;
using MyApp.Api.Services;

namespace MyApp.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class TicketsController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly IEmailService _email;
    private readonly IHubContext<TicketHub> _hub;

    public TicketsController(AppDbContext db, IEmailService email, IHubContext<TicketHub> hub)
    {
        _db = db;
        _email = email;
        _hub = hub;
    }

    private int CurrentUserId => int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
    private string CurrentUserRole => User.FindFirstValue(ClaimTypes.Role)!;
    private Task<User> CurrentUserAsync() => _db.Users.FirstAsync(u => u.Id == CurrentUserId);

    private async Task<TicketResponse> ToResponseAsync(Ticket t)
    {
        var createdBy = await _db.Users.FirstOrDefaultAsync(u => u.Id == t.CreatedByUserId);
        var assignedTo = t.AssignedToUserId.HasValue
            ? await _db.Users.FirstOrDefaultAsync(u => u.Id == t.AssignedToUserId)
            : null;
        var asset = t.AssetId.HasValue
            ? await _db.Assets.FirstOrDefaultAsync(a => a.Id == t.AssetId)
            : null;

        return new TicketResponse(
            t.Id, t.Title, t.Description, t.Status.ToString(), t.Priority.ToString(), t.Category.ToString(),
            t.CreatedByUserId, createdBy?.FullName ?? "",
            t.AssignedToUserId, assignedTo?.FullName,
            t.CreatedAt, t.UpdatedAt, t.ResolvedAt, t.ClosedAt,
            await _db.Comments.CountAsync(c => c.TicketId == t.Id),
            await _db.Attachments.CountAsync(a => a.TicketId == t.Id),
            t.SatisfactionRating,
            SlaPolicy.Hours[t.Priority],
            t.MergedIntoTicketId,
            t.AssetId,
            asset?.AssetTag
        );
    }

    private async Task AddAuditLogAsync(string action, string entityType, int? entityId, string details)
    {
        var me = await CurrentUserAsync();
        _db.AuditLogs.Add(new AuditLog
        {
            Action = action,
            EntityType = entityType,
            EntityId = entityId,
            PerformedByUserId = me.Id,
            PerformedByName = me.FullName,
            Details = details
        });
    }

    private async Task AddNotificationAsync(int userId, string message, int? ticketId = null)
    {
        _db.Notifications.Add(new AppNotification { UserId = userId, Message = message, TicketId = ticketId });
        await Task.CompletedTask;
    }

    private bool CanAccess(Ticket t) => CurrentUserRole == nameof(UserRole.ITStaff) || t.CreatedByUserId == CurrentUserId;

    // GET /api/tickets?search=...&status=...&category=...
    [HttpGet]
    public async Task<ActionResult<IEnumerable<TicketResponse>>> GetAll([FromQuery] string? search, [FromQuery] string? status, [FromQuery] string? category)
    {
        var query = _db.Tickets.AsQueryable();

        if (CurrentUserRole != nameof(UserRole.ITStaff))
            query = query.Where(t => t.CreatedByUserId == CurrentUserId);

        if (!string.IsNullOrWhiteSpace(search))
        {
            var s = search.Trim();
            query = query.Where(t => EF.Functions.Like(t.Title, $"%{s}%") || EF.Functions.Like(t.Description, $"%{s}%"));
        }

        if (!string.IsNullOrWhiteSpace(status) && Enum.TryParse<TicketStatus>(status, true, out var st))
            query = query.Where(t => t.Status == st);

        if (!string.IsNullOrWhiteSpace(category) && Enum.TryParse<TicketCategory>(category, true, out var cat))
            query = query.Where(t => t.Category == cat);

        var tickets = await query.OrderByDescending(t => t.CreatedAt).ToListAsync();

        var results = new List<TicketResponse>();
        foreach (var t in tickets) results.Add(await ToResponseAsync(t));
        return Ok(results);
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<TicketResponse>> GetById(int id)
    {
        var ticket = await _db.Tickets.FirstOrDefaultAsync(t => t.Id == id);
        if (ticket is null) return NotFound();
        if (!CanAccess(ticket)) return Forbid();
        return Ok(await ToResponseAsync(ticket));
    }

    [HttpPost]
    public async Task<ActionResult<TicketResponse>> Create(CreateTicketRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Title) || string.IsNullOrWhiteSpace(request.Description))
            return BadRequest("Başlık ve açıklama zorunludur.");

        if (!Enum.TryParse<TicketPriority>(request.Priority, true, out var priority)) priority = TicketPriority.Medium;
        if (!Enum.TryParse<TicketCategory>(request.Category, true, out var category)) category = TicketCategory.Other;

        var me = await CurrentUserAsync();

        var ticket = new Ticket
        {
            Title = request.Title.Trim(),
            Description = request.Description.Trim(),
            Priority = priority,
            Category = category,
            Status = TicketStatus.Open,
            CreatedByUserId = CurrentUserId,
            AssetId = request.AssetId,
            CreatedAt = DateTime.UtcNow
        };
        _db.Tickets.Add(ticket);
        await _db.SaveChangesAsync(); // Id'nin oluşması için önce kaydet

        await AddAuditLogAsync("TicketCreated", "Ticket", ticket.Id,
            $"\"{ticket.Title}\" başlıklı talep oluşturuldu ({category}, {priority}).");

        var staffList = await _db.Users.Where(u => u.Role == UserRole.ITStaff).ToListAsync();
        foreach (var staff in staffList)
        {
            await AddNotificationAsync(staff.Id, $"Yeni talep: \"{ticket.Title}\" ({me.FullName})", ticket.Id);
            _ = _email.SendAsync(staff.Email, "Yeni Destek Talebi", $"\"{ticket.Title}\" başlıklı yeni bir talep açıldı.");
        }

        await _db.SaveChangesAsync();

        var response = await ToResponseAsync(ticket);

        // Gerçek zamanlı: tüm IT personeline anında "🔴 Yeni Ticket" uyarısı
        await _hub.Clients.Group("staff").SendAsync("NewTicket", response);

        return CreatedAtAction(nameof(GetById), new { id = ticket.Id }, response);
    }

    // Bir talebe sonradan cihaz bağlama/değiştirme (IT personeli)
    [HttpPut("{id:int}/link-asset")]
    [Authorize(Roles = "ITStaff")]
    public async Task<ActionResult<TicketResponse>> LinkAsset(int id, LinkAssetRequest request)
    {
        var ticket = await _db.Tickets.FirstOrDefaultAsync(t => t.Id == id);
        if (ticket is null) return NotFound();

        ticket.AssetId = request.AssetId;
        ticket.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        var response = await ToResponseAsync(ticket);
        await _hub.Clients.Group($"ticket-{id}").SendAsync("TicketUpdated", response);
        return Ok(response);
    }

    [HttpPut("{id:int}/assign")]
    [Authorize(Roles = "ITStaff")]
    public async Task<ActionResult<TicketResponse>> AssignToSelf(int id)
    {
        var ticket = await _db.Tickets.FirstOrDefaultAsync(t => t.Id == id);
        if (ticket is null) return NotFound();

        var me = await CurrentUserAsync();

        ticket.AssignedToUserId = CurrentUserId;
        if (ticket.Status == TicketStatus.Open) ticket.Status = TicketStatus.InProgress;
        ticket.UpdatedAt = DateTime.UtcNow;

        var owner = await _db.Users.FirstAsync(u => u.Id == ticket.CreatedByUserId);
        await AddNotificationAsync(owner.Id, $"#{ticket.Id} talebiniz {me.FullName} tarafından üstlenildi.", ticket.Id);
        _ = _email.SendAsync(owner.Email, "Talebiniz Üstlenildi", $"\"{ticket.Title}\" talebiniz {me.FullName} tarafından üstlenildi.");
        await AddAuditLogAsync("TicketAssigned", "Ticket", ticket.Id, $"#{ticket.Id} talebini üstüne aldı.");

        await _db.SaveChangesAsync();
        var response = await ToResponseAsync(ticket);
        await _hub.Clients.Group($"ticket-{id}").SendAsync("TicketUpdated", response);
        await _hub.Clients.Group("staff").SendAsync("TicketUpdated", response);
        await _hub.Clients.Group($"user-{owner.Id}").SendAsync("NewNotification", $"#{ticket.Id} talebiniz {me.FullName} tarafından üstlenildi.");
        return Ok(response);
    }

    [HttpPut("{id:int}/status")]
    [Authorize(Roles = "ITStaff")]
    public async Task<ActionResult<TicketResponse>> UpdateStatus(int id, UpdateTicketStatusRequest request)
    {
        if (!Enum.TryParse<TicketStatus>(request.Status, true, out var newStatus))
            return BadRequest("Geçersiz durum değeri.");

        var ticket = await _db.Tickets.FirstOrDefaultAsync(t => t.Id == id);
        if (ticket is null) return NotFound();

        var previousStatus = ticket.Status;
        ticket.Status = newStatus;
        ticket.UpdatedAt = DateTime.UtcNow;
        if (newStatus == TicketStatus.Resolved) ticket.ResolvedAt = DateTime.UtcNow;
        if (newStatus == TicketStatus.Closed) ticket.ClosedAt = DateTime.UtcNow;

        var owner = await _db.Users.FirstAsync(u => u.Id == ticket.CreatedByUserId);
        var statusLabel = newStatus switch
        {
            TicketStatus.Resolved => "çözüldü olarak işaretlendi. Sorunun devam etmediğini onaylarsan talep kapanacak.",
            TicketStatus.Closed => "kapatıldı.",
            TicketStatus.InProgress => "işleme alındı.",
            _ => "güncellendi."
        };
        await AddNotificationAsync(owner.Id, $"#{ticket.Id} talebiniz {statusLabel}", ticket.Id);
        _ = _email.SendAsync(owner.Email, "Talep Durumu Güncellendi", $"\"{ticket.Title}\" talebiniz {statusLabel}");
        await AddAuditLogAsync("StatusChanged", "Ticket", ticket.Id,
            $"#{ticket.Id} durumu {previousStatus} -> {newStatus} olarak değiştirildi.");

        await _db.SaveChangesAsync();
        var response = await ToResponseAsync(ticket);
        await _hub.Clients.Group($"ticket-{id}").SendAsync("TicketUpdated", response);
        await _hub.Clients.Group("staff").SendAsync("TicketUpdated", response);
        await _hub.Clients.Group($"user-{owner.Id}").SendAsync("NewNotification", $"#{ticket.Id} talebiniz {statusLabel}");
        return Ok(response);
    }

    // Kullanıcı, "Resolved" durumundaki kendi talebini onaylayıp kapatır.
    [HttpPost("{id:int}/confirm-close")]
    public async Task<ActionResult<TicketResponse>> ConfirmClose(int id)
    {
        var ticket = await _db.Tickets.FirstOrDefaultAsync(t => t.Id == id);
        if (ticket is null) return NotFound();
        if (ticket.CreatedByUserId != CurrentUserId) return Forbid();
        if (ticket.Status != TicketStatus.Resolved) return BadRequest("Sadece 'Çözüldü' durumundaki talepler onaylanabilir.");

        ticket.Status = TicketStatus.Closed;
        ticket.ClosedAt = DateTime.UtcNow;
        ticket.UpdatedAt = DateTime.UtcNow;

        if (ticket.AssignedToUserId.HasValue)
            await AddNotificationAsync(ticket.AssignedToUserId.Value, $"#{ticket.Id} kullanıcı tarafından onaylanıp kapatıldı.", ticket.Id);

        await AddAuditLogAsync("TicketClosedByUser", "Ticket", ticket.Id, $"#{ticket.Id} kullanıcı tarafından onaylanıp kapatıldı.");

        await _db.SaveChangesAsync();
        return Ok(await ToResponseAsync(ticket));
    }

    // Kullanıcı, kapanmış talebine 1-5 arası memnuniyet puanı verir.
    [HttpPost("{id:int}/rate")]
    public async Task<ActionResult<TicketResponse>> Rate(int id, RateTicketRequest request)
    {
        if (request.Rating < 1 || request.Rating > 5)
            return BadRequest("Puan 1 ile 5 arasında olmalıdır.");

        var ticket = await _db.Tickets.FirstOrDefaultAsync(t => t.Id == id);
        if (ticket is null) return NotFound();
        if (ticket.CreatedByUserId != CurrentUserId) return Forbid();
        if (ticket.Status != TicketStatus.Closed) return BadRequest("Sadece kapatılmış talepler puanlanabilir.");

        ticket.SatisfactionRating = request.Rating;
        await AddAuditLogAsync("TicketRated", "Ticket", ticket.Id, $"#{ticket.Id} talebine {request.Rating}/5 puan verildi.");

        await _db.SaveChangesAsync();
        return Ok(await ToResponseAsync(ticket));
    }

    // ---------- Talep Birleştirme ----------

    [HttpPost("{id:int}/merge")]
    [Authorize(Roles = "ITStaff")]
    public async Task<ActionResult<TicketResponse>> Merge(int id, MergeTicketRequest request)
    {
        if (id == request.TargetTicketId)
            return BadRequest("Bir talep kendisiyle birleştirilemez.");

        var source = await _db.Tickets.FirstOrDefaultAsync(t => t.Id == id);
        var target = await _db.Tickets.FirstOrDefaultAsync(t => t.Id == request.TargetTicketId);
        if (source is null || target is null) return NotFound();
        if (source.MergedIntoTicketId.HasValue) return BadRequest("Bu talep zaten başka bir talebe birleştirilmiş.");
        if (target.MergedIntoTicketId.HasValue) return BadRequest("Hedef talep de başka bir talebe birleştirilmiş, onu hedef olarak seçemezsin.");

        source.Status = TicketStatus.Closed;
        source.ClosedAt = DateTime.UtcNow;
        source.UpdatedAt = DateTime.UtcNow;
        source.MergedIntoTicketId = target.Id;

        _db.Comments.Add(new TicketComment
        {
            TicketId = source.Id,
            AuthorUserId = CurrentUserId,
            Message = $"Bu talep #{target.Id} (\"{target.Title}\") numaralı talep ile birleştirildi."
        });
        _db.Comments.Add(new TicketComment
        {
            TicketId = target.Id,
            AuthorUserId = CurrentUserId,
            Message = $"#{source.Id} (\"{source.Title}\") numaralı talep bu talebe birleştirildi."
        });

        await AddNotificationAsync(source.CreatedByUserId, $"#{source.Id} talebiniz #{target.Id} numaralı talep ile birleştirildi.", target.Id);
        await AddAuditLogAsync("TicketMerged", "Ticket", source.Id, $"#{source.Id}, #{target.Id} numaralı talebe birleştirildi.");

        await _db.SaveChangesAsync();
        return Ok(await ToResponseAsync(source));
    }

    // ---------- Toplu İşlemler ----------

    [HttpPut("bulk/assign")]
    [Authorize(Roles = "ITStaff")]
    public async Task<ActionResult<IEnumerable<TicketResponse>>> BulkAssign(BulkTicketActionRequest request)
    {
        var me = await CurrentUserAsync();
        var results = new List<TicketResponse>();

        foreach (var id in request.TicketIds)
        {
            var ticket = await _db.Tickets.FirstOrDefaultAsync(t => t.Id == id);
            if (ticket is null || ticket.Status == TicketStatus.Closed) continue;

            ticket.AssignedToUserId = CurrentUserId;
            if (ticket.Status == TicketStatus.Open) ticket.Status = TicketStatus.InProgress;
            ticket.UpdatedAt = DateTime.UtcNow;

            var owner = await _db.Users.FirstAsync(u => u.Id == ticket.CreatedByUserId);
            await AddNotificationAsync(owner.Id, $"#{ticket.Id} talebiniz {me.FullName} tarafından üstlenildi.", ticket.Id);

            results.Add(await ToResponseAsync(ticket));
        }

        await AddAuditLogAsync("BulkAssign", "Ticket", null,
            $"{results.Count} talep toplu olarak üstlenildi ({string.Join(", ", results.Select(r => "#" + r.Id))}).");

        await _db.SaveChangesAsync();
        return Ok(results);
    }

    [HttpPut("bulk/status")]
    [Authorize(Roles = "ITStaff")]
    public async Task<ActionResult<IEnumerable<TicketResponse>>> BulkUpdateStatus(BulkStatusUpdateRequest request)
    {
        if (!Enum.TryParse<TicketStatus>(request.Status, true, out var newStatus))
            return BadRequest("Geçersiz durum değeri.");

        var results = new List<TicketResponse>();

        foreach (var id in request.TicketIds)
        {
            var ticket = await _db.Tickets.FirstOrDefaultAsync(t => t.Id == id);
            if (ticket is null) continue;

            ticket.Status = newStatus;
            ticket.UpdatedAt = DateTime.UtcNow;
            if (newStatus == TicketStatus.Resolved) ticket.ResolvedAt = DateTime.UtcNow;
            if (newStatus == TicketStatus.Closed) ticket.ClosedAt = DateTime.UtcNow;

            var owner = await _db.Users.FirstAsync(u => u.Id == ticket.CreatedByUserId);
            await AddNotificationAsync(owner.Id, $"#{ticket.Id} talebinizin durumu güncellendi: {newStatus}", ticket.Id);

            results.Add(await ToResponseAsync(ticket));
        }

        await AddAuditLogAsync("BulkStatusChanged", "Ticket", null,
            $"{results.Count} talebin durumu toplu olarak {newStatus} yapıldı ({string.Join(", ", results.Select(r => "#" + r.Id))}).");

        await _db.SaveChangesAsync();
        return Ok(results);
    }

    // ---------- Yorumlar ----------

    [HttpGet("{id:int}/comments")]
    public async Task<ActionResult<IEnumerable<CommentResponse>>> GetComments(int id)
    {
        var ticket = await _db.Tickets.FirstOrDefaultAsync(t => t.Id == id);
        if (ticket is null) return NotFound();
        if (!CanAccess(ticket)) return Forbid();

        var rows = await _db.Comments.Where(c => c.TicketId == id).OrderBy(c => c.CreatedAt).ToListAsync();
        var results = new List<CommentResponse>();
        foreach (var c in rows)
        {
            var author = await _db.Users.FirstAsync(u => u.Id == c.AuthorUserId);
            results.Add(new CommentResponse(c.Id, c.TicketId, author.FullName, author.Role.ToString(), c.Message, c.CreatedAt));
        }
        return Ok(results);
    }

    [HttpPost("{id:int}/comments")]
    public async Task<ActionResult<CommentResponse>> AddComment(int id, CreateCommentRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Message)) return BadRequest("Yorum boş olamaz.");

        var ticket = await _db.Tickets.FirstOrDefaultAsync(t => t.Id == id);
        if (ticket is null) return NotFound();
        if (!CanAccess(ticket)) return Forbid();

        var comment = new TicketComment
        {
            TicketId = id,
            AuthorUserId = CurrentUserId,
            Message = request.Message.Trim()
        };
        _db.Comments.Add(comment);

        var notifyUserId = CurrentUserId == ticket.CreatedByUserId ? ticket.AssignedToUserId : ticket.CreatedByUserId;
        if (notifyUserId.HasValue)
            await AddNotificationAsync(notifyUserId.Value, $"#{ticket.Id} talebine yeni bir yorum eklendi.", ticket.Id);

        await _db.SaveChangesAsync();

        var author = await CurrentUserAsync();
        var commentResponse = new CommentResponse(comment.Id, comment.TicketId, author.FullName, author.Role.ToString(), comment.Message, comment.CreatedAt);

        // Gerçek zamanlı: o an talebi açık tutan herkese anında "X yeni yorum yaptı"
        await _hub.Clients.Group($"ticket-{id}").SendAsync("NewComment", commentResponse);
        if (notifyUserId.HasValue)
            await _hub.Clients.Group($"user-{notifyUserId.Value}").SendAsync("NewNotification", $"#{ticket.Id}: {author.FullName} yeni bir yorum yaptı.");

        return Ok(commentResponse);
    }

    // ---------- Dosya Ekleri ----------

    [HttpGet("{id:int}/attachments")]
    public async Task<ActionResult<IEnumerable<AttachmentResponse>>> GetAttachments(int id)
    {
        var ticket = await _db.Tickets.FirstOrDefaultAsync(t => t.Id == id);
        if (ticket is null) return NotFound();
        if (!CanAccess(ticket)) return Forbid();

        var rows = await _db.Attachments.Where(a => a.TicketId == id).OrderBy(a => a.CreatedAt).ToListAsync();
        var results = new List<AttachmentResponse>();
        foreach (var a in rows)
        {
            var uploader = await _db.Users.FirstAsync(u => u.Id == a.UploadedByUserId);
            results.Add(new AttachmentResponse(a.Id, a.TicketId, a.FileName, a.ContentType, a.DataBase64, uploader.FullName, a.CreatedAt));
        }
        return Ok(results);
    }

    [HttpPost("{id:int}/attachments")]
    public async Task<ActionResult<AttachmentResponse>> AddAttachment(int id, CreateAttachmentRequest request)
    {
        var ticket = await _db.Tickets.FirstOrDefaultAsync(t => t.Id == id);
        if (ticket is null) return NotFound();
        if (!CanAccess(ticket)) return Forbid();

        if (request.DataBase64.Length > 4_000_000)
            return BadRequest("Dosya çok büyük (maksimum ~3MB).");

        var attachment = new TicketAttachment
        {
            TicketId = id,
            UploadedByUserId = CurrentUserId,
            FileName = request.FileName,
            ContentType = request.ContentType,
            DataBase64 = request.DataBase64
        };
        _db.Attachments.Add(attachment);
        await _db.SaveChangesAsync();

        var uploader = await CurrentUserAsync();
        return Ok(new AttachmentResponse(attachment.Id, attachment.TicketId, attachment.FileName, attachment.ContentType, attachment.DataBase64, uploader.FullName, attachment.CreatedAt));
    }
}
