using System;

namespace Rayneforge.Forecast.Domain.Attributes;

/// <summary>
/// Marks a property as filterable in the UI.
/// The reflection-based schema generator reads these to produce
/// a JSON-compatible entity schema.
/// </summary>
[AttributeUsage(AttributeTargets.Property)]
public class FilterableAttribute(
    string? description = null,
    FilterType filterType = FilterType.Auto) : Attribute
{
    public string? Description { get; } = description;

    /// <summary>
    /// Explicit filter type hint. When <see cref="FilterType.Auto"/>,
    /// the schema generator infers from the CLR type (enum → enum, string → text, etc.).
    /// </summary>
    public FilterType FilterType { get; } = filterType;
}

/// <summary>Controls how the UI should render the corresponding filter.</summary>
public enum FilterType
{
    /// <summary>Infer from the CLR property type.</summary>
    Auto,
    /// <summary>Free-text / contains search.</summary>
    Text,
    /// <summary>Pick from a fixed set of enum values.</summary>
    Enum,
    /// <summary>Date / datetime range picker.</summary>
    DateRange,
    /// <summary>On / off toggle.</summary>
    Toggle,
    /// <summary>Numeric range slider.</summary>
    Range,
}
