namespace MyApp.Api.Models.Dtos;

public record SuggestTicketRequest(string Title, string Description);

public record SimilarTicketInfo(int Id, string Title, string Status);

public record SuggestTicketResponse(
    string Category,
    string Subcategory,
    string Priority,
    string SuggestedTeam,
    string Reasoning,
    List<SimilarTicketInfo> SimilarTickets
);

public record SuggestSolutionResponse(List<string> Steps);
