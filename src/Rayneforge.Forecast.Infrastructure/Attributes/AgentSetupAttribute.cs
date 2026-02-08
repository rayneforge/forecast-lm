namespace Rayneforge.Forecast.Infrastructure.Attributes;

[AttributeUsage(AttributeTargets.Class, Inherited = false)]
public sealed class AgentSetupAttribute(string name) : Attribute
{
    public string Name { get; } = name;
}
