using MyApp.Api.Models;

namespace MyApp.Api.Services;

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
