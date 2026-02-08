namespace Rayneforge.Forecast.Infrastructure.Factories;

using Rayneforge.Forecast.Infrastructure.Conversation;

public interface IChatMessageStoreFactory
{
    HybridChatMessageStore Create(string threadId, string? userId);
}
