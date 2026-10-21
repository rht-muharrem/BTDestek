using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;

namespace MyApp.Api.Hubs;

// Gerçek zamanlı kanal: yeni talep, yeni yorum, durum güncellemesi, bildirim.
// Gruplar:
//  - "staff"          -> tüm IT personeli (yeni talep uyarıları için)
//  - "user-{id}"       -> belirli bir kullanıcı (kişisel bildirimler için)
//  - "ticket-{id}"     -> o an bir talebin detayını açık tutan herkes (canlı yorum/güncelleme için)
[Authorize]
public class TicketHub : Hub
{
    private int CurrentUserId => int.Parse(Context.User!.FindFirstValue(ClaimTypes.NameIdentifier)!);
    private string CurrentUserRole => Context.User!.FindFirstValue(ClaimTypes.Role)!;

    public override async Task OnConnectedAsync()
    {
        await Groups.AddToGroupAsync(Context.ConnectionId, $"user-{CurrentUserId}");

        if (CurrentUserRole == "ITStaff")
            await Groups.AddToGroupAsync(Context.ConnectionId, "staff");

        await base.OnConnectedAsync();
    }

    // İstemci bir talebin detayını açtığında çağırır -> o talebe özel canlı güncellemeleri almaya başlar.
    public async Task JoinTicket(int ticketId)
    {
        await Groups.AddToGroupAsync(Context.ConnectionId, $"ticket-{ticketId}");
    }

    public async Task LeaveTicket(int ticketId)
    {
        await Groups.RemoveFromGroupAsync(Context.ConnectionId, $"ticket-{ticketId}");
    }
}
