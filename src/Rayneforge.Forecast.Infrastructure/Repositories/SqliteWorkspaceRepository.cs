namespace Rayneforge.Forecast.Infrastructure.Repositories;

using Microsoft.EntityFrameworkCore;
using Rayneforge.Forecast.Domain.Models;
using Rayneforge.Forecast.Infrastructure.Abstractions;
using Rayneforge.Forecast.Infrastructure.Data;

/// <summary>
/// SQLite implementation of <see cref="IWorkspaceRepository"/>.
/// </summary>
public sealed class SqliteWorkspaceRepository : IWorkspaceRepository
{
    private readonly SqliteUserDbContext _db;

    public SqliteWorkspaceRepository(SqliteUserDbContext db)
    {
        _db = db;
    }

    // ─── Workspaces ─────────────────────────────────────────────

    public async Task<Workspace?> GetWorkspaceAsync(string workspaceId, string userId, CancellationToken ct = default)
    {
        var ws = await _db.Workspaces
            .Include(w => w.Links.OrderBy(l => l.SortOrder))
            .Include(w => w.Threads.OrderByDescending(t => t.LastMessageAt))
            .FirstOrDefaultAsync(w => w.Id == workspaceId, ct);

        return ws is not null && ws.UserId == userId ? ws : null;
    }

    public async Task<IReadOnlyList<Workspace>> GetWorkspacesAsync(string userId, CancellationToken ct = default)
    {
        return await _db.Workspaces
            .Where(w => w.UserId == userId)
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
        var existing = await _db.Workspaces.FindAsync([workspace.Id], ct)
            ?? throw new InvalidOperationException($"Workspace '{workspace.Id}' not found.");

        _db.Entry(existing).CurrentValues.SetValues(workspace);
        await _db.SaveChangesAsync(ct);
        return workspace;
    }

    public async Task DeleteWorkspaceAsync(string workspaceId, string userId, CancellationToken ct = default)
    {
        var ws = await _db.Workspaces.FindAsync([workspaceId], ct);
        if (ws is not null && ws.UserId == userId)
        {
            _db.Workspaces.Remove(ws); // Cascade deletes links
            await _db.SaveChangesAsync(ct);
        }
    }

    // ─── Links ──────────────────────────────────────────────────

    public async Task<IReadOnlyList<WorkspaceLink>> GetLinksAsync(string workspaceId, CancellationToken ct = default)
    {
        return await _db.WorkspaceLinks
            .Where(l => l.WorkspaceId == workspaceId)
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
        var link = await _db.WorkspaceLinks.FindAsync([linkId], ct);
        if (link is not null && link.WorkspaceId == workspaceId)
        {
            _db.WorkspaceLinks.Remove(link);
            await _db.SaveChangesAsync(ct);
        }
    }

    public async Task<WorkspaceLink> UpdateLinkAsync(WorkspaceLink link, CancellationToken ct = default)
    {
        var existing = await _db.WorkspaceLinks.FindAsync([link.Id], ct)
            ?? throw new InvalidOperationException($"WorkspaceLink '{link.Id}' not found.");

        _db.Entry(existing).CurrentValues.SetValues(link);
        await _db.SaveChangesAsync(ct);
        return link;
    }
}
