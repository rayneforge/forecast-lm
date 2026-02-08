using System.Net.Http.Json;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Microsoft.ApplicationInsights;
using Rayneforge.Forecast.Infrastructure.Abstractions;
using Rayneforge.Forecast.Infrastructure.Embeddings.Dtos;
using Rayneforge.Forecast.Infrastructure.Extensions;
using Rayneforge.Forecast.Infrastructure.Options;

namespace Rayneforge.Forecast.Infrastructure.Embeddings;

public sealed class OllamaEmbeddingsProvider : IEmbeddingsProvider
{
    private readonly HttpClient _http;
    private readonly OllamaEmbeddingsOptions _opt;
    private readonly ILogger<OllamaEmbeddingsProvider> _logger;
    private readonly TelemetryClient _telemetry;

    public string ProviderName => "ollama";

    public OllamaEmbeddingsProvider(
        HttpClient http, 
        IOptions<EmbeddingsOptions> opt, 
        ILogger<OllamaEmbeddingsProvider> logger,
        TelemetryClient telemetry)
    {
        _http = http;
        // Use the configured options. 
        // Note: The factory/DI registration should ensure http client is pre-configured with BaseAddress 
        // if we use the typed client pattern correctly.
        _opt = opt.Value.Ollama;
        _logger = logger;
        _telemetry = telemetry;
    }

    public async Task<IReadOnlyList<float[]>> EmbedAsync(IReadOnlyList<string> inputs, CancellationToken ct = default)
    {
        if (inputs.Count == 0) return Array.Empty<float[]>();

        // /api/embeddings supports single prompt in some versions; /api/embed supports list (common newer path).
        // We'll call /api/embed with { model, input: [...] }
        var payload = new
        {
            model = _opt.Model,
            input = inputs
        };

        _logger.LogDebug("Generating embeddings for {Count} inputs using model {Model}", inputs.Count, _opt.Model);

        using var resp = await _http.PostAsJsonAsync("/api/embed", payload, ct);
        resp.EnsureSuccessStatusCode();

        var data = await resp.Content.ReadFromJsonAsync<OllamaEmbeddingsResponse>(cancellationToken: ct)
                   ?? throw new InvalidOperationException("Ollama embeddings response was empty.");

        _telemetry.TrackModelUsage(
            "embedding",
            _opt.Model,
            data.PromptEvalCount,
            data.EvalCount,
            provider: "ollama");

        // Ensure order matches input. Ollama returns in order.
        if (data.Embeddings.Count != inputs.Count)
            throw new InvalidOperationException($"Ollama returned {data.Embeddings.Count} embeddings for {inputs.Count} inputs.");

        return data.Embeddings;
    }
}
