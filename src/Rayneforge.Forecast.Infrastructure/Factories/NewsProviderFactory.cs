namespace Rayneforge.Forecast.Infrastructure.Factories;

using System;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;
using Rayneforge.Forecast.Infrastructure.Abstractions;
using Rayneforge.Forecast.Infrastructure.News;
using Rayneforge.Forecast.Infrastructure.Options;

public interface INewsProviderFactory
{
    INewsProvider CreateNewsProvider();
}

public class NewsProviderFactory(IServiceProvider serviceProvider, IOptions<ProviderOptions> options) : INewsProviderFactory
{
    public INewsProvider CreateNewsProvider()
    {
        var provider = options.Value.News?.ToLowerInvariant() ?? "newsapi";

        return provider switch
        {
            "newsapi" => serviceProvider.GetRequiredService<NewsApiHttpProvider>(),
            "mock" => ActivatorUtilities.CreateInstance<MockNewsProvider>(serviceProvider),
            _ => throw new NotSupportedException($"News provider '{provider}' is not supported.")
        };
    }
}
