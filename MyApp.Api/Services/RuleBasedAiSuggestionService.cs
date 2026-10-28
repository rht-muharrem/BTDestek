using MyApp.Api.Models;

namespace MyApp.Api.Services;
public class RuleBasedAiSuggestionService : IAiSuggestionService
{
    private record Rule(TicketCategory Category, string Subcategory, string Team, string[] Keywords);

    private static readonly List<Rule> Rules = new()
    {
        new(TicketCategory.Network, "İnternet", "Ağ Ekibi",
            new[] { "internet", "ağ", "wifi", "wi-fi", "vpn", "bağlan", "network", "kablosuz", "ping", "modem" }),
        new(TicketCategory.Printer, "Yazıcı", "Donanım Ekibi",
            new[] { "yazıcı", "printer", "çıktı", "baskı", "kağıt sıkış", "tarayıcı", "scanner" }),
        new(TicketCategory.Access, "Erişim/Şifre", "Erişim Yönetimi",
            new[] { "şifre", "parola", "giriş yapamıyor", "erişim", "yetki", "hesap kilit", "login", "password" }),
        new(TicketCategory.Software, "Yazılım", "Yazılım Ekibi",
            new[] { "kurulum", "güncelleme", "hata veriyor", "uygulama", "program", "office", "excel", "outlook", "yazılım", "lisans", "crash", "çöküyor" }),
        new(TicketCategory.Hardware, "Donanım", "Donanım Ekibi",
            new[] { "yavaş", "donma", "donuyor", "mavi ekran", "format", "açılmıyor", "bilgisayar", "laptop", "monitör", "ekran", "klavye", "mouse", "fare", "batarya", "şarj" }),
    };

    private static readonly string[] CriticalWords = { "acil", "tüm departman", "herkes", "sunucu", "server çöktü", "üretim durdu", "kimse çalışamıyor" };
    private static readonly string[] HighWords = { "çalışamıyorum", "hiç açılmıyor", "tamamen", "kritik" };
    private static readonly string[] LowWords = { "ara sıra", "bazen", "küçük", "önemli değil", "acil değil" };

    private static readonly Dictionary<TicketCategory, string[]> SolutionSteps = new()
    {
        [TicketCategory.Network] = new[]
        {
            "Modem/router'ı kapatıp 30 saniye sonra tekrar açmayı deneyin.",
            "Kablosuz yerine kablolu (ethernet) bağlantıyla deneyin, sorun devam ediyor mu bakın.",
            "Başka bir cihazda (telefon vb.) aynı ağa bağlanıp internetin genel olarak çalışıp çalışmadığını kontrol edin.",
            "VPN kullanıyorsanız VPN'i kapatıp tekrar bağlanmayı deneyin.",
        },
        [TicketCategory.Printer] = new[]
        {
            "Yazıcıyı kapatıp açın ve kağıt sıkışması olup olmadığını kontrol edin.",
            "Yazıcı kablosunun (veya kablosuz bağlantının) düzgün bağlı olduğundan emin olun.",
            "Bilgisayarınızı yeniden başlatıp tekrar deneyin.",
            "Farklı bir belgeyi yazdırmayı deneyerek sorunun belgeye mi yazıcıya mı ait olduğunu ayırt edin.",
        },
        [TicketCategory.Access] = new[]
        {
            "Caps Lock tuşunun açık olup olmadığını kontrol edin (şifreler büyük/küçük harfe duyarlıdır).",
            "\"Şifremi Unuttum\" bağlantısını kullanarak şifrenizi sıfırlamayı deneyin.",
            "Birkaç dakika bekleyip tekrar deneyin — art arda yanlış girişlerde hesap geçici olarak kilitlenebilir.",
            "Kullanıcı adınızı (e-posta adresinizi) doğru yazdığınızdan emin olun.",
        },
        [TicketCategory.Software] = new[]
        {
            "Uygulamayı kapatıp yeniden açmayı deneyin.",
            "Bilgisayarınızı yeniden başlatın — özellikle bir güncellemeden sonra bu çoğu sorunu çözer.",
            "Uygulamanın güncel sürümde olup olmadığını kontrol edin.",
            "Hata mesajının tam metnini not alın, talebe eklerseniz çözüm süresi kısalır.",
        },
        [TicketCategory.Hardware] = new[]
        {
            "Bilgisayarınızı tamamen kapatıp (kapat, yeniden başlat değil) 1 dakika sonra açmayı deneyin.",
            "Kabloların (güç, ekran, klavye/mouse) sağlam bağlı olduğunu kontrol edin.",
            "Fazla ısınma olabilir — bilgisayarı birkaç dakika dinlendirip tekrar deneyin.",
            "Mümkünse başka bir güç prizi/kablo ile deneyin.",
        },
        [TicketCategory.Other] = new[]
        {
            "Sorunu fark ettiğinizden beri değişen bir şey olup olmadığını düşünün (yeni kurulum, güncelleme vb.).",
            "Bilgisayarınızı yeniden başlatmayı deneyin — birçok sorunun ilk çözümü budur.",
            "Aynı sorunu yaşayan başka bir kullanıcı olup olmadığını bir iş arkadaşınıza sorun.",
        },
    };

