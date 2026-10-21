using System.DirectoryServices.AccountManagement;
using MyApp.Api.Models;

namespace MyApp.Api.Services;

// Windows/AD kimliğinden (SIRKET\ayse.yilmaz) ek profil bilgilerini çeker:
// tam ad, e-posta, departman, unvan, yönetici, telefon, ofis.
//
// ÖNEMLİ: System.DirectoryServices.AccountManagement sadece domain'e bağlı bir Windows
// makinesinde çalışır. Linux/Mac'te veya domain dışı bir ortamda çağrıldığında sessizce
// başarısız olur (try/catch ile yutulur) — böylece geliştirme ortamında giriş akışını bozmaz.
//
// NOT: Derleme sırasında CA1416 uyarıları görebilirsin ("Bu çağrı sitesine tüm platformlarda
// ulaşılabilir..."). Bunlar sadece uyarıdır, derlemeyi ENGELLEMEZ — çünkü bu kod zaten
// try/catch içinde ve sadece Windows'ta çalışacağını biliyoruz. Görmezden gelebilirsin.
public class ActiveDirectoryService
{
    private readonly ILogger<ActiveDirectoryService> _logger;

    public ActiveDirectoryService(ILogger<ActiveDirectoryService> logger)
    {
        _logger = logger;
    }

    public void EnrichFromActiveDirectory(User user, string windowsUsername)
    {
        try
        {
            var samAccountName = windowsUsername.Contains('\\')
                ? windowsUsername.Split('\\')[1]
                : windowsUsername;

            using var context = new PrincipalContext(ContextType.Domain);
            using var principal = UserPrincipal.FindByIdentity(context, IdentityType.SamAccountName, samAccountName);

            if (principal is null)
            {
                _logger.LogWarning("AD'de {User} için kayıt bulunamadı.", samAccountName);
                return;
            }

            if (!string.IsNullOrWhiteSpace(principal.DisplayName))
                user.FullName = principal.DisplayName;

            if (!string.IsNullOrWhiteSpace(principal.EmailAddress))
                user.Email = principal.EmailAddress;

            user.Phone = principal.VoiceTelephoneNumber;

            // Departman, unvan, ofis ve yönetici gibi bilgiler UserPrincipal'da doğrudan
            // yok — alttaki DirectoryEntry üzerinden okunuyor.
            if (principal.GetUnderlyingObject() is System.DirectoryServices.DirectoryEntry entry)
            {
                user.Department = entry.Properties["department"]?.Value?.ToString();
                user.JobTitle = entry.Properties["title"]?.Value?.ToString();
                user.Office = entry.Properties["physicalDeliveryOfficeName"]?.Value?.ToString();

                var managerDn = entry.Properties["manager"]?.Value?.ToString();
                if (!string.IsNullOrWhiteSpace(managerDn))
                {
                    using var managerEntry = new System.DirectoryServices.DirectoryEntry($"LDAP://{managerDn}");
                    user.Manager = managerEntry.Properties["displayName"]?.Value?.ToString();
                }

                // Tanılama: bu alanlar AD'de gerçekten boşsa mı yoksa okunamadığı için mi
                // boş kaldığını ayırt edebilmek için logluyoruz.
                _logger.LogInformation(
                    "AD'den okunan ham değerler ({User}) -> department:'{Dept}' title:'{Title}' office:'{Office}' manager:'{Manager}'",
                    samAccountName, user.Department, user.JobTitle, user.Office, user.Manager);
            }
            else
            {
                _logger.LogWarning("AD kaydı bulundu ama alt seviye DirectoryEntry'ye erişilemedi ({User}) — departman/unvan gibi alanlar okunamayacak.", samAccountName);
            }
        }
        catch (Exception ex)
        {
            // Domain dışı ortam, yetersiz izin, AD erişilemez vb. -> giriş akışını bozma, sadece logla.
            _logger.LogWarning(ex, "AD bilgileri çekilemedi ({User}). Muhtemelen domain dışı bir ortamdasınız.", windowsUsername);
        }
    }
}
