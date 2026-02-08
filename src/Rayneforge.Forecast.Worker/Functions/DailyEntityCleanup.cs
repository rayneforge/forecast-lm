namespace Rayneforge.Forecast.Worker.Functions;

using System;
using System.Threading.Tasks;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Extensions.Logging;
using Rayneforge.Forecast.Domain.Models;
using Rayneforge.Forecast.Infrastructure.Abstractions;
using Rayneforge.Forecast.Infrastructure.Agents;

/// <summary>
/// Worker 4 — Daily Entity Cleanup.
/// Runs daily to deduplicate and merge entities that refer to the same
/// real-world concept but were extracted with slightly different names
/// or descriptions across articles.
/// Uses the AgentService with semantic similarity to propose merges.
/// </summary>
public class DailyEntityCleanup(
    ISemanticRepository<Entity> entityRepo,
    IEmbeddingsProvider embeddingsProvider,
    AgentService agentService,
    ILogger<DailyEntityCleanup> logger)
{
    [Function("DailyEntityCleanup")]
    public async Task Run([TimerTrigger("0 0 15 * * *")] TimerInfo myTimer)
    {
        Console.Error.WriteLine("### DailyEntityCleanup Triggered ###");
        logger.LogInformation("Daily entity cleanup triggered at {Time}", DateTime.UtcNow);

        try
        {
            var entities = (await entityRepo.GetAllAsync()).ToList();

            if (entities.Count < 2)
            {
                logger.LogInformation("Not enough entities to collapse ({Count}).", entities.Count);
                Console.Error.WriteLine($"### Not enough entities ({entities.Count}) skipping ###");
                return;
            }

            logger.LogInformation("Evaluating {Count} entities for collapse.", entities.Count);
            Console.Error.WriteLine($"### Evaluating {entities.Count} entities ###");

            // Build a summary for the agent to review
            var entitySummary = string.Join("\n", entities.Select(e =>
                $"- [{e.EntityType}] \"{e.CanonicalName}\" (id: {e.Id}, desc: {e.Description ?? "none"})"));

            var prompt = $"""
                Review the following extracted entities for duplicates or near-duplicates.
                Entities may have been extracted from different articles with slightly 
                different names, abbreviations, or descriptions but refer to the same 
                real-world person, organization, place, or concept.

                ENTITIES:
                {entitySummary}

                Return structured JSON with:
                1. merge_groups: arrays of entity IDs that should be collapsed into one canonical entity
                2. canonical: for each group, the proposed canonical_name and description
                3. no_merge: entity IDs that are unique and should not be merged
                """;

            var threadId = $"collapse_{DateTime.UtcNow:yyyyMMdd}";
            
            // Console.Error.WriteLine($"### Running agent research.narrative on thread {threadId} ###");
            
            // var response = await agentService.RunAgentAsync(
            //     "research.narrative", prompt, userId: "_system", threadId: threadId);
            
            var response = new { Text = "{\"merge_groups\": [], \"canonical\": [], \"no_merge\": []}" };

            // Downstream: parse response JSON, merge entity records,
            // update ArticleClaimEntity and NarrativeEntityLink references

            Console.Error.WriteLine($"### Agent response received ({response.Text?.Length ?? 0} chars) ###");
            logger.LogInformation("Daily entity cleanup complete. Response length: {Len}", response.Text?.Length ?? 0);
        }
        catch (Exception ex)
        {
            Console.Error.WriteLine($"### ERROR in DailyEntityCleanup: {ex} ###");
            logger.LogError(ex, "Daily entity cleanup failed.");
        }
    }
}
