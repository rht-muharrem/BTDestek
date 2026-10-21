using Microsoft.AspNetCore.Authentication.Negotiate;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MyApp.Api.Data;
using MyApp.Api.Models;
using MyApp.Api.Models.Dtos;
using MyApp.Api.Services;

namespace MyApp.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly TokenService _tokenService;
    private readonly ActiveDirectoryService _adService;

    public AuthController(AppDbContext db, TokenService tokenService, ActiveDirectoryService adService)
    {
        _db = db;
        _tokenService = tokenService;
        _adService = adService;
    }

    // Windows/Active Directory ile otomatik giriş.
    [HttpPost("windows-login")]
    [Authorize(AuthenticationSchemes = NegotiateDefaults.AuthenticationScheme)]
    public async Task<ActionResult<AuthResponse>> WindowsLogin()
    {
        var windowsUsername = HttpContext.User.Identity?.Name;
        if (string.IsNullOrWhiteSpace(windowsUsername))
            return Unauthorized("Windows kimliği alınamadı.");

        var user = await _db.Users.FirstOrDefaultAsync(u => u.WindowsUsername == windowsUsername);
        var isNewUser = user is null;

        if (user is null)
        {
            var displayName = windowsUsername.Contains('\\')
                ? windowsUsername.Split('\\')[1]
                : windowsUsername;

            user = new User
            {
                FullName = displayName.Replace('.', ' '),
                Email = $"{displayName}@sirket.local",
                WindowsUsername = windowsUsername,
                PasswordHash = string.Empty,
                Role = UserRole.Requester
            };
            _db.Users.Add(user);
        }

        // Her girişte AD bilgilerini tazele (departman/unvan/yönetici değişmiş olabilir).
        // Domain dışı bir ortamdaysa bu adım sessizce atlanır, giriş akışını bozmaz.
        _adService.EnrichFromActiveDirectory(user, windowsUsername);

        await _db.SaveChangesAsync();

        var token = _tokenService.GenerateToken(user);
        return Ok(new AuthResponse(token, user.Id, user.FullName, user.Email, user.Role.ToString()));
    }

    // Normal kullanıcı kaydı -> her zaman "Requester" rolüyle oluşturulur
    [HttpPost("register")]
    public async Task<ActionResult<AuthResponse>> Register(RegisterRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Email) || string.IsNullOrWhiteSpace(request.Password))
            return BadRequest("E-posta ve şifre zorunludur.");

        var email = request.Email.Trim().ToLower();
        if (await _db.Users.AnyAsync(u => u.Email == email))
            return BadRequest("Bu e-posta adresi zaten kayıtlı.");

        var user = new User
        {
            FullName = request.FullName.Trim(),
            Email = email,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.Password),
            Role = UserRole.Requester
        };

        _db.Users.Add(user);
        await _db.SaveChangesAsync();

        var token = _tokenService.GenerateToken(user);
        return Ok(new AuthResponse(token, user.Id, user.FullName, user.Email, user.Role.ToString()));
    }

    // Yeni bilgi işlem personeli ekleme -> sadece mevcut bir IT personeli yapabilir
    [HttpPost("register-staff")]
    [Authorize(Roles = "ITStaff")]
    public async Task<ActionResult<AuthResponse>> RegisterStaff(RegisterStaffRequest request)
    {
        var email = request.Email.Trim().ToLower();
        if (await _db.Users.AnyAsync(u => u.Email == email))
            return BadRequest("Bu e-posta adresi zaten kayıtlı.");

        var user = new User
        {
            FullName = request.FullName.Trim(),
            Email = email,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.Password),
            Role = UserRole.ITStaff
        };

        _db.Users.Add(user);
        await _db.SaveChangesAsync();

        var token = _tokenService.GenerateToken(user);
        return Ok(new AuthResponse(token, user.Id, user.FullName, user.Email, user.Role.ToString()));
    }

    [HttpPost("login")]
    public async Task<ActionResult<AuthResponse>> Login(LoginRequest request)
    {
        var email = request.Email.Trim().ToLower();
        var user = await _db.Users.FirstOrDefaultAsync(u => u.Email == email);

        if (user is null || string.IsNullOrEmpty(user.PasswordHash) ||
            !BCrypt.Net.BCrypt.Verify(request.Password, user.PasswordHash))
            return Unauthorized("E-posta veya şifre hatalı.");

        var token = _tokenService.GenerateToken(user);
        return Ok(new AuthResponse(token, user.Id, user.FullName, user.Email, user.Role.ToString()));
    }
}
