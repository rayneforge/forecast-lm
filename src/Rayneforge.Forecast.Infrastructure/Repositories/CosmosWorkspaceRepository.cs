namespace Rayneforge.Forecast.Infrastructure.Repositories;

using Microsoft.EntityFrameworkCore;
using Rayneforge.Forecast.Domain.Models;
using Rayneforge.Forecast.Infrastructure.Abstractions;
using Rayneforge.Forecast.Infrastructure.Data;

/// <summary>
/// Cosmos DB implementation of <see cref="IWorkspaceRepository"/>.
/// </summary>
public sealed class CosmosWorkspaceRepository : IWorkspaceRepository
{
    private readonly CosmosUserDbContext _db;

    public CosmosWorkspaceRepository(CosmosUserDbContext db)
    {
        _db = db;
    }

    // ─── Workspaces ─────────────────────────────────────────────

    public async Task<Workspace?> GetWorkspaceAsync(string workspaceId, string userId, CancellationToken ct = default)
    {
        // Partition key is userId — use WithPartitionKey for efficient point read
        var ws = await _db.Workspaces
            .WithPartitionKey(userId)
            .FirstOrDefaultAsync(w => w.Id == workspaceId, ct);

        if (ws is null) return null;

        // Load links from the workspace-links container (partitioned by workspaceId)
        var links = await _db.WorkspaceLinks
            .WithPartitionKey(workspaceId)
            .OrderBy(l => l.SortOrder)
            .ToListAsync(ct);

        // Load threads scoped to this workspace
        var threads = await _db.Threads
            .WithPartitionKey(userId)
            .Where(t => t.WorkspaceId == workspaceId)
            .OrderByDescending(t => t.LastMessageAt)
            .ToListAsync(ct);

        return ws with
        {
            Links = links,
            Threads = threads
        };
    }

    public async Task<IReadOnlyList<Workspace>> GetWorkspacesAsync(string userId, CancellationToken ct = default)
    {
        return await _db.Workspaces
            .WithPartitionKey(userId)
            .OrderByDescending(w => w.UpdatedAt ?? w.CreatedAt)
            .ToListAsync(ct);
    }

    public async Task<Workspace> CreateWorkspaceAsync(Workspace workspace, CancellationToken ct = default)
    {
        _db.Workspaces.Add(workspace);
        await _db.SaveChangesAsync(ct);
        return workspace;
    }

    public async Task<Workspace> UpdateWorkspaceAsync(Workspace workspace, CancellationToken ct = default)
    {
        var existing = await _db.Workspaces
            .WithPartitionKey(workspace.UserId)
            .FirstOrDefaultAsync(w => w.Id == workspace.Id, ct)
            ?? throw new InvalidOperationException($"Workspace '{workspace.Id}' not found.");

        _db.Entry(existing).CurrentValues.SetValues(workspace);
        await _db.SaveChangesAsync(ct);
        return workspace;
    }

    public async Task DeleteWorkspaceAsync(string workspaceId, string userId, CancellationToken ct = default)
    {
        var ws = await _db.Workspaces
            .WithPartitionKey(userId)
            .FirstOrDefaultAsync(w => w.Id == workspaceId, ct);

        if (ws is null) return;

        // Delete all links in the workspace-links container
        var links = await _db.WorkspaceLinks
            .WithPartitionKey(workspaceId)
            .ToListAsync(ct);
        _db.WorkspaceLinks.RemoveRange(links);

        // Unlink threads (set WorkspaceId to null)
        var threads = await _db.Threads
            .WithPartitionKey(userId)
            .Where(t => t.WorkspaceId == workspaceId)
            .ToListAsync(ct);

        foreach (var thread in threads)
        {
            var updated = thread with { WorkspaceId = null };
            _db.Entry(thread).CurrentValues.SetValues(updated);
        }

        _db.Workspaces.Remove(ws);
        await _db.SaveChangesAsync(ct);
    }

    // ─── Links ──────────────────────────────────────────────────

    public async Task<IReadOnlyList<WorkspaceLink>> GetLinksAsync(string workspaceId, CancellationToken ct = default)
    {
        return await _db.WorkspaceLinks
            .WithPartitionKey(workspaceId)
            .OrderBy(l => l.SortOrder)
            .ToListAsync(ct);
    }

    public async Task<WorkspaceLink> AddLinkAsync(WorkspaceLink link, CancellationToken ct = default)
    {
        _db.WorkspaceLinks.Add(link);
        await _db.SaveChangesAsync(ct);
        return link;
    }

    public async Task RemoveLinkAsync(string workspaceId, string linkId, CancellationToken ct = default)
    {
        var link = await _db.WorkspaceLinks
            .WithPartitionKey(workspaceId)
            .FirstOrDefaultAsync(l => l.Id == linkId, ct);

        if (link is not null)
        {
            _db.WorkspaceLinks.Remove(link);
            await _db.SaveChangesAsync(ct);
        }
    }

    public async Task<WorkspaceLink> UpdateLinkAsync(WorkspaceLink link, CancellationToken ct = default)
    {
        var existing = await _db.WorkspaceLinks
            .WithPartitionKey(link.WorkspaceId)
            .FirstOrDefaultAsync(l => l.Id == link.Id, ct)
            ?? throw new InvalidOperationException($"WorkspaceLink '{link.Id}' not found.");

        _db.Entry(existing).CurrentValues.SetValues(link);
        await _db.SaveChangesAsync(ct);
        return link;
    }
}
