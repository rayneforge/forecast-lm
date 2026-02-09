namespace Rayneforge.Forecast.Domain.Abstractions;

using Rayneforge.Forecast.Domain.Models;

public interface ISemanticEntity
{
    string Id { get; }
    ReadOnlyMemory<float> Embedding { get; set; }
    string Content { get; }
    string Title { get; }
    string? Url { get; }

    /// <summary>
    /// Returns a JSON-serializable schema describing the filterable
    /// properties of this entity type. Uses <see cref="EntitySchemaBuilder"/>
    /// so individual models no longer need their own reflection code.
    /// </summary>
    static abstract EntitySchema GetSchema();

    /// <summary>
    /// Legacy plain-text description. Delegates to <see cref="GetSchema"/>
    /// and formats as a human-readable string for backward compatibility.
    /// </summary>
    static abstract string GetSchemaDescription();
}
