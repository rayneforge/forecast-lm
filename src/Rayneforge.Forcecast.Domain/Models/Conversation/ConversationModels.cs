namespace Rayneforge.Forecast.Domain.Models;

/// <summary>
/// Reference to a blob stored via <see cref="Infrastructure.Abstractions.IChatBlobProvider"/>.
/// Provider-agnostic — works for Azurite, Azure Storage, or any future backend.
/// </summary>
public sealed record BlobRef(
    string Provider,
    string Uri,
    string? ETag = null,
    string? Checksum = null);

/// <summary>
/// A single content part within a <see cref="StoredMessage"/>, serialised as a kind + JSON pair.
/// Maps 1-to-1 with <c>AIContent</c> subtypes at the store boundary.
/// </summary>
public sealed record StoredContentPart
{
    public required string Kind { get; init; }
    public required string Json { get; init; }
}

/// <summary>
/// Persistence shape for a chat message. Isomorphic to <c>ChatMessage</c> but decoupled
/// from Agent Framework types so infrastructure providers stay framework-free.
/// </summary>
public sealed record StoredMessage
{
    public required string MessageId { get; init; }
    public required string ThreadId { get; init; }
    public required string ActorRole { get; init; }   // user | assistant | system | tool
    public required string ActorId { get; init; }
    public required DateTimeOffset CreatedAt { get; init; }
    public required IReadOnlyList<StoredContentPart> ContentParts { get; init; }
}

/// <summary>
/// Represents a conversation thread. Partitioned by <see cref="UserId"/> in Cosmos,
/// stored as a row in SQLite.
/// </summary>
public sealed record ConversationThread
{
    public required string Id { get; init; }
    public required string UserId { get; init; }
    public DateTimeOffset CreatedAt { get; init; } = DateTimeOffset.UtcNow;
    public DateTimeOffset? LastMessageAt { get; init; }
    
    // Usage Tracking
    public int InputTokens { get; init; }
    public int OutputTokens { get; init; }
    public int TotalTokens { get; init; }
}