    private static (TicketCategory Category, string Subcategory, string Team, int Score, string[] MatchedKeywords) DetectCategory(string text)
    {
        var bestRule = Rules
            .Select(r => new { Rule = r, Score = r.Keywords.Count(k => text.Contains(k)) })
            .OrderByDescending(x => x.Score)
            .First();

        if (bestRule.Score == 0)
            return (TicketCategory.Other, "Genel", "Genel Destek", 0, Array.Empty<string>());

        return (bestRule.Rule.Category, bestRule.Rule.Subcategory, bestRule.Rule.Team, bestRule.Score,
            bestRule.Rule.Keywords.Where(text.Contains).ToArray());
    }

    public Task<AiSuggestionResult> SuggestAsync(string title, string description, List<Ticket> recentTickets)
    {
        var text = $"{title} {description}".ToLowerInvariant();
        var (category, subcategory, team, score, matchedKeywords) = DetectCategory(text);
        TicketPriority priority;
        if (CriticalWords.Any(text.Contains)) priority = TicketPriority.Critical;
        else if (HighWords.Any(text.Contains)) priority = TicketPriority.High;
        else if (LowWords.Any(text.Contains)) priority = TicketPriority.Low;
        else priority = TicketPriority.Medium;
        var inputWords = Tokenize(text);
        var similar = recentTickets
            .Select(t => new
            {
                Ticket = t,
                Score = OverlapScore(inputWords, Tokenize($"{t.Title} {t.Description}".ToLowerInvariant()))
            })
            .Where(x => x.Score > 0)
            .OrderByDescending(x => x.Score)
            .Take(3)
            .Select(x => x.Ticket.Id)
            .ToList();

        var reasoning = score > 0
            ? $"\"{string.Join(", ", matchedKeywords)}\" ifadeleri talep metninde geçtiği için bu kategori önerildi."
            : "Metinde belirgin bir anahtar kelime bulunamadı, genel kategori önerildi.";

        return Task.FromResult(new AiSuggestionResult(category, subcategory, priority, team, reasoning, similar));
    }

    public Task<List<string>> SuggestSolutionStepsAsync(string title, string description)
    {
        var text = $"{title} {description}".ToLowerInvariant();
        var (category, _, _, _, _) = DetectCategory(text);
        var steps = SolutionSteps.TryGetValue(category, out var found) ? found : SolutionSteps[TicketCategory.Other];
        return Task.FromResult(steps.ToList());
    }

    private static HashSet<string> Tokenize(string text) =>
        text.Split(new[] { ' ', ',', '.', '!', '?', '\n', '\r', '\t' }, StringSplitOptions.RemoveEmptyEntries)
            .Where(w => w.Length > 3)
            .ToHashSet();

    private static int OverlapScore(HashSet<string> a, HashSet<string> b) => a.Intersect(b).Count();
}
