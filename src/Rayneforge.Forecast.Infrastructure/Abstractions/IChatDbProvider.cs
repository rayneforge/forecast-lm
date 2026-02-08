namespace Rayneforge.Forecast.Infrastructure.Abstractions;

using Rayneforge.Forecast.Domain.Models;

/// <summary>
/// Structured persistence for conversation threads and messages.
/// Provider-agnostic — implementations exist for SQLite and Cosmos DB.
/// No Agent Framework types leak through this boundary.
/// </summary>
public interface IChatDbProvider
{
    Task EnsureThreadAsync(
        string threadId,
        string? userId,
        CancellationToken ct = default);

    Task<IReadOnlyList<StoredMessage>> LoadMessagesAsync(
        string threadId,
        int maxMessages,
        CancellationToken ct = default);

    Task AppendMessagesAsync(
        string threadId,
        IReadOnlyList<StoredMessage> messages,
        Microsoft.Extensions.AI.UsageDetails? usage = null,
        CancellationToken ct = default);

    Task<IEnumerable<ConversationThread>> GetThreadsAsync(
        string userId,
        CancellationToken ct = default);

    Task<ConversationThread?> GetThreadAsync(
        string threadId,
        string userId,
        CancellationToken ct = default);

    Task DeleteThreadAsync(
        string threadId,
        string userId,
        CancellationToken ct = default);
}
