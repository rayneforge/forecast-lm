using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.OData.Query;
using Rayneforge.Forecast.Domain.Models;
using Rayneforge.Forecast.Infrastructure.Abstractions;

using Microsoft.AspNetCore.Authorization;

namespace Rayneforge.Forecast.API.Controllers;

[ApiController]
[Authorize]
[Route("api/[controller]")]
public class NarrativesController(
    ISemanticRepository<Narrative> repository,
    ISemanticRepository<NewsArticle> articleRepository,
    ISemanticRepository<Entity> entityRepository,
    IEmbeddingsProvider embeddingsProvider) : ControllerBase
{
    [HttpGet("schema")]
    [AllowAnonymous]
    public ActionResult<EntitySchema> GetSchema() => Ok(Narrative.GetSchema());

    [HttpGet]
    [EnableQuery]
    public async Task<IQueryable<Narrative>> Get()
    {
        var items = await repository.GetAllAsync();
        return items.AsQueryable();
    }

    [HttpGet("search")]
    [EnableQuery]
    public async Task<IQueryable<Narrative>> Search(
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

        var items = await repository.FindAsync(a => 
            a.Label.Contains(q) || (a.Justification != null && a.Justification.Contains(q))
        );
        return items.AsQueryable();
    }

    [HttpGet("related-to-article/{articleId}")]
    public async Task<ActionResult<IEnumerable<Narrative>>> GetRelatedToArticle(string articleId)
    {
        // Check if article exists
        var article = await articleRepository.GetAsync(articleId);
        if (article == null) return NotFound("Article not found");
        
        // Find narratives that link to any claim in this article
        var narratives = await repository.FindAsync(n => 
            n.ClaimLinks.Any(cl => cl.Claim != null && cl.Claim.ArticleId == articleId)
        );

        return Ok(narratives);
    }

    [HttpGet("related-to-entity/{entityId}")]
    public async Task<ActionResult<IEnumerable<Narrative>>> GetRelatedToEntity(string entityId)
    {
        // Check if entity exists
        var entity = await entityRepository.GetAsync(entityId);
        if (entity == null) return NotFound("Entity not found");

        var narratives = await repository.FindAsync(n => 
            // Direct link
            n.EntityLinks.Any(el => el.EntityId == entityId) ||
            // Via Claim
            n.ClaimLinks.Any(cl => cl.Claim != null && cl.Claim.EntityLinks.Any(ce => ce.EntityId == entityId))
        );

        return Ok(narratives);
    }
}
