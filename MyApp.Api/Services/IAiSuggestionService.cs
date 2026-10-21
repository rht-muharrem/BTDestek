using MyApp.Api.Models;

namespace MyApp.Api.Services;

// IT personelinin işini kolaylaştıran öneri katmanı: talep metnini analiz edip
// kategori/öncelik/ekip önerir ve geçmişteki benzer talepleri bulur.
// Ayrıca kullanıcı tarafında, talep açmadan önce kendi kendine deneyebileceği
// basit çözüm adımlarını önerir.
public interface IAiSuggestionService
{
    Task<AiSuggestionResult> SuggestAsync(string title, string description, List<Ticket> recentTickets);

    Task<List<string>> SuggestSolutionStepsAsync(string title, string description);
}

public record AiSuggestionResult(
    TicketCategory Category,
    string Subcategory,
    TicketPriority Priority,
    string SuggestedTeam,
    string Reasoning,
    List<int> SimilarTicketIds
);
