using System.Net.Http.Headers;
using System.Net.Http.Json;
using Azure.Core;
using Microsoft.ApplicationInsights;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Rayneforge.Forecast.Infrastructure.Abstractions;
using Rayneforge.Forecast.Infrastructure.Embeddings.Dtos;
using Rayneforge.Forecast.Infrastructure.Extensions;
using Rayneforge.Forecast.Infrastructure.Options;

namespace Rayneforge.Forecast.Infrastructure.Embeddings;

public sealed class AzureOpenAIEmbeddingsProvider : IEmbeddingsProvider
{
    private readonly HttpClient _http;
    private readonly AzureOpenAIEmbeddingsOptions _opt;
    private readonly TokenCredential? _credential;
    private readonly ILogger<AzureOpenAIEmbeddingsProvider> _logger;
    private readonly TelemetryClient _telemetry;

    public string ProviderName => "azureopenai";

    public AzureOpenAIEmbeddingsProvider(
        HttpClient http,
        IOptions<EmbeddingsOptions> opt,
        ILogger<AzureOpenAIEmbeddingsProvider> logger,
        TelemetryClient telemetry,
        TokenCredential? credential = null)
    {
        _http = http;
        _opt = opt.Value.AzureOpenAI;
        _credential = credential;
        _logger = logger;
        _telemetry = telemetry;

        // Validation is done via options validation too; these are “belt & suspenders”
        if (string.IsNullOrWhiteSpace(_opt.ApiKey) && !_opt.UseManagedIdentity)
             _logger.LogError("AzureOpenAI requires ApiKey or UseManagedIdentity=true.");
             
        if (_opt.UseManagedIdentity && _credential is null)
             _logger.LogError("AzureOpenAI: UseManagedIdentity=true but no TokenCredential was provided.");
    }

    public async Task<IReadOnlyList<float[]>> EmbedAsync(IReadOnlyList<string> inputs, CancellationToken ct = default)
    {
        if (inputs.Count == 0) return Array.Empty<float[]>();

        var apiVersion = _opt.ApiVersion ?? "2024-10-21";
        var path = $"/openai/deployments/{Uri.EscapeDataString(_opt.Deployment)}/embeddings?api-version={Uri.EscapeDataString(apiVersion)}";

        using var req = new HttpRequestMessage(HttpMethod.Post, path)
        {
            Content = JsonContent.Create(new
            {
                input = inputs
            })
        };

        if (!string.IsNullOrWhiteSpace(_opt.ApiKey))
        {
            req.Headers.Add("api-key", _opt.ApiKey);
        }
        else if (_credential != null)
        {
            // Token auth scope for Azure Cognitive Services:
            // https://cognitiveservices.azure.com/.default
            var token = await _credential.GetTokenAsync(
                new TokenRequestContext(new[] { "https://cognitiveservices.azure.com/.default" }),
                ct);

            req.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token.Token);
        }

        _logger.LogDebug("Generating embeddings for {Count} inputs using deployment {Deployment}", inputs.Count, _opt.Deployment);

        using var resp = await _http.SendAsync(req, ct);
        resp.EnsureSuccessStatusCode();

        var data = await resp.Content.ReadFromJsonAsync<EmbeddingsResponse>(cancellationToken: ct)
                   ?? throw new InvalidOperationException("Azure OpenAI embeddings response was empty.");

        if (data.Usage != null)
        {
            _telemetry.TrackModelUsage(
                "embedding",
                _opt.Deployment,
                data.Usage.PromptTokens,
                0, // Embeddings usually don't have completion tokens
                0, // Cost calculation skipped for now
                provider: "azureopenai"
            );
        }

        var ordered = data.Data.OrderBy(x => x.Index).Select(x => x.Embedding).ToArray();
        if (ordered.Length != inputs.Count)
            throw new InvalidOperationException($"Azure OpenAI returned {ordered.Length} embeddings for {inputs.Count} inputs.");

        return ordered;
    }
}
