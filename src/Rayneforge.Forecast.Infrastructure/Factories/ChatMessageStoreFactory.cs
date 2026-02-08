namespace Rayneforge.Forecast.Infrastructure.Factories;

using Rayneforge.Forecast.Infrastructure.Abstractions;
using Rayneforge.Forecast.Infrastructure.Conversation;
using Rayneforge.Forecast.Infrastructure.Factories;

public class ChatMessageStoreFactory(
    IChatDbProviderFactory dbFactory,
    IChatBlobProviderFactory blobFactory) : IChatMessageStoreFactory
{
    public HybridChatMessageStore Create(string threadId, string? userId)
    {
        var db = dbFactory.CreateChatDbProvider();
        var blob = blobFactory.CreateChatBlobProvider();
        return new HybridChatMessageStore(db, blob, threadId, userId);
    }
}
