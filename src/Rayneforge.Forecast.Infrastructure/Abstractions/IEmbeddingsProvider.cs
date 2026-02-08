namespace Rayneforge.Forecast.Infrastructure.Abstractions;

public interface IEmbeddingsProvider
{
    string ProviderName { get; }

    /// <summary>Returns one vector per input (same order).</summary>
    Task<IReadOnlyList<float[]>> EmbedAsync(
        IReadOnlyList<string> inputs,
        CancellationToken ct = default);
}
