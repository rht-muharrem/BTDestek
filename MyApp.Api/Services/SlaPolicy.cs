using MyApp.Api.Models;

namespace MyApp.Api.Services;

// Önceliğe göre SLA hedef süresi (saat). ReportsController ve TicketsController
// aynı eşikleri kullansın diye tek yerde tanımlandı.
public static class SlaPolicy
{
    public static readonly Dictionary<TicketPriority, int> Hours = new()
    {
        [TicketPriority.Critical] = 4,
        [TicketPriority.High] = 8,
        [TicketPriority.Medium] = 24,
        [TicketPriority.Low] = 72,
    };
}
