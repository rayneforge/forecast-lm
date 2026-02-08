using Microsoft.Extensions.AI;

namespace Rayneforge.Forecast.Domain.Models;

public record AgentRunResult(string Text, UsageDetails? Usage);
