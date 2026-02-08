namespace Rayneforge.Forecast.Worker.Functions;

using System;
using System.Threading.Tasks;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Extensions.Logging;
using Rayneforge.Forecast.Domain.Models;
using Rayneforge.Forecast.Infrastructure.Abstractions;
using Rayneforge.Forecast.Infrastructure.Agents;

/// <summary>
/// Worker 2 — Article Assessment.
/// Triggered by a Service Bus message on the "assess-article" queue.
/// Loads the article, runs the AgentService to extract claims, entities,
/// and a speculative narrative summary, then persists the results.
/// </summary>
public class OnIntakeArticleAssessment(
    ISemanticRepository<NewsArticle> articleRepo,
    AgentService agentService,
    ILogger<OnIntakeArticleAssessment> logger)
{
    [Function("OnIntakeArticleAssessment")]
    public async Task Run(
        [ServiceBusTrigger("article-ingest", Connection = "ServiceBusConnection")] ArticleIngestMessage message)
    {
        Console.Error.WriteLine($"### OnIntakeArticleAssessment Triggered for {message.ArticleId} ###");
        logger.LogInformation("Article assessment triggered for article {ArticleId}", message.ArticleId);

        try
        {
            var article = await articleRepo.GetAsync(message.ArticleId);
            if (article is null)
            {
                Console.Error.WriteLine($"### Article {message.ArticleId} not found ###");
                logger.LogWarning("Article {ArticleId} not found — skipping.", message.ArticleId);
                return;
            }
            
            Console.Error.WriteLine($"### Assessing Article: '{article.Title}' ({article.Source.Name}) ###");

            var prompt = $"""
                Analyze the following article and return structured JSON per the schema.

                Article ID: {article.Id}
                Source: {article.Source.Name}
                Author: {article.Author ?? "Unknown"}
                Published: {article.PublishedAt:O}
                URL: {article.Url}

                Title: {article.Title}

                Description: {article.Description ?? "(none)"}

                Content:
                {article.Content ?? "(no full content available)"}
                """;

            // The "intake.narrative" agent extracts claims, entities,
            // and speculative narrative positioning for the article
            var threadId = $"assess_{article.Id}";
            Console.Error.WriteLine($"### Running agent intake.narrative on thread {threadId} ###");
            
            var response = await agentService.RunAgentAsync(
                "intake.narrative", prompt, userId: "_system", threadId: threadId);

            // TODO: Parse the structured JSON response and persist:
            //  - Entities (upsert by canonical_name + entity_type)
            //  - ArticleClaims (linked to this article)
            //  - ArticleClaimEntity joins
            //  - article.SpeculativeNarrative = response notes/summary
            
            Console.Error.WriteLine($"### Assessment complete. Response len: {response.Text?.Length ?? 0} ###");

            logger.LogInformation(
                "Article assessment complete for {ArticleId}. Response length: {Len}",
                article.Id, response.Text?.Length ?? 0);
        }
        catch (Exception ex)
        {
            Console.Error.WriteLine($"### ERROR in OnIntakeArticleAssessment: {ex.Message} ###");
            logger.LogError(ex, "Article assessment failed for {ArticleId}", message.ArticleId);
            throw; // Let the function runtime handle retry / dead-letter
        }
    }
}
