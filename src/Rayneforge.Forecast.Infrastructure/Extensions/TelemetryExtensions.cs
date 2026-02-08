using System.Collections.Generic;
using Microsoft.ApplicationInsights;

namespace Rayneforge.Forecast.Infrastructure.Extensions;

public static class TelemetryExtensions
{
    public static void TrackModelUsage(
        this TelemetryClient client,
        string operationType,
        string model,
        long inputTokens,
        long outputTokens,
        double cost = 0,
        string? provider = null)
    {
        var properties = new Dictionary<string, string>
        {
            ["model"] = model,
            ["operation_type"] = operationType
        };
        
        if (!string.IsNullOrEmpty(provider))
        {
            properties["provider"] = provider;
        }

        client.TrackEvent(
            "llm.usage",
            properties,
            new Dictionary<string, double>
            {
                ["input_tokens"] = inputTokens,
                ["output_tokens"] = outputTokens,
                ["total_tokens"] = inputTokens + outputTokens,
                ["cost_usd"] = cost
            });
    }

    public static void TrackChatUsage(
        this TelemetryClient client,
        string model,
        Microsoft.Extensions.AI.UsageDetails? usage,
        double cost = 0)
    {
        if (usage is null) return;

        client.TrackModelUsage(
            "chat",
            model,
            (long)(usage.InputTokenCount ?? 0),
            (long)(usage.OutputTokenCount ?? 0),
            cost);
    }
}
