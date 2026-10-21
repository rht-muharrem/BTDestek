namespace MyApp.Api.Models.Dtos;

public record AuditLogResponse(
    int Id,
    string Action,
    string EntityType,
    int? EntityId,
    string PerformedByName,
    string Details,
    DateTime Timestamp
);
