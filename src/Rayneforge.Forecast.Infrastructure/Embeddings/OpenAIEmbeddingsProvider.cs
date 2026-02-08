using System.Net.Http.Headers;
using System.Net.Http.Json;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Microsoft.ApplicationInsights;
using Rayneforge.Forecast.Infrastructure.Abstractions;
using Rayneforge.Forecast.Infrastructure.Embeddings.Dtos;
using Rayneforge.Forecast.Infrastructure.Extensions;
using Rayneforge.Forecast.Infrastructure.Options;

namespace Rayneforge.Forecast.Infrastructure.Embeddings;

public sealed class OpenAIEmbeddingsProvider : IEmbeddingsProvider
{
    private readonly HttpClient _http;
    private readonly OpenAIEmbeddingsOptions _opt;
    private readonly ILogger<OpenAIEmbeddingsProvider> _logger;
    private readonly TelemetryClient _telemetry;

    public string ProviderName => "openai";

    public OpenAIEmbeddingsProvider(
        HttpClient http, 
        IOptions<EmbeddingsOptions> opt, 
        ILogger<OpenAIEmbeddingsProvider> logger,
        TelemetryClient telemetry)
    {
        _http = http;
        _opt = opt.Value.OpenAI;
        _logger = logger;
        _telemetry = telemetry;

        if (string.IsNullOrWhiteSpace(_opt.ApiKey))
             // Assuming DI configuration might handle this validation, but good to check.
             _logger.LogWarning("OpenAI ApiKey is missing."); 
    }

    public async Task<IReadOnlyList<float[]>> EmbedAsync(IReadOnlyList<string> inputs, CancellationToken ct = default)
    {
        if (inputs.Count == 0) return Array.Empty<float[]>();

        using var req = new HttpRequestMessage(HttpMethod.Post, "/v1/embeddings")
        {
            Content = JsonContent.Create(new
            {
                model = _opt.Model,
                input = inputs
            })
        };

        if (!string.IsNullOrWhiteSpace(_opt.ApiKey))
        {
            req.Headers.Authorization = new AuthenticationHeaderValue("Bearer", _opt.ApiKey);
        }

        _logger.LogDebug("Generating embeddings for {Count} inputs using model {Model}", inputs.Count, _opt.Model);

        using var resp = await _http.SendAsync(req, ct);
        resp.EnsureSuccessStatusCode();

        var data = await resp.Content.ReadFromJsonAsync<EmbeddingsResponse>(cancellationToken: ct)
                   ?? throw new InvalidOperationException("OpenAI embeddings response was empty.");

        if (data.Usage != null)
        {
             _telemetry.TrackModelUsage(
                "embedding",
                _opt.Model,
                data.Usage.PromptTokens,
                0, // Embeddings have 0 output tokens typically
                0,
                provider: "openai"
             );
        }
        var ordered = data.Data.OrderBy(x => x.Index).Select(x => x.Embedding).ToArray();
        if (ordered.Length != inputs.Count)
            throw new InvalidOperationException($"OpenAI returned {ordered.Length} embeddings for {inputs.Count} inputs.");

        return ordered;
    }
}
