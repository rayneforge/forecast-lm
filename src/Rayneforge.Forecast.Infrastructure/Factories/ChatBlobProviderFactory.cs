namespace Rayneforge.Forecast.Infrastructure.Factories;

using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;
using Rayneforge.Forecast.Infrastructure.Abstractions;
using Rayneforge.Forecast.Infrastructure.Conversation;
using Rayneforge.Forecast.Infrastructure.Options;

public interface IChatBlobProviderFactory
{
    IChatBlobProvider CreateChatBlobProvider();
}

public class ChatBlobProviderFactory : IChatBlobProviderFactory
{
    private readonly IServiceProvider _serviceProvider;

    public ChatBlobProviderFactory(IServiceProvider serviceProvider)
    {
        _serviceProvider = serviceProvider;
    }

    /// <summary>
    /// Returns an <see cref="IChatBlobProvider"/>. Currently always Azure Blob Storage
    /// (Azurite locally, real Azure Storage in cloud — same SDK, same code).
    /// Factory exists so we can add alternatives later without touching consumers.
    /// </summary>
    public IChatBlobProvider CreateChatBlobProvider()
    {
        return ActivatorUtilities.CreateInstance<AzureBlobChatBlobProvider>(_serviceProvider);
    }
}
