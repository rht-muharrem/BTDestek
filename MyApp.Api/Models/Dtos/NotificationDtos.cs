namespace MyApp.Api.Models.Dtos;

public record NotificationResponse(int Id, string Message, int? TicketId, bool IsRead, DateTime CreatedAt);
