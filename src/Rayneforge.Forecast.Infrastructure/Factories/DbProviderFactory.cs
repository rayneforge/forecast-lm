namespace Rayneforge.Forecast.Infrastructure.Factories;

using System;
using Microsoft.Extensions.DependencyInjection;
using Rayneforge.Forecast.Infrastructure.Options;
using Microsoft.Extensions.Options;
using Rayneforge.Forecast.Domain.Abstractions;
using Rayneforge.Forecast.Infrastructure.Abstractions;
using Rayneforge.Forecast.Infrastructure.Repositories;
using Rayneforge.Forecast.Infrastructure.Data;

public interface IDbProviderFactory
{
    ISemanticRepository<T> CreateSemanticRepository<T>() where T : class, ISemanticEntity;
}

public class DbProviderFactory : IDbProviderFactory
{
    private readonly IServiceProvider _serviceProvider;
    private readonly ProviderOptions _options;

    public DbProviderFactory(IServiceProvider serviceProvider, IOptions<ProviderOptions> options)
    {
        _serviceProvider = serviceProvider;
        _options = options.Value;
    }

    /// <summary>
    /// Creates a semantic repository for the given entity type.
    /// Currently all ISemanticEntity types (NewsArticle, Entity, ArticleClaim, Narrative)
    /// live in the News bounded context.  If future bounded contexts introduce their own
    /// ISemanticEntity types, add a typeof(T) → DbContext routing layer here.
    /// </summary>
    public ISemanticRepository<T> CreateSemanticRepository<T>() where T : class, ISemanticEntity
    {
        var provider = _options.Database?.ToLowerInvariant() ?? "sqlite";
        
        return provider switch
        {
            "sqlite" => new SqliteSemanticRepository<T>(_serviceProvider.GetRequiredService<SqliteNewsDbContext>()),
            "cosmos" => new CosmosSemanticRepository<T>(_serviceProvider.GetRequiredService<CosmosNewsDbContext>()),
            _ => throw new NotSupportedException($"Database provider '{provider}' is not supported.")
        };
    }
}
