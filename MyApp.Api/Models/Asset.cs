namespace MyApp.Api.Models;

public class Asset
{
    public int Id { get; set; }
    public string AssetTag { get; set; } = string.Empty;
    public AssetType Type { get; set; } = AssetType.Computer;

    public string? Brand { get; set; }
    public string? Model { get; set; }
    public string? SerialNumber { get; set; }
    public string? IpAddress { get; set; }
    public string? MacAddress { get; set; }
    public string? OperatingSystem { get; set; }
    public string? Ram { get; set; }
    public string? Cpu { get; set; }

    public int? AssignedUserId { get; set; }
    public string? Department { get; set; }
    public string? Location { get; set; }
    public string? Notes { get; set; }

    public bool IsRetired { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }
}
