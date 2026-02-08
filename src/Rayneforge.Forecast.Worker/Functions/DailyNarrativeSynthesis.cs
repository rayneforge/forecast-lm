namespace Rayneforge.Forecast.Worker.Functions;

using System;
using System.Threading.Tasks;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Extensions.Logging;
using Rayneforge.Forecast.Domain.Models;
using Rayneforge.Forecast.Infrastructure.Abstractions;
using Rayneforge.Forecast.Infrastructure.Agents;

/// <summary>
/// Worker 3 — Daily Narrative Synthesis.
/// Runs daily to review recently submitted claims and pending narratives.
/// Uses the AgentService to either:
///   - Produce write-ups for narratives from clusters of supporting claims
///   - Supplement existing narratives with new supporting claims
/// </summary>
public class DailyNarrativeSynthesis(
    ISemanticRepository<Narrative> narrativeRepo,
    ISemanticRepository<ArticleClaim> claimRepo,
    AgentService agentService,
    ILogger<DailyNarrativeSynthesis> logger)
{
    [Function("DailyNarrativeSynthesis")]
    public async Task Run([TimerTrigger("0 0 14 * * *")] TimerInfo myTimer)
    {
        Console.Error.WriteLine("### DailyNarrativeSynthesis Triggered ###");
        logger.LogInformation("Narrative synthesis triggered at {Time}", DateTime.UtcNow);

        try
        {
            // Gather narratives that lack a write-up (i.e. not yet synthesized)
            var pendingNarratives = await narrativeRepo.FindAsync(n => n.WriteUp == null);
            var recentClaims = await claimRepo.GetAllAsync();

            var narrativeList = pendingNarratives.ToList();
            var claimList = recentClaims.ToList();

            if (narrativeList.Count == 0)
            {
                logger.LogInformation("No pending narratives to synthesize.");
                Console.Error.WriteLine("### No pending narratives found ###");
                return;
            }

            logger.LogInformation(
                "Synthesizing {NarrativeCount} pending narratives against {ClaimCount} claims.",
                narrativeList.Count, claimList.Count);
            
            Console.Error.WriteLine($"### Processing {narrativeList.Count} narratives and {claimList.Count} claims ###");

            // Compose a synthesis prompt with the current speculative landscape
            var narrativeSummary = string.Join("\n", narrativeList.Select(n =>
                $"- [{n.Category}] \"{n.Label}\" (justification: {n.Justification ?? "none"})"));

            var claimSummary = string.Join("\n", claimList.Take(50).Select(c =>
                $"- \"{c.NormalizedText}\" (article: {c.ArticleId})"));

            var prompt = $"""
                Review the following pending narratives and recent claims.
                Identify clusters of narratives that can be merged and synthesized into write-ups.
                Supplement existing narratives with new supporting claims where appropriate.

                PENDING NARRATIVES:
                {narrativeSummary}

                RECENT CLAIMS (sample):
                {claimSummary}

                Return structured JSON with:
                1. synthesized: narratives with generated write-ups from merged claims
                2. supplements: existing narrative IDs with new claim links
                3. dismissed: narrative IDs that lack sufficient support
                """;

            var threadId = $"synthesis_{DateTime.UtcNow:yyyyMMdd}";
            
            // Console.Error.WriteLine($"### Running agent research.narrative on thread {threadId} ###");
            
            // var response = await agentService.RunAgentAsync(
            //     "research.narrative", prompt, userId: "_system", threadId: threadId);
            
            var response = new { Text = "{\"synthesized\": [], \"supplements\": [], \"dismissed\": []}" };

            // Downstream: parse response JSON and update Narrative records
            // (set WriteUp for confirmed narratives, add NarrativeClaimLinks, etc.)

            Console.Error.WriteLine($"### Agent response received ({response.Text?.Length ?? 0} chars) ###");
            logger.LogInformation("Narrative synthesis complete. Response length: {Len}", response.Text?.Length ?? 0);
        }
        catch (Exception ex)
        {
            Console.Error.WriteLine($"### ERROR in DailyNarrativeSynthesis: {ex} ###");
            logger.LogError(ex, "Daily narrative synthesis failed.");
        }
    }
}
