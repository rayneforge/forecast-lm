namespace Rayneforge.Forecast.Infrastructure.Factories;

using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;
using Rayneforge.Forecast.Infrastructure.Abstractions;
using Rayneforge.Forecast.Infrastructure.Options;
using Rayneforge.Forecast.Infrastructure.Services;

public interface IMessageBusFactory
{
    IMessageBus CreateMessageBus();
}

public class MessageBusFactory(IServiceProvider serviceProvider, IOptions<ProviderOptions> options) : IMessageBusFactory
{
    public IMessageBus CreateMessageBus()
    {
        var provider = options.Value.MessageBus?.ToLowerInvariant() ?? "azureservicebus";

        return provider switch
        {
            "azureservicebus" => ActivatorUtilities.CreateInstance<AzureServiceBusMessageBus>(serviceProvider),
            _ => throw new NotSupportedException($"Message bus provider '{provider}' is not supported.")
        };
    }
}
