namespace Rayneforge.Forecast.Domain.Models;

using Rayneforge.Forecast.Domain.Abstractions;
using Rayneforge.Forecast.Domain.Attributes;
using System.Reflection;

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

    public static string GetSchemaDescription()
    {
        var sb = new System.Text.StringBuilder();
        sb.AppendLine($"Entity: {nameof(Entity)}");

        foreach (var prop in typeof(Entity).GetProperties(BindingFlags.Public | BindingFlags.Instance))
        {
            var attr = prop.GetCustomAttribute<FilterableAttribute>();
            if (attr == null) continue;

            var typeName = prop.PropertyType.IsEnum ? "enum" : prop.PropertyType.Name;
            if (prop.PropertyType == typeof(string)) typeName = "string";

            var desc = attr.Description != null ? $" - {attr.Description}" : "";
            sb.AppendLine($"- {prop.Name} ({typeName}){desc}");
        }
        return sb.ToString();
    }
}
