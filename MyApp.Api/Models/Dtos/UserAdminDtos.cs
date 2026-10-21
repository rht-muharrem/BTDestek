namespace MyApp.Api.Models.Dtos;

public record UserAdminResponse(
    int Id, string FullName, string Email, string Role, string? WindowsUsername, DateTime CreatedAt,
    string? Department, string? JobTitle, string? Manager, string? Phone, string? Office
);

public record UpdateUserRoleRequest(string Role);
