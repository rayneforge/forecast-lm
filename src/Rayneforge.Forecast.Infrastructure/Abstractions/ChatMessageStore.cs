namespace Rayneforge.Forecast.Infrastructure.Abstractions;

using Microsoft.Extensions.AI;

// ---------------------------------------------------------------
// Context records for the message-store pipeline
// ---------------------------------------------------------------

/// <summary>
/// Context passed to <see cref="ChatMessageStore.InvokingAsync"/> before
/// the chat client is called.
/// </summary>
/// <param name="ThreadId">Conversation thread identifier.</param>
/// <param name="UserId">Optional user that owns the thread.</param>
/// <param name="MaxMessages">Maximum number of historic messages to load.</param>
public record InvokingContext(
    string ThreadId,
    string? UserId,
    int MaxMessages = 200);

/// <summary>
/// Context passed to <see cref="ChatMessageStore.InvokedAsync"/> after
/// the chat client has responded.
/// </summary>
/// <param name="ThreadId">Conversation thread identifier.</param>
/// <param name="RequestMessages">Messages that were sent to the model.</param>
/// <param name="ResponseMessages">Messages received from the model.</param>
/// <param name="Usage">Token usage details associated with this interaction.</param>
public record InvokedContext(
    string ThreadId,
    IEnumerable<ChatMessage> RequestMessages,
    IEnumerable<ChatMessage> ResponseMessages,
    UsageDetails? Usage = null);

// ---------------------------------------------------------------
// Abstract base class
// ---------------------------------------------------------------

/// <summary>
/// Abstract base for persisting chat messages around an LLM invocation pipeline.
/// <para>
/// Override <see cref="InvokingAsync"/> to load conversation history before
/// the LLM call.
/// </para>
/// <para>
/// Override <see cref="InvokedAsync"/> to persist messages after the LLM call
/// completes.
/// </para>
/// </summary>
public abstract class ChatMessageStore
{
    /// <summary>
    /// Called before the chat client is invoked.
    /// Returns the conversation messages that should be sent to the LLM.
    /// </summary>
    public virtual ValueTask<IEnumerable<ChatMessage>> InvokingAsync(
        InvokingContext context,
        CancellationToken cancellationToken = default)
        => new(Enumerable.Empty<ChatMessage>());

    /// <summary>
    /// Called after the chat client has responded.
    /// Persists request and response messages.
    /// </summary>
    public virtual ValueTask InvokedAsync(
        InvokedContext context,
        CancellationToken cancellationToken = default)
        => ValueTask.CompletedTask;
}
