using Microsoft.Extensions.AI;
using Rayneforge.Forecast.Domain.Models;

namespace Rayneforge.Forecast.Infrastructure.Abstractions;

public abstract class AgentSetup
{
    public virtual LLMTier Tier { get; } = LLMTier.Basic;

    public abstract string SystemPrompt { get; }

    public abstract IReadOnlyList<AITool> Tools { get; }

    /// <summary>
    /// Optional structured output format. When set, the agent requests typed JSON responses.
    /// Can be overridden per-call via <see cref="AgentService.RunAgentAsync{T}"/>.
    /// </summary>
    public virtual ChatResponseFormat? ResponseFormat => null;
}
