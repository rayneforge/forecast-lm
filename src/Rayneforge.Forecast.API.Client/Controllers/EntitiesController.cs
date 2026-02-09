using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.OData.Query;
using Rayneforge.Forecast.Domain.Models;
using Rayneforge.Forecast.Infrastructure.Abstractions;

using Microsoft.AspNetCore.Authorization;

namespace Rayneforge.Forecast.API.Controllers;

[ApiController]
[Authorize]
[Route("api/[controller]")]
public class EntitiesController(
    ISemanticRepository<Entity> repository,
    ISemanticRepository<NewsArticle> articleRepository,
    IEmbeddingsProvider embeddingsProvider) : ControllerBase
{
    [HttpGet("schema")]
    [AllowAnonymous]
    public ActionResult<EntitySchema> GetSchema() => Ok(Entity.GetSchema());

    [HttpGet]
    [EnableQuery]
    public async Task<IQueryable<Entity>> Get()
    {
        var items = await repository.GetAllAsync();
        return items.AsQueryable();
    }

    [HttpGet("search")]
    [EnableQuery]
    public async Task<IQueryable<Entity>> Search(
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
             var results = await repository.HybridSearchAsync(q, vectors[0], limit: 50);
             return results.Select(r => r.Entity).AsQueryable();
        }

        // Default: simple text search
        var items = await repository.FindAsync(a => 
            a.CanonicalName.Contains(q) || (a.Description != null && a.Description.Contains(q))
        );
        return items.AsQueryable();
    }

    [HttpGet("related-to-article/{articleId}")]
    public async Task<ActionResult<IEnumerable<Entity>>> GetRelatedToArticle(string articleId)
    {
        // 1. Get Article with Claims
        var article = await articleRepository.GetAsync(articleId);
        if (article == null) return NotFound("Article not found");

        // Note: This relies on the repository loading the graph (Claims -> EntityLinks -> Entity)
        // If not loaded, this will be empty. 
        var entities = article.Claims
            .SelectMany(c => c.EntityLinks)
            .Select(el => el.Entity)
            .Where(e => e != null)
            .DistinctBy(e => e!.Id)
            .ToList();

        return Ok(entities);
    }
}
