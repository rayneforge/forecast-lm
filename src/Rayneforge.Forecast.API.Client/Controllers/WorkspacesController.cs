namespace Rayneforge.Forecast.API.Client.Controllers;

using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Rayneforge.Forecast.Domain.Models;
using Rayneforge.Forecast.Infrastructure.Abstractions;

[ApiController]
[Authorize]
[Route("api/[controller]")]
public class WorkspacesController(IWorkspaceRepository repository) : ControllerBase
{
    private string UserId => User.FindFirstValue(ClaimTypes.NameIdentifier)!;

    // ─── Workspace CRUD ─────────────────────────────────────────

    /// <summary>GET /api/workspaces — list all workspaces for the current user.</summary>
    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<Workspace>>> GetWorkspaces(CancellationToken ct)
    {
        var workspaces = await repository.GetWorkspacesAsync(UserId, ct);
        return Ok(workspaces);
    }

    /// <summary>GET /api/workspaces/{id} — get a single workspace with its links and threads.</summary>
    [HttpGet("{id}")]
    public async Task<ActionResult<Workspace>> GetWorkspace(string id, CancellationToken ct)
    {
        var ws = await repository.GetWorkspaceAsync(id, UserId, ct);
        return ws is not null ? Ok(ws) : NotFound();
    }

    /// <summary>POST /api/workspaces — create a new workspace.</summary>
    [HttpPost]
    public async Task<ActionResult<Workspace>> CreateWorkspace([FromBody] CreateWorkspaceRequest request, CancellationToken ct)
    {
        var workspace = new Workspace
        {
            Id = Guid.NewGuid().ToString(),
            UserId = UserId,
            Name = request.Name,
            Description = request.Description,
        };

        var created = await repository.CreateWorkspaceAsync(workspace, ct);
        return CreatedAtAction(nameof(GetWorkspace), new { id = created.Id }, created);
    }

    /// <summary>PATCH /api/workspaces/{id} — update workspace metadata (name, description, layout).</summary>
    [HttpPatch("{id}")]
    public async Task<ActionResult<Workspace>> UpdateWorkspace(string id, [FromBody] UpdateWorkspaceRequest request, CancellationToken ct)
    {
        var existing = await repository.GetWorkspaceAsync(id, UserId, ct);
        if (existing is null) return NotFound();

        var updated = existing with
        {
            Name = request.Name ?? existing.Name,
            Description = request.Description ?? existing.Description,
            LayoutJson = request.LayoutJson ?? existing.LayoutJson,
            UpdatedAt = DateTimeOffset.UtcNow,
        };

        var result = await repository.UpdateWorkspaceAsync(updated, ct);
        return Ok(result);
    }

    /// <summary>DELETE /api/workspaces/{id} — delete a workspace and cascade-delete its links.</summary>
    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteWorkspace(string id, CancellationToken ct)
    {
        await repository.DeleteWorkspaceAsync(id, UserId, ct);
        return NoContent();
    }

    // ─── Links ──────────────────────────────────────────────────

    /// <summary>GET /api/workspaces/{id}/links — get all links in a workspace.</summary>
    [HttpGet("{id}/links")]
    public async Task<ActionResult<IReadOnlyList<WorkspaceLink>>> GetLinks(string id, CancellationToken ct)
    {
        // Verify ownership
        var ws = await repository.GetWorkspaceAsync(id, UserId, ct);
        if (ws is null) return NotFound();

        var links = await repository.GetLinksAsync(id, ct);
        return Ok(links);
    }

    /// <summary>POST /api/workspaces/{id}/links — link (pin) an item to a workspace.</summary>
    [HttpPost("{id}/links")]
    public async Task<ActionResult<WorkspaceLink>> AddLink(string id, [FromBody] AddLinkRequest request, CancellationToken ct)
    {
        var ws = await repository.GetWorkspaceAsync(id, UserId, ct);
        if (ws is null) return NotFound();

        var link = new WorkspaceLink
        {
            Id = Guid.NewGuid().ToString(),
            WorkspaceId = id,
            LinkedItemId = request.LinkedItemId,
            LinkedItemType = request.LinkedItemType,
            Title = request.Title,
            Body = request.Body,
            Note = request.Note,
            Color = request.Color,
            SortOrder = request.SortOrder,
        };

        var created = await repository.AddLinkAsync(link, ct);
        return CreatedAtAction(nameof(GetLinks), new { id }, created);
    }

    /// <summary>PATCH /api/workspaces/{wsId}/links/{linkId} — update a link's note or sort order.</summary>
    [HttpPatch("{wsId}/links/{linkId}")]
    public async Task<ActionResult<WorkspaceLink>> UpdateLink(string wsId, string linkId, [FromBody] UpdateLinkRequest request, CancellationToken ct)
    {
        var ws = await repository.GetWorkspaceAsync(wsId, UserId, ct);
        if (ws is null) return NotFound();

        var existing = ws.Links.FirstOrDefault(l => l.Id == linkId);
        if (existing is null) return NotFound();

        var updated = existing with
        {
            Title = request.Title ?? existing.Title,
            Body = request.Body ?? existing.Body,
            Note = request.Note ?? existing.Note,
            Color = request.Color ?? existing.Color,
            SortOrder = request.SortOrder ?? existing.SortOrder,
        };

        var result = await repository.UpdateLinkAsync(updated, ct);
        return Ok(result);
    }

    /// <summary>DELETE /api/workspaces/{wsId}/links/{linkId} — unlink (unpin) an item.</summary>
    [HttpDelete("{wsId}/links/{linkId}")]
    public async Task<IActionResult> RemoveLink(string wsId, string linkId, CancellationToken ct)
    {
        var ws = await repository.GetWorkspaceAsync(wsId, UserId, ct);
        if (ws is null) return NotFound();

        await repository.RemoveLinkAsync(wsId, linkId, ct);
        return NoContent();
    }
}

// ─── Request DTOs ───────────────────────────────────────────────

public record CreateWorkspaceRequest
{
    public required string Name { get; init; }
    public string? Description { get; init; }
}

public record UpdateWorkspaceRequest
{
    public string? Name { get; init; }
    public string? Description { get; init; }
    public string? LayoutJson { get; init; }
}

public record AddLinkRequest
{
    /// <summary>External item ID — null for Note/Topic types.</summary>
    public string? LinkedItemId { get; init; }
    public required LinkableItemType LinkedItemType { get; init; }
    public string? Title { get; init; }
    public string? Body { get; init; }
    public string? Note { get; init; }
    public string? Color { get; init; }
    public int SortOrder { get; init; }
}

public record UpdateLinkRequest
{
    public string? Title { get; init; }
    public string? Body { get; init; }
    public string? Note { get; init; }
    public string? Color { get; init; }
    public int? SortOrder { get; init; }
}
