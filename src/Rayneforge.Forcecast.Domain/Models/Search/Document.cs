namespace Rayneforge.Forecast.Domain.Models;

using Rayneforge.Forecast.Domain.Abstractions;
using Rayneforge.Forecast.Domain.Attributes;

public class Document : ISemanticEntity
{
    public string Id { get; set; } = Guid.NewGuid().ToString();
    public ReadOnlyMemory<float> Embedding { get; set; }
    public string Content { get; set; } = string.Empty;
    
    [Filterable("The document title")]
    public string Title { get; set; } = string.Empty;
    
    [Filterable("Source URL")]
    public string? Url { get; set; }

    [Filterable("Creation date")]
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;

    public static EntitySchema GetSchema() => EntitySchemaBuilder.Build<Document>();

    public static string GetSchemaDescription() => SchemaFormatter.ToText(GetSchema());
}
