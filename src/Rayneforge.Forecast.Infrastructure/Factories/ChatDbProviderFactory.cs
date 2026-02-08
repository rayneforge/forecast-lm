namespace Rayneforge.Forecast.Infrastructure.Factories;

using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;
using Rayneforge.Forecast.Infrastructure.Abstractions;
using Rayneforge.Forecast.Infrastructure.Conversation;
using Rayneforge.Forecast.Infrastructure.Options;

public interface IChatDbProviderFactory
{
    IChatDbProvider CreateChatDbProvider();
}

public class ChatDbProviderFactory : IChatDbProviderFactory
{
    private readonly IServiceProvider _serviceProvider;
    private readonly ProviderOptions _options;

    public ChatDbProviderFactory(IServiceProvider serviceProvider, IOptions<ProviderOptions> options)
    {
        _serviceProvider = serviceProvider;
        _options = options.Value;
    }

    public IChatDbProvider CreateChatDbProvider()
    {
        var provider = _options.Database?.ToLowerInvariant() ?? "sqlite";

        return provider switch
        {
            "sqlite" => ActivatorUtilities.CreateInstance<SqliteChatDbProvider>(_serviceProvider),
            "cosmos" => ActivatorUtilities.CreateInstance<CosmosChatDbProvider>(_serviceProvider),
            _ => throw new NotSupportedException($"Database provider '{provider}' is not supported for chat.")
        };
    }
}
