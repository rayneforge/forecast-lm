namespace Rayneforge.Forecast.Domain.Models;

using Rayneforge.Forecast.Domain.Abstractions;
using Rayneforge.Forecast.Domain.Attributes;

// ─── Entity Type ────────────────────────────────────────────────

public enum EntityType
{
    Person,
    Organization,
    Place,
    Concept
}

// ─── Entity ─────────────────────────────────────────────────────

/// <summary>
/// A canonical, deduplicated entity extracted from news articles
/// (e.g. a person, organization, place, or concept).
/// </summary>
public record Entity : ISemanticEntity
{
    public string Id { get; init; } = Guid.NewGuid().ToString();

    [Filterable("The type of entity (Person, Organization, Place, Concept)")]
    public EntityType EntityType { get; set; }

    [Filterable("The canonical/normalized name")]
    public required string CanonicalName { get; set; }

    public string? Description { get; set; }

    public ReadOnlyMemory<float> Embedding { get; set; }

    // ── ISemanticEntity ──
    string ISemanticEntity.Title => CanonicalName;
    string ISemanticEntity.Content => Description ?? CanonicalName;
    string? ISemanticEntity.Url => null;

    public Entity() { }

    public static EntitySchema GetSchema() => EntitySchemaBuilder.Build<Entity>();

    public static string GetSchemaDescription() => SchemaFormatter.ToText(GetSchema());
}
