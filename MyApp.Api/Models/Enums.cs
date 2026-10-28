namespace MyApp.Api.Models;

public enum UserRole
{
    Requester,
    ITStaff
}

public enum TicketStatus
{
    Open,
    InProgress,
    Resolved,
    Closed
}

public enum TicketPriority
{
    Low,
    Medium,
    High,
    Critical
}

public enum TicketCategory
{
    Hardware,
    Software,
    Network,
    Printer,
    Access,
    Other
}

public enum AssetType
{
    Computer,
    Laptop,
    Monitor,
    Printer,
    Phone,
    Switch,
    Router,
    AccessPoint,
    Server,
    UPS,
    License,
    Other
}
