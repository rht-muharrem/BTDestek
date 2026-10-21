namespace MyApp.Api.Models.Dtos;

public record CreateAssetRequest(
    string AssetTag,
    string Type,
    string? Brand,
    string? Model,
    string? SerialNumber,
    string? IpAddress,
    string? MacAddress,
    string? OperatingSystem,
    string? Ram,
    string? Cpu,
    int? AssignedUserId,
    string? Department,
    string? Location,
    string? Notes
);

public record UpdateAssetRequest(
    string Type,
    string? Brand,
    string? Model,
    string? SerialNumber,
    string? IpAddress,
    string? MacAddress,
    string? OperatingSystem,
    string? Ram,
    string? Cpu,
    int? AssignedUserId,
    string? Department,
    string? Location,
    string? Notes,
    bool IsRetired
);

public record AssetResponse(
    int Id,
    string AssetTag,
    string Type,
    string? Brand,
    string? Model,
    string? SerialNumber,
    string? IpAddress,
    string? MacAddress,
    string? OperatingSystem,
    string? Ram,
    string? Cpu,
    int? AssignedUserId,
    string? AssignedUserName,
    string? Department,
    string? Location,
    string? Notes,
    bool IsRetired,
    DateTime CreatedAt,
    DateTime? UpdatedAt
);

public record AssetTicketHistoryItem(int TicketId, string Title, string Status, DateTime CreatedAt);
