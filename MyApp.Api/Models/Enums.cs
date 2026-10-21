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
    Resolved,   // Personel çözdü işaretledi, kullanıcı onayı bekliyor
    Closed      // Kullanıcı onayladı (veya personel doğrudan kapattı)
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
