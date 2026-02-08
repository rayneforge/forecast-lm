namespace Rayneforge.Forecast.Domain.Models;

using System;
using System.Reflection;
using Rayneforge.Forecast.Domain.Abstractions;
using Rayneforge.Forecast.Domain.Attributes;

public class Document : ISemanticEntity
{
    public string Id { get; set; } = Guid.NewGuid().ToString();
    public ReadOnlyMemory<float> Embedding { get; set; }
    public string Content { get; set; } = string.Empty;
    
    [Filterable("The document title")]
    public string Title { get; set; } = string.Empty;
    
    [Filterable("Source URL")]
    public string? Url { get; set; }

    [Filterable("Creation date")]
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;

    public static string GetSchemaDescription()
    {
        var sb = new System.Text.StringBuilder();
        sb.AppendLine($"Entity: {typeof(Document).Name}");
        
        foreach (var prop in typeof(Document).GetProperties(BindingFlags.Public | BindingFlags.Instance))
        {
            var attr = prop.GetCustomAttribute<FilterableAttribute>();
            if (attr == null) continue;
            
            var typeName = prop.PropertyType.Name;
            if (prop.PropertyType == typeof(string)) typeName = "string";
            else if (prop.PropertyType == typeof(DateTimeOffset)) typeName = "datetime";
            
            var desc = attr.Description != null ? $" - {attr.Description}" : "";
            sb.AppendLine($"- {prop.Name} ({typeName}){desc}");
        }
        return sb.ToString();
    }
}
