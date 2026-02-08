namespace Rayneforge.Forecast.Infrastructure.Agents;

using System.Text.Json;
using Microsoft.ApplicationInsights;
using Microsoft.Extensions.AI;
using Rayneforge.Forecast.Domain.Models;
using Rayneforge.Forecast.Infrastructure.Abstractions;
using Rayneforge.Forecast.Infrastructure.Extensions;
using Rayneforge.Forecast.Infrastructure.Factories;

public class AgentService(
    IChatMessageStoreFactory storeFactory,
    IChatDbProviderFactory dbFactory,
    IChatClientProvider chatClientProvider,
    AgentFactory agentFactory,
    TelemetryClient? telemetry = null)
{
    public async Task<ChatResponse> RunAgentAsync(
        string agentName,
        string input,
        string userId,
        string? threadId = null,
        CancellationToken ct = default)
    {
        var agentSetup = agentFactory.Get(agentName);
        var chatClient = agentSetup.Tier == LLMTier.Lite ? chatClientProvider.Lite : chatClientProvider.Basic;

        // If no threadId provided, run as a stateless one-shot (similar to ChatAsync)
        var isStateless = threadId is null;
        threadId ??= $"_Ephemeral_{Guid.NewGuid():N}";

        // 1. Validate ownership (persistent threads only)
        if (!isStateless)
        {
            var db = dbFactory.CreateChatDbProvider();
            await db.EnsureThreadAsync(threadId, userId, ct);
        }

        // 2. Create Store
        var store = storeFactory.Create(threadId, userId);

        // 3. Load History — stateless calls skip this (no prior conversation)
        var history = isStateless
            ? []
            : await store.InvokingAsync(new InvokingContext(threadId, userId), ct);

        // 4. Construct Prompt
        var messages = new List<ChatMessage>
        {
            new(ChatRole.System, agentSetup.SystemPrompt)
        };
        messages.AddRange(history);
        messages.Add(new ChatMessage(ChatRole.User, input));

        // 5. Run Client — agents own their tools + response format
        var options = new ChatOptions
        {
            Tools = [.. agentSetup.Tools],
            ResponseFormat = agentSetup.ResponseFormat
        };

        ChatResponse response;
        try
        {
            response = await chatClient.GetResponseAsync(messages, options, ct);
        }
        catch (Exception ex) when (agentSetup.ResponseFormat is not null && IsStructuredOutputException(ex))
        {
            // Provider rejected ResponseFormat — retry with tools only + JSON prompt
            options = new ChatOptions { Tools = [.. agentSetup.Tools] };
            messages.Insert(0, new ChatMessage(ChatRole.System,
                BuildJsonFallbackInstruction(agentSetup.ResponseFormat)));
            response = await chatClient.GetResponseAsync(messages, options, ct);
        }

        // 6. Track Usage
        if (response.Usage != null)
        {
            telemetry?.TrackChatUsage(agentName, response.Usage);
        }

        // 7. Persist — stateless calls only track usage, no message history
        if (isStateless)
        {
            if (response.Usage != null)
            {
                var db = dbFactory.CreateChatDbProvider();
                var proxyThread = $"_Anonymous_{userId}";
                await db.EnsureThreadAsync(proxyThread, userId, ct);
                await db.AppendMessagesAsync(proxyThread, [], response.Usage, ct);
            }
        }
        else
        {
            // Persistent thread — save the new request + response messages
            var requestMessages = new[] { new ChatMessage(ChatRole.User, input) };
            var responseMessages = response.Messages;

            await store.InvokedAsync(
                new InvokedContext(threadId, requestMessages, responseMessages, response.Usage),
                ct);
        }

        return response;
    }

    public async Task<IEnumerable<ConversationThread>> GetThreadsAsync(string userId, CancellationToken ct = default)
    {
        var db = dbFactory.CreateChatDbProvider();
        return await db.GetThreadsAsync(userId, ct);
    }

    public async Task<ConversationThread?> GetThreadAsync(string threadId, string userId, CancellationToken ct = default)
    {
        var db = dbFactory.CreateChatDbProvider();
        return await db.GetThreadAsync(threadId, userId, ct);
    }

    public async Task DeleteThreadAsync(string threadId, string userId, CancellationToken ct = default)
    {
        var db = dbFactory.CreateChatDbProvider();
        await db.DeleteThreadAsync(threadId, userId, ct);
    }

    public Task<ChatResponse> ChatAsync(
        string message,
        string userId,
        LLMTier tier = LLMTier.Basic,
        CancellationToken ct = default)
        => ChatCoreAsync(message, userId, tier, responseFormat: null, ct);

    /// <summary>
    /// Stateless chat with structured output. Requests JSON matching <typeparamref name="T"/>
    /// via the provider's native schema support, falling back to prompt-based JSON if unsupported.
    /// </summary>
    public async Task<ChatResponse<T>> ChatAsync<T>(
        string message,
        string userId,
        LLMTier tier = LLMTier.Basic,
        CancellationToken ct = default)
    {
        var format = ChatResponseFormat.ForJsonSchema<T>();
        var response = await ChatCoreAsync(message, userId, tier, format, ct);

        var typed = new ChatResponse<T>(response, JsonSerializerOptions.Web);
        if (typed.TryGetResult(out _))
            return typed;

        // Native parse failed — try manual parse of the raw text
        if (TryParseJson<T>(response.Text, out var fallback))
        {
            response.Messages.Add(new ChatMessage(ChatRole.Assistant, JsonSerializer.Serialize(fallback)));
            return new ChatResponse<T>(response, JsonSerializerOptions.Web);
        }

        return typed;
    }

    // ── Private core shared by both ChatAsync overloads ──

    private async Task<ChatResponse> ChatCoreAsync(
        string message,
        string userId,
        LLMTier tier,
        ChatResponseFormat? responseFormat,
        CancellationToken ct)
    {
        var chatClient = tier == LLMTier.Lite ? chatClientProvider.Lite : chatClientProvider.Basic;
        var anonymousThreadId = $"_Anonymous_{userId}";

        var db = dbFactory.CreateChatDbProvider();
        await db.EnsureThreadAsync(anonymousThreadId, userId, ct);

        var messages = new List<ChatMessage>
        {
            new(ChatRole.User, message)
        };

        var options = responseFormat is not null
            ? new ChatOptions { ResponseFormat = responseFormat }
            : null;

        ChatResponse response;
        try
        {
            response = await chatClient.GetResponseAsync(messages, options, ct);
        }
        catch (Exception ex) when (responseFormat is not null && IsStructuredOutputException(ex))
        {
            // Provider rejected ResponseFormat — retry bare with JSON prompt
            messages.Insert(0, new ChatMessage(ChatRole.System,
                BuildJsonFallbackInstruction(responseFormat)));
            response = await chatClient.GetResponseAsync(messages, cancellationToken: ct);
        }

        if (response.Usage != null)
        {
            telemetry?.TrackChatUsage("AnonymousChat", response.Usage);
            await db.AppendMessagesAsync(anonymousThreadId, [], response.Usage, ct);
        }

        return response;
    }

    // ── Shared helpers ──────────────────────────────────────────────────────────

    /// <summary>
    /// Tries to deserialize JSON text into <typeparamref name="T"/>.
    /// Strips markdown fences and trims whitespace before parsing.
    /// </summary>
    internal static bool TryParseJson<T>(string? text, out T? result)
    {
        result = default;
        if (string.IsNullOrWhiteSpace(text))
            return false;

        // Strip ```json ... ``` fences models sometimes add
        var json = text.AsSpan().Trim();
        if (json.StartsWith("```"))
        {
            var end = json.LastIndexOf("```");
            if (end > 3)
            {
                // skip past first line (```json\n)
                var newlineIdx = json.IndexOf('\n');
                json = json[(newlineIdx + 1)..end].Trim();
            }
        }

        try
        {
            result = JsonSerializer.Deserialize<T>(json, JsonSerializerOptions.Web);
            return result is not null;
        }
        catch (JsonException)
        {
            return false;
        }
    }

    private static bool IsStructuredOutputException(Exception ex) =>
        ex is NotSupportedException or InvalidOperationException ||
        ex.GetType().Name is "ClientResultException";

    private static string BuildJsonFallbackInstruction(ChatResponseFormat format)
    {
        const string preamble =
            "Respond ONLY with valid JSON matching the schema below. " +
            "Do not include markdown fences, commentary, or extra fields.\n";

        if (format is ChatResponseFormatJson { Schema: { } schema })
            return $"{preamble}Schema:\n{schema}";

        return preamble;
    }
}
