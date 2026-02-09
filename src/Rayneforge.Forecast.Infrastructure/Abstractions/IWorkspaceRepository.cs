namespace Rayneforge.Forecast.Infrastructure.Abstractions;

using Rayneforge.Forecast.Domain.Models;

/// <summary>
/// Repository for workspace CRUD and link management.
/// </summary>
public interface IWorkspaceRepository
{
    // ─── Workspaces ─────────────────────────────────────────────

    Task<Workspace?> GetWorkspaceAsync(string workspaceId, string userId, CancellationToken ct = default);
    Task<IReadOnlyList<Workspace>> GetWorkspacesAsync(string userId, CancellationToken ct = default);
    Task<Workspace> CreateWorkspaceAsync(Workspace workspace, CancellationToken ct = default);
    Task<Workspace> UpdateWorkspaceAsync(Workspace workspace, CancellationToken ct = default);
    Task DeleteWorkspaceAsync(string workspaceId, string userId, CancellationToken ct = default);

    // ─── Links ──────────────────────────────────────────────────

    Task<IReadOnlyList<WorkspaceLink>> GetLinksAsync(string workspaceId, CancellationToken ct = default);
    Task<WorkspaceLink> AddLinkAsync(WorkspaceLink link, CancellationToken ct = default);
    Task RemoveLinkAsync(string workspaceId, string linkId, CancellationToken ct = default);
    Task<WorkspaceLink> UpdateLinkAsync(WorkspaceLink link, CancellationToken ct = default);
}
