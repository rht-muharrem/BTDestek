namespace MyApp.Api.Models.Dtos;

public record CreateTicketRequest(string Title, string Description, string Priority, string Category, int? AssetId);

public record LinkAssetRequest(int? AssetId);

public record UpdateTicketStatusRequest(string Status);

public record CreateCommentRequest(string Message);

public record CreateAttachmentRequest(string FileName, string ContentType, string DataBase64);

public record RateTicketRequest(int Rating);

public record MergeTicketRequest(int TargetTicketId);

public record BulkTicketActionRequest(List<int> TicketIds);

public record BulkStatusUpdateRequest(List<int> TicketIds, string Status);

public record TicketResponse(
    int Id,
    string Title,
    string Description,
    string Status,
    string Priority,
    string Category,
    int CreatedByUserId,
    string CreatedByName,
    int? AssignedToUserId,
    string? AssignedToName,
    DateTime CreatedAt,
    DateTime? UpdatedAt,
    DateTime? ResolvedAt,
    DateTime? ClosedAt,
    int CommentCount,
    int AttachmentCount,
    int? SatisfactionRating,
    int SlaHours,
    int? MergedIntoTicketId,
    int? AssetId,
    string? AssetTag
);

public record CommentResponse(int Id, int TicketId, string AuthorName, string AuthorRole, string Message, DateTime CreatedAt);

public record AttachmentResponse(int Id, int TicketId, string FileName, string ContentType, string DataBase64, string UploadedByName, DateTime CreatedAt);
