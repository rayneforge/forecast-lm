using System.Reflection;
using Microsoft.Extensions.DependencyInjection;
using Rayneforge.Forecast.Infrastructure.Abstractions;
using Rayneforge.Forecast.Infrastructure.Attributes;

namespace Rayneforge.Forecast.Infrastructure.Factories;

public sealed class AgentFactory
{
    private readonly IReadOnlyDictionary<string, AgentSetup> _agents;

    public AgentFactory(IServiceProvider services)
    {
        _agents = services
            .GetServices<AgentSetup>()
            .Select(agent => new
            {
                Agent = agent,
                Attribute = agent.GetType()
                    .GetCustomAttribute<AgentSetupAttribute>()
            })
            .Where(x => x.Attribute != null)
            .ToDictionary(
                x => x.Attribute!.Name,
                x => x.Agent);
    }

    public AgentSetup Get(string name)
        => _agents.TryGetValue(name, out var agent)
            ? agent
            : throw new KeyNotFoundException($"AgentSetup '{name}' not found.");
}
