namespace Rayneforge.Forecast.Infrastructure.Factories;

using System;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;
using Rayneforge.Forecast.Infrastructure.Abstractions;
using Rayneforge.Forecast.Infrastructure.Embeddings;
using Rayneforge.Forecast.Infrastructure.Options;

public interface IEmbeddingsProviderFactory
{
    IEmbeddingsProvider CreateEmbeddingsProvider(string? providerOverride = null);
}

public class EmbeddingsProviderFactory(IServiceProvider serviceProvider, IOptions<ProviderOptions> options) : IEmbeddingsProviderFactory
{
    public IEmbeddingsProvider CreateEmbeddingsProvider(string? providerOverride = null)
    {
        var provider = (providerOverride ?? options.Value.Embedding)?.ToLowerInvariant() ?? "ollama";

        return provider switch
        {
            "ollama" => serviceProvider.GetRequiredService<OllamaEmbeddingsProvider>(),
            "azureopenai" => serviceProvider.GetRequiredService<AzureOpenAIEmbeddingsProvider>(),
            "openai" => serviceProvider.GetRequiredService<OpenAIEmbeddingsProvider>(),
            _ => throw new NotSupportedException($"Embedding provider '{provider}' is not supported.")
        };
    }
}
