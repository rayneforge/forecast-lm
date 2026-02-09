namespace Rayneforge.Forecast.Domain.Models;

using System;
using System.Collections.Generic;
using System.Linq;
using System.Reflection;
using System.Text.Json.Serialization;
using Rayneforge.Forecast.Domain.Attributes;

// ─── JSON-serializable schema models ────────────────────────────

/// <summary>
/// A machine-readable schema describing one entity type and its
/// filterable properties. Modelled after JSON Schema conventions.
/// </summary>
public record EntitySchema
{
    /// <summary>Entity type name, e.g. "NewsArticle".</summary>
    public required string Entity { get; init; }

    /// <summary>One entry per <see cref="FilterableAttribute"/>-annotated property.</summary>
    public required IReadOnlyList<EntityPropertySchema> Properties { get; init; }
}

/// <summary>
/// Schema descriptor for a single filterable property.
/// </summary>
public record EntityPropertySchema
{
    /// <summary>Property name in PascalCase (matches the JSON serialization key).</summary>
    public required string Name { get; init; }

    /// <summary>
    /// JSON-Schema-like type string:
    /// "string" | "integer" | "number" | "boolean" | "datetime" | "enum" | "object".
    /// </summary>
    public required string Type { get; init; }

    /// <summary>Human-readable description for the UI label / tooltip.</summary>
    public string? Description { get; init; }

    /// <summary>
    /// UI filter hint: "text" | "enum" | "dateRange" | "toggle" | "range".
    /// Derived from <see cref="FilterableAttribute.FilterType"/> or auto-inferred.
    /// </summary>
    public required string FilterType { get; init; }

    /// <summary>
    /// For enums: the list of allowed values. Null otherwise.
    /// </summary>
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public IReadOnlyList<string>? EnumValues { get; init; }

    /// <summary>
    /// For object types: dot-path to the display property (e.g. "Name").
    /// Null if not applicable.
    /// </summary>
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public string? DisplayProperty { get; init; }
}

// ─── Shared reflection helper ───────────────────────────────────

/// <summary>
/// Builds an <see cref="EntitySchema"/> for any type by reflecting
/// over <see cref="FilterableAttribute"/>-annotated properties.
/// Call once at startup or from a /schema endpoint.
/// </summary>
public static class EntitySchemaBuilder
{
    public static EntitySchema Build<T>() => Build(typeof(T));

    public static EntitySchema Build(Type type)
    {
        var props = type
            .GetProperties(BindingFlags.Public | BindingFlags.Instance)
            .Select(p => (prop: p, attr: p.GetCustomAttribute<FilterableAttribute>()))
            .Where(x => x.attr is not null)
            .Select(x => MapProperty(x.prop, x.attr!))
            .ToList();

        return new EntitySchema
        {
            Entity = type.Name,
            Properties = props
        };
    }

    // ─── Private helpers ─────────────────────────────────────────

    private static EntityPropertySchema MapProperty(PropertyInfo prop, FilterableAttribute attr)
    {
        var clrType = Nullable.GetUnderlyingType(prop.PropertyType) ?? prop.PropertyType;
        var (jsonType, enumValues, displayProp) = ResolveType(clrType);
        var filterType = ResolveFilterType(attr.FilterType, clrType, jsonType);

        return new EntityPropertySchema
        {
            Name = prop.Name,
            Type = jsonType,
            Description = attr.Description,
            FilterType = filterType,
            EnumValues = enumValues,
            DisplayProperty = displayProp,
        };
    }

    private static (string jsonType, IReadOnlyList<string>? enumValues, string? displayProp)
        ResolveType(Type clr)
    {
        if (clr == typeof(string))
            return ("string", null, null);

        if (clr == typeof(bool))
            return ("boolean", null, null);

        if (clr == typeof(DateTimeOffset) || clr == typeof(DateTime))
            return ("datetime", null, null);

        if (clr == typeof(int) || clr == typeof(long) || clr == typeof(short))
            return ("integer", null, null);

        if (clr == typeof(float) || clr == typeof(double) || clr == typeof(decimal))
            return ("number", null, null);

        if (clr.IsEnum)
        {
            var values = Enum.GetNames(clr).ToList();
            return ("enum", values, null);
        }

        // Complex object — try to find a "Name" or "Title" display property
        var display = clr.GetProperty("Name") ?? clr.GetProperty("Title");
        return ("object", null, display?.Name);
    }

    private static string ResolveFilterType(FilterType explicit_, Type clr, string jsonType)
    {
        if (explicit_ != Attributes.FilterType.Auto)
            return explicit_ switch
            {
                Attributes.FilterType.Text => "text",
                Attributes.FilterType.Enum => "enum",
                Attributes.FilterType.DateRange => "dateRange",
                Attributes.FilterType.Toggle => "toggle",
                Attributes.FilterType.Range => "range",
                _ => "text",
            };

        // Auto-infer from CLR / JSON type
        return jsonType switch
        {
            "enum" => "enum",
            "boolean" => "toggle",
            "datetime" => "dateRange",
            "integer" or "number" => "range",
            "object" => "text",
            _ => "text",
        };
    }
}

/// <summary>
/// Formats an <see cref="EntitySchema"/> as a human-readable string
/// for backward compatibility with prompt templates and logging.
/// </summary>
public static class SchemaFormatter
{
    public static string ToText(EntitySchema schema)
    {
        var sb = new System.Text.StringBuilder();
        sb.AppendLine($"Entity: {schema.Entity}");
        foreach (var p in schema.Properties)
        {
            var type = p.Type;
            if (p.EnumValues is { Count: > 0 })
                type = $"enum({string.Join("|", p.EnumValues)})";
            if (p.DisplayProperty is not null)
                type = $"object({p.DisplayProperty})";

            var desc = p.Description is not null ? $" - {p.Description}" : "";
            sb.AppendLine($"- {p.Name} ({type}){desc}");
        }
        return sb.ToString();
    }
}
