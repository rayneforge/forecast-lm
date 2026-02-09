namespace Rayneforge.Forecast.Domain.Models;

using System;
using System.Collections.Generic;

// ─── Enums ──────────────────────────────────────────────────────

/// <summary>
/// Discriminator for the type of item linked to a workspace.
/// Maps 1-to-1 with canvas node types.
/// </summary>
public enum LinkableItemType
{
    Article,
    Entity,
    Claim,
    Narrative,
    /// <summary>A freeform note — LinkedItemId is empty, content lives in Title/Body.</summary>
    Note,
    /// <summary>A topic bubble — LinkedItemId is empty, label lives in Title.</summary>
    Topic
}

// ─── Models ─────────────────────────────────────────────────────

/// <summary>
/// A user-curated research board that aggregates pinned items
/// and conversation threads around a topic.
/// </summary>
public sealed record Workspace
{
    public required string Id { get; init; }
    public required string UserId { get; init; }
    public required string Name { get; init; }
    public string? Description { get; init; }

    public DateTimeOffset CreatedAt { get; init; } = DateTimeOffset.UtcNow;
    public DateTimeOffset? UpdatedAt { get; init; }

    /// <summary>
    /// JSON-serialized layout descriptor that references WorkspaceLink IDs
    /// to control how linked items are arranged in the UI.
    /// </summary>
    public string? LayoutJson { get; init; }

    /// <summary>Navigation property — linked items.</summary>
    public ICollection<WorkspaceLink> Links { get; init; } = [];

    /// <summary>Navigation property — threads scoped to this workspace.</summary>
    public ICollection<ConversationThread> Threads { get; init; } = [];
}

/// <summary>
/// A single item explicitly linked (pinned) to a workspace by the user.
/// Generic by <see cref="LinkedItemType"/> — points to an Article, Entity, Claim,
/// Narrative, or is a self-contained Note/Topic with no external reference.
/// </summary>
public sealed record WorkspaceLink
{
    public required string Id { get; init; }
    public required string WorkspaceId { get; init; }

    /// <summary>
    /// The ID of the linked domain object (ArticleId, EntityId, etc.).
    /// Empty/null for Note and Topic types (self-contained).
    /// </summary>
    public string? LinkedItemId { get; init; }

    /// <summary>Discriminator for the type of linked item.</summary>
    public required LinkableItemType LinkedItemType { get; init; }

    /// <summary>Display title — required for Note/Topic, optional for referenced items.</summary>
    public string? Title { get; init; }

    /// <summary>Body text — primarily used for Note type.</summary>
    public string? Body { get; init; }

    /// <summary>Optional user note attached to this pin.</summary>
    public string? Note { get; init; }

    /// <summary>Optional color tag (hex or named).</summary>
    public string? Color { get; init; }

    public DateTimeOffset LinkedAt { get; init; } = DateTimeOffset.UtcNow;

    /// <summary>User-controlled sort order within the workspace.</summary>
    public int SortOrder { get; init; }
}
