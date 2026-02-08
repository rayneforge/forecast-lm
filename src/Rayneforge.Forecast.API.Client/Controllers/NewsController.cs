using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.OData.Query;
using Rayneforge.Forecast.Domain.Models;
using Rayneforge.Forecast.Infrastructure.Abstractions;

using Microsoft.AspNetCore.Authorization;

namespace Rayneforge.Forecast.API.Controllers;

[ApiController]
[Authorize]
[Route("api/[controller]")]
public class NewsController(
    ISemanticRepository<NewsArticle> repository,
    IEmbeddingsProvider embeddingsProvider) : ControllerBase
{
    [HttpGet]
    [EnableQuery]
    public async Task<IQueryable<NewsArticle>> Get()
    {
        // Note: For true efficiency, Repository should expose IQueryable. 
        // Currently buffering into memory.
        var items = await repository.GetAllAsync();
        return items.AsQueryable();
    }

    [HttpGet("search")]
    [EnableQuery]
    public async Task<IQueryable<NewsArticle>> SearchNews(
        [FromQuery] string? q,
        [FromQuery] string? mode = "simple")
    {
        if (string.IsNullOrWhiteSpace(q))
        {
            var all = await repository.GetAllAsync();
            return all.AsQueryable();
        }

        if (string.Equals(mode, "semantic", StringComparison.OrdinalIgnoreCase))
        {
             var vectors = await embeddingsProvider.EmbedAsync(new[] { q });
             var results = await repository.SemanticSearchAsync(vectors[0], limit: 50);
             return results.AsQueryable();
        }

        if (string.Equals(mode, "hybrid", StringComparison.OrdinalIgnoreCase))
        {
             var vectors = await embeddingsProvider.EmbedAsync(new[] { q });
             // HybridSearch returns SearchResult<T>
             var results = await repository.HybridSearchAsync(q, vectors[0], limit: 50);
             return results.Select(r => r.Entity).AsQueryable();
        }

        // Default: simple text search
        var items = await repository.FindAsync(a => 
            a.Title.Contains(q) || (a.Content != null && a.Content.Contains(q))
        );
        return items.AsQueryable();
    }

    [HttpGet("recent")]
    [EnableQuery]
    public async Task<IQueryable<NewsArticle>> GetRecentNews()
    {
        // Focuses on items from the current day
        var today = DateTimeOffset.UtcNow.Date;
        
        var items = await repository.FindAsync(a => 
            a.PublishedAt >= today
        );

        return items.AsQueryable();
    }
}
