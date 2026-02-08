using System.ComponentModel;
using System.Text.Json;
using ModelContextProtocol.Server;
using Rayneforge.Forecast.Domain.Models;
using Rayneforge.Forecast.Infrastructure.Abstractions;

namespace Rayneforge.Forecast.API.Tools;

internal class NewsApiTools(
    ISemanticRepository<NewsArticle> repository,
    IEmbeddingsProvider embeddingsProvider)
{
    [McpServerTool]
    [Description("Search through stored news articles.")]
    public async Task<string> SearchNews(
        [Description("Keywords or phrases to search for in the article title and body.")] string q,
        [Description("Search mode: 'simple' (text match), 'semantic' (vector similarity), or 'hybrid' (combined).")] string mode = "simple",
        [Description("A date and optional time for the oldest article allowed (ISO 8601).")] string? from = null,
        [Description("The order to sort the articles in. Possible options: publishedAt. Only applies to simple search.")] string? sortBy = null,
        [Description("The number of results to return per page (request).")] int pageSize = 20,
        [Description("Use this to page through the results.")] int page = 1)
    {
        var targetDate = string.IsNullOrEmpty(from) ? DateTimeOffset.MinValue : DateTimeOffset.Parse(from);
        
        List<NewsArticle> results;

        if (string.Equals(mode, "semantic", StringComparison.OrdinalIgnoreCase) && !string.IsNullOrWhiteSpace(q))
        {
            var vectors = await embeddingsProvider.EmbedAsync(new[] { q });
            // Retrieve enough items to cover the requested page
            var semanticResults = await repository.SemanticSearchAsync(vectors[0], limit: page * pageSize);
            // Filter by date if requested (post-filter, as repository might not support pre-filter on vector search yet)
            results = semanticResults.Where(a => a.PublishedAt >= targetDate).ToList();
        }
        else if (string.Equals(mode, "hybrid", StringComparison.OrdinalIgnoreCase) && !string.IsNullOrWhiteSpace(q))
        {
             var vectors = await embeddingsProvider.EmbedAsync(new[] { q });
             var hybridResults = await repository.HybridSearchAsync(q, vectors[0], limit: page * pageSize);
             results = hybridResults
                .Select(r => r.Entity)
                .Where(a => a.PublishedAt >= targetDate)
                .ToList();
        }
        else
        {
            // Simple text search
            var items = await repository.FindAsync(a => 
                (string.IsNullOrEmpty(q) || a.Title.Contains(q) || (a.Content != null && a.Content.Contains(q))) &&
                a.PublishedAt >= targetDate
            );
            
            // Sort only for simple search as vector search implies relevance sorting
            results = items.OrderByDescending(x => x.PublishedAt).ToList();
        }

        var paged = results.Skip((page - 1) * pageSize).Take(pageSize).ToList();
        
        return JsonSerializer.Serialize(new NewsResult(results.Count, paged));
    }

    [McpServerTool]
    [Description("Get recent headlines from the stored news articles.")]
    public async Task<string> GetRecentNews(
        [Description("A comma-separated string of identifiers for the news sources or blogs you want headlines from.")] string? sources = null,
        [Description("Keywords or phrases to search for in the article title and/or body.")] string? q = null,
        [Description("The number of results to return per page (request).")] int pageSize = 20,
        [Description("Use this to page through the results.")] int page = 1)
    {
         var sourceList = sources?.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);

         var items = await repository.FindAsync(a => 
            (string.IsNullOrEmpty(q) || a.Title.Contains(q) || (a.Content != null && a.Content.Contains(q))) &&
            (sourceList == null || sourceList.Length == 0 || (a.Source.Id != null && sourceList.Contains(a.Source.Id)) || sourceList.Contains(a.Source.Name))
        );

        var paged = items.OrderByDescending(x => x.PublishedAt)
                         .Skip((page - 1) * pageSize)
                         .Take(pageSize)
                         .ToList();

        return JsonSerializer.Serialize(new NewsResult(items.Count(), paged));
    }
}
