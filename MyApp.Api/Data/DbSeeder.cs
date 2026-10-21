using Microsoft.EntityFrameworkCore;
using MyApp.Api.Models;

namespace MyApp.Api.Data;

public static class DbSeeder
{
    public static void Seed(AppDbContext db)
    {
        // Migration'a geçildi: veritabanı yoksa oluşturur, varsa bekleyen migration'ları uygular.
        // Eski EnsureCreated() ile oluşturulmuş bir veritabanın varsa, migration'a geçmeden önce
        // o veritabanını silmen gerekir (README'deki "Migration'a Geçiş" bölümüne bak).
        db.Database.Migrate();

        if (!db.Users.Any(u => u.Role == UserRole.ITStaff))
        {
            db.Users.Add(new User
            {
                FullName = "Bilgi İşlem Admin",
                Email = "itstaff@example.com",
                PasswordHash = BCrypt.Net.BCrypt.HashPassword("Staff123!"),
                Role = UserRole.ITStaff
            });
        }

        if (!db.Users.Any(u => u.Email == "demo@example.com"))
        {
            db.Users.Add(new User
            {
                FullName = "Ayşe Yılmaz",
                Email = "demo@example.com",
                PasswordHash = BCrypt.Net.BCrypt.HashPassword("Demo123!"),
                Role = UserRole.Requester
            });
        }

        if (!db.BrandSettings.Any())
        {
            db.BrandSettings.Add(new BrandSettings { Id = 1, CompanyName = "Destek Masası" });
        }

        db.SaveChanges();
    }
}
