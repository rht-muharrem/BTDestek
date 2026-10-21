using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage.ValueConversion;
using MyApp.Api.Models;

namespace MyApp.Api.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    public DbSet<User> Users => Set<User>();
    public DbSet<Ticket> Tickets => Set<Ticket>();
    public DbSet<TicketComment> Comments => Set<TicketComment>();
    public DbSet<TicketAttachment> Attachments => Set<TicketAttachment>();
    public DbSet<AppNotification> Notifications => Set<AppNotification>();
    public DbSet<AuditLog> AuditLogs => Set<AuditLog>();
    public DbSet<Asset> Assets => Set<Asset>();
    public DbSet<BrandSettings> BrandSettings => Set<BrandSettings>();

    // SQL Server'ın datetime2 sütunu zaman dilimi bilgisi saklamaz. Bu yüzden UTC olarak
    // kaydedilen bir tarih, geri okunduğunda "belirsiz" (Unspecified) olarak gelir ve
    // JSON'a sonunda 'Z' işareti OLMADAN yazılır. Tarayıcı da onu yerel saat sanıp
    // olduğu gibi gösterir — Türkiye'de saatler 3 saat geri görünürdü.
    //
    // Aşağıdaki dönüştürücüler, okunan her tarihi açıkça UTC olarak işaretler; böylece
    // JSON'a '...Z' ile gider ve tarayıcı doğru yerel saate çevirir.
    public class UtcDateTimeConverter : ValueConverter<DateTime, DateTime>
    {
        public UtcDateTimeConverter() : base(
            toDb => toDb.Kind == DateTimeKind.Utc ? toDb : toDb.ToUniversalTime(),
            fromDb => DateTime.SpecifyKind(fromDb, DateTimeKind.Utc))
        { }
    }

    public class NullableUtcDateTimeConverter : ValueConverter<DateTime?, DateTime?>
    {
        public NullableUtcDateTimeConverter() : base(
            toDb => toDb.HasValue
                ? (toDb.Value.Kind == DateTimeKind.Utc ? toDb : toDb.Value.ToUniversalTime())
                : toDb,
            fromDb => fromDb.HasValue
                ? DateTime.SpecifyKind(fromDb.Value, DateTimeKind.Utc)
                : fromDb)
        { }
    }

    protected override void ConfigureConventions(ModelConfigurationBuilder configurationBuilder)
    {
        base.ConfigureConventions(configurationBuilder);
        configurationBuilder.Properties<DateTime>().HaveConversion<UtcDateTimeConverter>();
        configurationBuilder.Properties<DateTime?>().HaveConversion<NullableUtcDateTimeConverter>();
    }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // --- User ---
        modelBuilder.Entity<User>(entity =>
        {
            entity.HasIndex(u => u.Email).IsUnique();
            entity.HasIndex(u => u.WindowsUsername)
                  .IsUnique()
                  .HasFilter("[WindowsUsername] IS NOT NULL"); // birden fazla NULL'a izin ver

            entity.Property(u => u.FullName).HasMaxLength(150).IsRequired();
            entity.Property(u => u.Email).HasMaxLength(200).IsRequired();
            entity.Property(u => u.WindowsUsername).HasMaxLength(200);
            entity.Property(u => u.PasswordHash).HasMaxLength(300);
            entity.Property(u => u.Department).HasMaxLength(150);
            entity.Property(u => u.JobTitle).HasMaxLength(150);
            entity.Property(u => u.Manager).HasMaxLength(150);
            entity.Property(u => u.Phone).HasMaxLength(50);
            entity.Property(u => u.Office).HasMaxLength(150);
            entity.Property(u => u.Role).HasConversion<string>().HasMaxLength(20);
        });

        // --- Ticket ---
        modelBuilder.Entity<Ticket>(entity =>
        {
            entity.Property(t => t.Title).HasMaxLength(200).IsRequired();
            entity.Property(t => t.Description).HasMaxLength(4000).IsRequired();
            entity.Property(t => t.Status).HasConversion<string>().HasMaxLength(20);
            entity.Property(t => t.Priority).HasConversion<string>().HasMaxLength(20);
            entity.Property(t => t.Category).HasConversion<string>().HasMaxLength(20);

            entity.HasOne(t => t.CreatedByUser)
                  .WithMany(u => u.CreatedTickets)
                  .HasForeignKey(t => t.CreatedByUserId)
                  .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(t => t.AssignedToUser)
                  .WithMany(u => u.AssignedTickets)
                  .HasForeignKey(t => t.AssignedToUserId)
                  .OnDelete(DeleteBehavior.Restrict);

            // Bir talebin başka bir talebe birleştirilmiş olması -> kendi kendine referans,
            // silme davranışı zincirlenmesin diye kısıtlı (Restrict).
            entity.HasOne<Ticket>()
                  .WithMany()
                  .HasForeignKey(t => t.MergedIntoTicketId)
                  .OnDelete(DeleteBehavior.Restrict);

            // Talebin ilgili olduğu cihaz (opsiyonel)
            entity.HasOne<Asset>()
                  .WithMany()
                  .HasForeignKey(t => t.AssetId)
                  .OnDelete(DeleteBehavior.SetNull);

            entity.HasIndex(t => t.Status);
            entity.HasIndex(t => t.CreatedAt);
        });

        // --- TicketComment ---
        modelBuilder.Entity<TicketComment>(entity =>
        {
            entity.Property(c => c.Message).HasMaxLength(2000).IsRequired();
            entity.HasIndex(c => c.TicketId);

            entity.HasOne<Ticket>()
                  .WithMany()
                  .HasForeignKey(c => c.TicketId)
                  .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne<User>()
                  .WithMany()
                  .HasForeignKey(c => c.AuthorUserId)
                  .OnDelete(DeleteBehavior.Restrict);
        });

        // --- TicketAttachment ---
        modelBuilder.Entity<TicketAttachment>(entity =>
        {
            entity.Property(a => a.FileName).HasMaxLength(260).IsRequired();
            entity.Property(a => a.ContentType).HasMaxLength(100).IsRequired();
            // Base64 dosya içeriği büyük olabileceği için sınırsız (nvarchar(max))
            entity.Property(a => a.DataBase64).HasColumnType("nvarchar(max)");
            entity.HasIndex(a => a.TicketId);

            entity.HasOne<Ticket>()
                  .WithMany()
                  .HasForeignKey(a => a.TicketId)
                  .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne<User>()
                  .WithMany()
                  .HasForeignKey(a => a.UploadedByUserId)
                  .OnDelete(DeleteBehavior.Restrict);
        });

        // --- AppNotification ---
        modelBuilder.Entity<AppNotification>(entity =>
        {
            entity.Property(n => n.Message).HasMaxLength(500).IsRequired();
            entity.HasIndex(n => new { n.UserId, n.IsRead });

            entity.HasOne<User>()
                  .WithMany()
                  .HasForeignKey(n => n.UserId)
                  .OnDelete(DeleteBehavior.Cascade);
        });

        // --- AuditLog ---
        modelBuilder.Entity<AuditLog>(entity =>
        {
            entity.Property(a => a.Action).HasMaxLength(60).IsRequired();
            entity.Property(a => a.EntityType).HasMaxLength(40).IsRequired();
            entity.Property(a => a.PerformedByName).HasMaxLength(150).IsRequired();
            entity.Property(a => a.Details).HasMaxLength(1000).IsRequired();
            entity.HasIndex(a => a.Timestamp);
            // PerformedByUserId sistem eylemlerinde 0 olabildiği için FK kısıtı yok, kasıtlı olarak.
        });

        // --- Asset (Envanter) ---
        modelBuilder.Entity<Asset>(entity =>
        {
            entity.HasIndex(a => a.AssetTag).IsUnique();
            entity.Property(a => a.AssetTag).HasMaxLength(50).IsRequired();
            entity.Property(a => a.Type).HasConversion<string>().HasMaxLength(20);
            entity.Property(a => a.Brand).HasMaxLength(100);
            entity.Property(a => a.Model).HasMaxLength(100);
            entity.Property(a => a.SerialNumber).HasMaxLength(150);
            entity.Property(a => a.IpAddress).HasMaxLength(45);
            entity.Property(a => a.MacAddress).HasMaxLength(50);
            entity.Property(a => a.OperatingSystem).HasMaxLength(100);
            entity.Property(a => a.Ram).HasMaxLength(50);
            entity.Property(a => a.Cpu).HasMaxLength(100);
            entity.Property(a => a.Department).HasMaxLength(150);
            entity.Property(a => a.Location).HasMaxLength(150);
            entity.Property(a => a.Notes).HasMaxLength(1000);

            entity.HasOne<User>()
                  .WithMany()
                  .HasForeignKey(a => a.AssignedUserId)
                  .OnDelete(DeleteBehavior.SetNull);
        });

        // --- BrandSettings (tek satırlık ayar tablosu) ---
        modelBuilder.Entity<BrandSettings>(entity =>
        {
            // Bu tablo her zaman tek bir satır (Id=1) içerir, Id elle atanır — otomatik
            // artan (identity) OLMAMALI, yoksa "IDENTITY_INSERT" hatası alınır.
            entity.Property(b => b.Id).ValueGeneratedNever();
            entity.Property(b => b.CompanyName).HasMaxLength(150).IsRequired();
            entity.Property(b => b.LogoContentType).HasMaxLength(100);
            entity.Property(b => b.LogoDataBase64).HasColumnType("nvarchar(max)");
        });
    }
}
