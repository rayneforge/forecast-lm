namespace Rayneforge.Forecast.Infrastructure.Conversation;

using Microsoft.EntityFrameworkCore;
using Rayneforge.Forecast.Domain.Models;
using Rayneforge.Forecast.Infrastructure.Abstractions;
using Rayneforge.Forecast.Infrastructure.Data;

/// <summary>
/// Cosmos DB implementation of <see cref="IChatDbProvider"/>.
/// Backed by <see cref="CosmosConversationDbContext"/>.
/// </summary>
public sealed class CosmosChatDbProvider : IChatDbProvider
{
    private readonly CosmosConversationDbContext _db;

    public CosmosChatDbProvider(CosmosConversationDbContext db)
    {
        _db = db;
    }

    public async Task EnsureThreadAsync(string threadId, string? userId, CancellationToken ct = default)
    {
        var resolvedUser = userId ?? "anonymous";

        var exists = await _db.Threads
            .WithPartitionKey(resolvedUser)
            .AnyAsync(t => t.Id == threadId, ct);

        if (!exists)
        {
            _db.Threads.Add(new ConversationThread
            {
                Id = threadId,
                UserId = resolvedUser,
                CreatedAt = DateTimeOffset.UtcNow
            });
            await _db.SaveChangesAsync(ct);
        }
    }

    public async Task<IReadOnlyList<StoredMessage>> LoadMessagesAsync(
        string threadId, int maxMessages, CancellationToken ct = default)
    {
        return await _db.Messages
            .WithPartitionKey(threadId)
            .OrderBy(m => m.CreatedAt)
            .Take(maxMessages)
            .ToListAsync(ct);
    }

    public async Task AppendMessagesAsync(
        string threadId, 
        IReadOnlyList<StoredMessage> messages,
        Microsoft.Extensions.AI.UsageDetails? usage = null,
        CancellationToken ct = default)
    {
        _db.Messages.AddRange(messages);
        await _db.SaveChangesAsync(ct);

        // Touch the thread — requires knowing the userId partition key,
        // which is embedded in the thread record itself.
        var thread = await _db.Threads
            .FirstOrDefaultAsync(t => t.Id == threadId, ct);

        if (thread is not null)
        {
            var updated = thread with 
            { 
                LastMessageAt = DateTimeOffset.UtcNow,
                InputTokens = thread.InputTokens + (int)(usage?.InputTokenCount ?? 0),
                OutputTokens = thread.OutputTokens + (int)(usage?.OutputTokenCount ?? 0),
                TotalTokens = thread.TotalTokens + (int)(usage?.TotalTokenCount ?? 0)
            };
            _db.Entry(thread).CurrentValues.SetValues(updated);
            await _db.SaveChangesAsync(ct);
        }
    }

    public async Task<IEnumerable<ConversationThread>> GetThreadsAsync(string userId, CancellationToken ct = default)
    {
        // Thread Container Partition Key is UserId
        return await _db.Threads
            .WithPartitionKey(userId)
            .OrderByDescending(t => t.LastMessageAt)
            .ToListAsync(ct);
    }

    public async Task<ConversationThread?> GetThreadAsync(string threadId, string userId, CancellationToken ct = default)
    {
         return await _db.Threads
            .WithPartitionKey(userId)
            .FirstOrDefaultAsync(t => t.Id == threadId, ct);
    }

    public async Task DeleteThreadAsync(string threadId, string userId, CancellationToken ct = default)
    {
        // Thread Container Partition Key is UserId
        var thread = await _db.Threads
            .WithPartitionKey(userId)
            .FirstOrDefaultAsync(t => t.Id == threadId, ct);

        if (thread != null)
        {
            // Message Container Partition Key is ThreadId
            // We must delete messages first or concurrently
            var messages = await _db.Messages
                .WithPartitionKey(threadId)
                .ToListAsync(ct);
            
            _db.Messages.RemoveRange(messages);
            _db.Threads.Remove(thread);

            await _db.SaveChangesAsync(ct);
        }
    }
}
