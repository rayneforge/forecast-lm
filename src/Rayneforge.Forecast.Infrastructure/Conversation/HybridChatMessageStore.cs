namespace Rayneforge.Forecast.Infrastructure.Conversation;

using System.Text.Json;
using Microsoft.Extensions.AI;
using Rayneforge.Forecast.Domain.Models;
using Rayneforge.Forecast.Infrastructure.Abstractions;

/// <summary>
/// Hybrid chat message store that delegates structured persistence to
/// <see cref="IChatDbProvider"/> and binary payloads to <see cref="IChatBlobProvider"/>.
/// 
/// This is the only class in the conversation stack that knows about
/// <c>Microsoft.Extensions.AI</c> types (<see cref="ChatMessage"/>, <see cref="AIContent"/>).
/// Infrastructure providers remain framework-free.
///
/// Extends <see cref="ChatMessageStore"/> so it can be plugged into
/// the chat-agent invocation pipeline via <see cref="InvokingAsync"/>
/// (load history) and <see cref="InvokedAsync"/> (persist messages).
/// </summary>
public class HybridChatMessageStore : ChatMessageStore
{
    private readonly IChatDbProvider _db;
    private readonly IChatBlobProvider _blob;
    private readonly JsonSerializerOptions _json;
    private readonly string _threadId;
    private readonly string? _userId;

    public HybridChatMessageStore(
        IChatDbProvider db,
        IChatBlobProvider blob,
        string threadId,
        string? userId,
        JsonSerializerOptions? json = null)
    {
        _db = db;
        _blob = blob;
        _threadId = threadId;
        _userId = userId;
        _json = json ?? new JsonSerializerOptions(JsonSerializerDefaults.Web);
    }

    // ---------------------------------------------------------------
    // ChatMessageStore overrides
    // ---------------------------------------------------------------

    /// <summary>
    /// Called before the chat client is invoked.
    /// Loads persisted messages for the thread and rehydrates them into
    /// <see cref="ChatMessage"/> instances.
    /// </summary>
    public override async ValueTask<IEnumerable<ChatMessage>> InvokingAsync(
        InvokingContext context,
        CancellationToken cancellationToken = default)
    {
        await _db.EnsureThreadAsync(
            context.ThreadId,
            context.UserId ?? _userId,
            cancellationToken);

        var stored = await _db.LoadMessagesAsync(
            context.ThreadId,
            context.MaxMessages,
            cancellationToken);

        var result = new List<ChatMessage>(stored.Count);
        foreach (var msg in stored)
            result.Add(Rehydrate(msg));

        return result;
    }

    /// <summary>
    /// Called after the chat client has responded.
    /// Dehydrates request and response messages and appends them to the thread.
    /// Binary content is offloaded to blob storage.
    /// </summary>
    public override async ValueTask InvokedAsync(
        InvokedContext context,
        CancellationToken cancellationToken = default)
    {
        var allMessages = context.RequestMessages
            .Concat(context.ResponseMessages);

        var stored = new List<StoredMessage>();
        foreach (var msg in allMessages)
            stored.Add(await DehydrateAsync(msg, cancellationToken));

        if (stored.Count > 0)
            await _db.AppendMessagesAsync(context.ThreadId, stored, context.Usage, cancellationToken);
    }

    // ---------------------------------------------------------------
    // Translation: ChatMessage ↔ StoredMessage
    // ---------------------------------------------------------------

    private async Task<StoredMessage> DehydrateAsync(ChatMessage msg, CancellationToken ct)
    {
        var parts = new List<StoredContentPart>();

        foreach (var c in msg.Contents ?? [])
        {
            switch (c)
            {
                case TextContent t:
                    parts.Add(JsonPart("text", new { t.Text }));
                    break;

                case UriContent u:
                    parts.Add(JsonPart("uri", new { uri = u.Uri?.ToString(), u.MediaType }));
                    break;

                case DataContent d:
                {
                    var path = $"threads/{_threadId}/{Guid.NewGuid():N}";
                    using var stream = new MemoryStream(d.Data is { Length: > 0 } mem ? mem.ToArray() : []);
                    var blobRef = await _blob.PutAsync(
                        path,
                        d.MediaType ?? "application/octet-stream",
                        stream,
                        ct);

                    parts.Add(JsonPart("binary_ref", new { blob = blobRef, d.MediaType }));
                    break;
                }

                case FunctionCallContent fc:
                    parts.Add(JsonPart("tool_call",
                        new { fc.Name, fc.Arguments, fc.CallId }));
                    break;

                case FunctionResultContent fr:
                    parts.Add(JsonPart("tool_result",
                        new { fr.CallId, fr.Result }));
                    break;
            }
        }

        return new StoredMessage
        {
            MessageId = Guid.NewGuid().ToString("N"),
            ThreadId = _threadId,
            ActorRole = msg.Role.ToString().ToLowerInvariant(),
            ActorId = msg.AuthorName ?? msg.Role.ToString(),
            CreatedAt = DateTimeOffset.UtcNow,
            ContentParts = parts
        };
    }

    private ChatMessage Rehydrate(StoredMessage stored)
    {
        var role = stored.ActorRole switch
        {
            "user" => ChatRole.User,
            "assistant" => ChatRole.Assistant,
            "system" => ChatRole.System,
            "tool" => ChatRole.Tool,
            _ => ChatRole.Assistant
        };

        var contents = new List<AIContent>();

        foreach (var p in stored.ContentParts)
        {
            var json = JsonSerializer.Deserialize<JsonElement>(p.Json, _json);

            switch (p.Kind)
            {
                case "text":
                    contents.Add(new TextContent(
                        json.GetProperty("Text").GetString()!));
                    break;

                case "uri":
                    var uri = json.GetProperty("uri").GetString();
                    var mediaType = json.TryGetProperty("MediaType", out var mt) ? mt.GetString() : null;
                    if (uri is not null)
                        contents.Add(new UriContent(new Uri(uri), mediaType ?? "application/octet-stream"));
                    break;

                case "binary_ref":
                    var blobUri = json.GetProperty("blob").GetProperty("Uri").GetString();
                    var blobMediaType = json.TryGetProperty("MediaType", out var bmt) ? bmt.GetString() : null;
                    if (blobUri is not null)
                        contents.Add(new UriContent(new Uri(blobUri), blobMediaType ?? "application/octet-stream"));
                    break;

                case "tool_call":
                    contents.Add(new FunctionCallContent(
                        json.GetProperty("CallId").GetString()!,
                        json.GetProperty("Name").GetString()!,
                        json.GetProperty("Arguments").Deserialize<IDictionary<string, object?>>(_json)));
                    break;

                case "tool_result":
                    contents.Add(new FunctionResultContent(
                        json.GetProperty("CallId").GetString()!,
                        json.GetProperty("Result").ToString()));
                    break;
            }
        }

        return new ChatMessage(role, contents)
        {
            AuthorName = stored.ActorId
        };
    }

    private StoredContentPart JsonPart(string kind, object value)
        => new()
        {
            Kind = kind,
            Json = JsonSerializer.Serialize(value, _json)
        };
}
