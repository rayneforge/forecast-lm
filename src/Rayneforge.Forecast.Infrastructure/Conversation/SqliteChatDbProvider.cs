namespace Rayneforge.Forecast.Infrastructure.Conversation;

using Microsoft.EntityFrameworkCore;
using Rayneforge.Forecast.Domain.Models;
using Rayneforge.Forecast.Infrastructure.Abstractions;
using Rayneforge.Forecast.Infrastructure.Data;

/// <summary>
/// SQLite implementation of <see cref="IChatDbProvider"/>.
/// Backed by <see cref="SqliteUserDbContext"/>.
/// </summary>
public sealed class SqliteChatDbProvider : IChatDbProvider
{
    private readonly SqliteUserDbContext _db;

    public SqliteChatDbProvider(SqliteUserDbContext db)
    {
        _db = db;
    }

    public async Task EnsureThreadAsync(string threadId, string? userId, CancellationToken ct = default)
    {
        var exists = await _db.Threads.AnyAsync(t => t.Id == threadId, ct);
        if (!exists)
        {
            _db.Threads.Add(new ConversationThread
            {
                Id = threadId,
                UserId = userId ?? "anonymous",
                CreatedAt = DateTimeOffset.UtcNow
            });
            await _db.SaveChangesAsync(ct);
        }
    }

    public async Task<IReadOnlyList<StoredMessage>> LoadMessagesAsync(
        string threadId, int maxMessages, CancellationToken ct = default)
    {
        return await _db.Messages
            .Where(m => m.ThreadId == threadId)
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

        // Touch the thread's last-message timestamp & update usage
        var thread = await _db.Threads.FindAsync([threadId], ct);
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
        }

        await _db.SaveChangesAsync(ct);
    }

    public async Task<IEnumerable<ConversationThread>> GetThreadsAsync(string userId, CancellationToken ct = default)
    {
        return await _db.Threads
            .Where(t => t.UserId == userId)
            .OrderByDescending(t => t.LastMessageAt)
            .ToListAsync(ct);
    }

    public async Task<ConversationThread?> GetThreadAsync(string threadId, string userId, CancellationToken ct = default)
    {
        var thread = await _db.Threads.FindAsync([threadId], ct);
        if (thread != null && thread.UserId == userId)
        {
            return thread;
        }
        return null;
    }

    public async Task DeleteThreadAsync(string threadId, string userId, CancellationToken ct = default)
    {
        var thread = await _db.Threads.FindAsync([threadId], ct);
        if (thread != null && thread.UserId == userId)
        {
            var messages = _db.Messages.Where(m => m.ThreadId == threadId);
            _db.Messages.RemoveRange(messages);
            _db.Threads.Remove(thread);
            await _db.SaveChangesAsync(ct);
        }
    }
}
