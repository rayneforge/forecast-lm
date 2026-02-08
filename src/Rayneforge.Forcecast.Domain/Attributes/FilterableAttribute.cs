using System;

namespace Rayneforge.Forecast.Domain.Attributes;

[AttributeUsage(AttributeTargets.Property)]
public class FilterableAttribute(string? description = null) : Attribute
{
    public string? Description { get; } = description;
}
