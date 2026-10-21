using System.Text;
using System.Text.Json;
using MyApp.Api.Models;

namespace MyApp.Api.Services;

// Gerçek AI önerisi: Anthropic Claude API'sini çağırır. Kullanmak için appsettings.json'a
// kendi API anahtarını ekleyip Program.cs'te servis kaydını bu sınıfa çevirmen yeterli
// (bkz. README.md "AI Katmanı" bölümü). RuleBasedAiSuggestionService ile aynı arayüzü
// kullandığı için geri kalan kodda (controller, frontend) HİÇBİR değişiklik gerekmez.
public class ClaudeAiSuggestionService : IAiSuggestionService
{
    private readonly HttpClient _http;
    private readonly IConfiguration _config;
    private readonly ILogger<ClaudeAiSuggestionService> _logger;
    private readonly RuleBasedAiSuggestionService _fallback = new();

    public ClaudeAiSuggestionService(HttpClient http, IConfiguration config, ILogger<ClaudeAiSuggestionService> logger)
    {
        _http = http;
        _config = config;
        _logger = logger;
    }

    public async Task<AiSuggestionResult> SuggestAsync(string title, string description, List<Ticket> recentTickets)
    {
        var apiKey = _config["Anthropic:ApiKey"];
        if (string.IsNullOrWhiteSpace(apiKey))
        {
            _logger.LogWarning("Anthropic:ApiKey tanımlı değil, kural tabanlı öneriye düşülüyor.");
            return await _fallback.SuggestAsync(title, description, recentTickets);
        }

        try
        {
            var ticketList = string.Join("\n", recentTickets.Take(60).Select(t => $"#{t.Id}: {t.Title}"));

            var prompt = $$"""
                Sen bir IT destek masası için sınıflandırma asistanısın. Aşağıdaki yeni talebi analiz et
                ve SADECE aşağıdaki JSON formatında yanıt ver, başka hiçbir açıklama ekleme:

                {
                  "category": "Hardware|Software|Network|Printer|Access|Other",
                  "subcategory": "kısa bir alt kategori adı (Türkçe)",
                  "priority": "Low|Medium|High|Critical",
                  "suggestedTeam": "önerilen ekip adı (Türkçe)",
                  "reasoning": "bir cümlelik kısa gerekçe (Türkçe)",
                  "similarTicketIds": [ilgili geçmiş talep numaraları, en fazla 3 tane]
                }

                Yeni talep başlığı: {{title}}
                Yeni talep açıklaması: {{description}}

                Geçmiş talepler (numara: başlık):
                {{ticketList}}
                """;

            var requestBody = new
            {
                model = "claude-haiku-4-5-20251001",
                max_tokens = 400,
                messages = new[] { new { role = "user", content = prompt } }
            };

            using var request = new HttpRequestMessage(HttpMethod.Post, "https://api.anthropic.com/v1/messages");
            request.Headers.Add("x-api-key", apiKey);
            request.Headers.Add("anthropic-version", "2023-06-01");
            request.Content = new StringContent(JsonSerializer.Serialize(requestBody), Encoding.UTF8, "application/json");

            var response = await _http.SendAsync(request);
            response.EnsureSuccessStatusCode();

            var responseJson = await response.Content.ReadAsStringAsync();
            using var doc = JsonDocument.Parse(responseJson);
            var text = doc.RootElement.GetProperty("content")[0].GetProperty("text").GetString() ?? "{}";

            // Model bazen JSON'u ```json ... ``` bloğu içine sarabilir, temizle.
            text = text.Trim().Trim('`').Replace("json\n", "").Trim();

            var parsed = JsonSerializer.Deserialize<ClaudeSuggestionJson>(text, new JsonSerializerOptions { PropertyNameCaseInsensitive = true });
            if (parsed is null) throw new InvalidOperationException("AI yanıtı ayrıştırılamadı.");

            var categoryOk = Enum.TryParse<TicketCategory>(parsed.Category, true, out var category);
            var priorityOk = Enum.TryParse<TicketPriority>(parsed.Priority, true, out var priority);

            return new AiSuggestionResult(
                categoryOk ? category : TicketCategory.Other,
                parsed.Subcategory ?? "Genel",
                priorityOk ? priority : TicketPriority.Medium,
                parsed.SuggestedTeam ?? "Genel Destek",
                parsed.Reasoning ?? "",
                parsed.SimilarTicketIds ?? new List<int>()
            );
        }
        catch (Exception ex)
        {
            // API çağrısı başarısız olursa (anahtar hatalı, ağ sorunu, kota vb.) kural tabanlı
            // öneriye sessizce düş — kullanıcı hiçbir hata görmez, sadece daha basit bir öneri alır.
            _logger.LogWarning(ex, "Claude API çağrısı başarısız oldu, kural tabanlı öneriye düşülüyor.");
            return await _fallback.SuggestAsync(title, description, recentTickets);
        }
    }

