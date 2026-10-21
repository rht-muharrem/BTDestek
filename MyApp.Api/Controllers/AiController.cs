using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MyApp.Api.Data;
using MyApp.Api.Models.Dtos;
using MyApp.Api.Services;

namespace MyApp.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class AiController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly IAiSuggestionService _ai;

    public AiController(AppDbContext db, IAiSuggestionService ai)
    {
        _db = db;
        _ai = ai;
    }

    // Kullanıcı "Yeni Talep" formunu doldururken çağrılır -> kategori/öncelik/ekip önerisi
    // ve geçmişteki benzer talepleri döner. Talep henüz oluşturulmamış olabilir, sadece
    // yazarken canlı öneri için kullanılır.
    [HttpPost("suggest")]
    public async Task<ActionResult<SuggestTicketResponse>> Suggest(SuggestTicketRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Title) && string.IsNullOrWhiteSpace(request.Description))
            return Ok(new SuggestTicketResponse("Other", "Genel", "Medium", "Genel Destek", "", new List<SimilarTicketInfo>()));

        var recentTickets = await _db.Tickets
            .OrderByDescending(t => t.CreatedAt)
            .Take(200) // performans için son 200 talep ile sınırlı
            .ToListAsync();

        var result = await _ai.SuggestAsync(request.Title, request.Description, recentTickets);

        var similarTickets = new List<SimilarTicketInfo>();
        foreach (var id in result.SimilarTicketIds)
        {
            var t = recentTickets.FirstOrDefault(x => x.Id == id);
            if (t is not null) similarTickets.Add(new SimilarTicketInfo(t.Id, t.Title, t.Status.ToString()));
        }

        return Ok(new SuggestTicketResponse(
            result.Category.ToString(),
            result.Subcategory,
            result.Priority.ToString(),
            result.SuggestedTeam,
            result.Reasoning,
            similarTickets
        ));
    }

    // Kullanıcı "Yeni Talep" formunu doldururken çağrılır -> talep açmadan önce kendi
    // deneyebileceği basit çözüm adımlarını önerir (kategori/öncelik göstermez).
    [HttpPost("suggest-solution")]
    public async Task<ActionResult<SuggestSolutionResponse>> SuggestSolution(SuggestTicketRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Description))
            return Ok(new SuggestSolutionResponse(new List<string>()));

        var steps = await _ai.SuggestSolutionStepsAsync(request.Title, request.Description);
        return Ok(new SuggestSolutionResponse(steps));
    }
}
