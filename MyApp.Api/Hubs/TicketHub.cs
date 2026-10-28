using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;

namespace MyApp.Api.Hubs;

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

    public async Task JoinTicket(int ticketId)
    {
        await Groups.AddToGroupAsync(Context.ConnectionId, $"ticket-{ticketId}");
    }

    public async Task LeaveTicket(int ticketId)
    {
        await Groups.RemoveFromGroupAsync(Context.ConnectionId, $"ticket-{ticketId}");
    }
}
