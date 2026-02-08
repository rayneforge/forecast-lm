namespace Rayneforge.Forecast.Domain.Abstractions;

public interface ISemanticEntity
{
    string Id { get; }
    ReadOnlyMemory<float> Embedding { get; set; }
    string Content { get; }
    string Title { get; }
    string? Url { get; }

    static abstract string GetSchemaDescription();
}
