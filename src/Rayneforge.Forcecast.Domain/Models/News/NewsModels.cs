namespace Rayneforge.Forecast.Domain.Models;

using Rayneforge.Forecast.Domain.Abstractions;
using Rayneforge.Forecast.Domain.Attributes;

public record NewsSource
{
    public string? Id { get; init; }
    public required string Name { get; init; }
    
    public NewsSource() {} // EF Core
    
    [System.Diagnostics.CodeAnalysis.SetsRequiredMembers]
    public NewsSource(string? id, string name)
    {
        Id = id;
        Name = name;
    }
}

public record NewsArticle : ISemanticEntity
{
    public string Id { get; init; } = Guid.NewGuid().ToString();

    [Filterable("The source organization or publication name")]
    public NewsSource Source { get; set; } = new(null, "Unknown");

    [Filterable("The author of the article")]
    public string? Author { get; set; }

    [Filterable("The headline/title of the article")]
    public required string Title { get; set; }

    public string? Description { get; set; }
    
    [Filterable("The original URL")]
    public required string Url { get; set; }
    
    public string? UrlToImage { get; set; }
    
    [Filterable("The publication date")]
    public DateTimeOffset PublishedAt { get; set; }
    
    public string? Content { get; set; }

    /// <summary>Unstructured journalistic summary of the speculative narrative positioning for this article.</summary>
    public string? SpeculativeNarrative { get; set; }

    public ReadOnlyMemory<float> Embedding { get; set; }

    // ── Navigation ──
    public ICollection<ArticleClaim> Claims { get; set; } = [];
    
    string ISemanticEntity.Content => Content ?? Description ?? Title;
    
    public NewsArticle() {}

    public static EntitySchema GetSchema() => EntitySchemaBuilder.Build<NewsArticle>();

    public static string GetSchemaDescription() => SchemaFormatter.ToText(GetSchema());
}

public record NewsResult(
    int TotalResults,
    IEnumerable<NewsArticle> Articles
);
