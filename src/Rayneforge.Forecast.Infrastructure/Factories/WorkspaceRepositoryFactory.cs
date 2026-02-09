namespace Rayneforge.Forecast.Infrastructure.Factories;

using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;
using Rayneforge.Forecast.Infrastructure.Abstractions;
using Rayneforge.Forecast.Infrastructure.Options;
using Rayneforge.Forecast.Infrastructure.Repositories;

public interface IWorkspaceRepositoryFactory
{
    IWorkspaceRepository CreateWorkspaceRepository();
}

public class WorkspaceRepositoryFactory : IWorkspaceRepositoryFactory
{
    private readonly IServiceProvider _serviceProvider;
    private readonly ProviderOptions _options;

    public WorkspaceRepositoryFactory(IServiceProvider serviceProvider, IOptions<ProviderOptions> options)
    {
        _serviceProvider = serviceProvider;
        _options = options.Value;
    }

    public IWorkspaceRepository CreateWorkspaceRepository()
    {
        var provider = _options.Database?.ToLowerInvariant() ?? "sqlite";

        return provider switch
        {
            "sqlite" => ActivatorUtilities.CreateInstance<SqliteWorkspaceRepository>(_serviceProvider),
            "cosmos" => ActivatorUtilities.CreateInstance<CosmosWorkspaceRepository>(_serviceProvider),
            _ => throw new NotSupportedException($"Database provider '{provider}' is not supported for workspaces.")
        };
    }
}