    public async Task<List<string>> SuggestSolutionStepsAsync(string title, string description)
    {
        var apiKey = _config["Anthropic:ApiKey"];
        if (string.IsNullOrWhiteSpace(apiKey))
        {
            _logger.LogWarning("Anthropic:ApiKey tanımlı değil, kural tabanlı öneriye düşülüyor.");
            return await _fallback.SuggestSolutionStepsAsync(title, description);
        }

        try
        {
            var prompt = $$"""
                Sen bir şirketin IT destek masasında, kullanıcıların talep açmadan önce kendi
                başlarına deneyebileceği basit çözümleri öneren bir asistansın. Aşağıdaki sorunu
                oku ve kullanıcının (teknik bilgisi olmayan biri olabilir) kendi başına deneyebileceği
                3-4 tane KISA, NET, Türkçe adım öner. Adımlar güvenli ve geri alınabilir olmalı
                (veri kaybına yol açabilecek "formatla" gibi öneriler VERME).

                SADECE aşağıdaki JSON formatında yanıt ver, başka hiçbir açıklama ekleme:
                { "steps": ["adım 1", "adım 2", "adım 3"] }

                Sorun başlığı: {{title}}
                Sorun açıklaması: {{description}}
                """;

            var requestBody = new
            {
                model = "claude-haiku-4-5-20251001",
                max_tokens = 300,
                messages = new[] { new { role = "user", content = prompt } }
            };

            using var request = new HttpRequestMessage(HttpMethod.Post, "https://api.anthropic.com/v1/messages");
            request.Headers.Add("x-api-key", apiKey);
            request.Headers.Add("anthropic-version", "2023-06-01");
            request.Content = new StringContent(JsonSerializer.Serialize(requestBody), Encoding.UTF8, "application/json");

            var response = await _http.SendAsync(request);
            response.EnsureSuccessStatusCode();

            var responseJson = await response.Content.ReadAsStringAsync();
            using var doc = JsonDocument.Parse(responseJson);
            var text = doc.RootElement.GetProperty("content")[0].GetProperty("text").GetString() ?? "{}";
            text = text.Trim().Trim('`').Replace("json\n", "").Trim();

            var parsed = JsonSerializer.Deserialize<ClaudeSolutionJson>(text, new JsonSerializerOptions { PropertyNameCaseInsensitive = true });
            return parsed?.Steps ?? await _fallback.SuggestSolutionStepsAsync(title, description);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Claude API çağrısı başarısız oldu, kural tabanlı öneriye düşülüyor.");
            return await _fallback.SuggestSolutionStepsAsync(title, description);
        }
    }

    private class ClaudeSuggestionJson
    {
        public string? Category { get; set; }
        public string? Subcategory { get; set; }
        public string? Priority { get; set; }
        public string? SuggestedTeam { get; set; }
        public string? Reasoning { get; set; }
        public List<int>? SimilarTicketIds { get; set; }
    }

    private class ClaudeSolutionJson
    {
        public List<string>? Steps { get; set; }
    }
}
