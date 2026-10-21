namespace MyApp.Api.Models.Dtos;

public record ReportSummaryResponse(
    int TotalTickets,
    int OpenCount,
    int InProgressCount,
    int ResolvedCount,
    int ClosedCount,
    double AvgResolutionHours,
    Dictionary<string, int> ByCategory,
    Dictionary<string, int> ByPriority,
    List<StaffPerformance> ByStaff,
    double? AvgSatisfaction,
    int RatedTicketCount,
    List<OverdueTicketInfo> OverdueTickets,
    List<DailyCount> Last30Days
);

public record StaffPerformance(string StaffName, int AssignedCount, int ResolvedCount);

public record OverdueTicketInfo(int Id, string Title, string Priority, string Category, int HoursOpen, int SlaHours, string? AssignedToName);

public record DailyCount(string Date, int Count);
