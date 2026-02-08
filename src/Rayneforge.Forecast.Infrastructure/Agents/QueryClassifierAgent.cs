using Microsoft.Extensions.AI;
using Rayneforge.Forecast.Domain.Models;
using Rayneforge.Forecast.Infrastructure.Abstractions;
using Rayneforge.Forecast.Infrastructure.Attributes;

namespace Rayneforge.Forecast.Infrastructure.Agents;

[AgentSetup("ui.classify-query")]
public sealed class QueryClassifierAgent : AgentSetup
{
    public override LLMTier Tier => LLMTier.Lite;

    public override string SystemPrompt => 
        $$"""
        You are a smart query classifier for search systems. Classify the input as:

        - "Filter": Explicit operators (AND/OR/NOT/>/</=quotes, fields like price:, date:, category:) or structured syntax.
        - "Semantic": Natural language intent/context (synonyms, ambiguity)—but STILL extract implied filterable parameters.

        Queryable parameters include:
        {{NewsArticle.GetSchemaDescription()}}

        Respond ONLY with valid JSON, no extra text:
        {
          "QueryType": "Filter" | "Semantic",
          "Reasoning": "1-2 sentences on classification + key indicators",
          "Filters": [
            {"key": "field_name", "operator": "=" | ">" | "<" | "range" | "contains", "value": "extracted_value"}
          ]
        }
        (Use empty array [] if no filters. Infer operators/values from context, e.g., "cheap" → price < 50, "recent" → date > 2025-01-01.)
        """;

    public override IReadOnlyList<AITool> Tools => [];
}
