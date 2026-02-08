namespace Rayneforge.Forecast.Worker.Functions;

using System;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Extensions.Logging;
using Rayneforge.Forecast.Domain.Models;
using Rayneforge.Forecast.Infrastructure.Abstractions;
using Rayneforge.Forecast.Infrastructure.Extensions;

/// <summary>
/// Worker 1 — Daily Article Review.
/// Runs on a timer, fetches top headlines, persists them,
/// then publishes each article ID to the Service Bus for downstream processing.
/// </summary>
public class DailyArticleReview(
    INewsProvider newsProvider,
    ISemanticRepository<NewsArticle> repository,
    IMessageBus messageBus,
    ILogger<DailyArticleReview> logger)
{
    [Function("DailyArticleReview")]
    public async Task Run([TimerTrigger("0 0 12 * * *")] TimerInfo myTimer)
    {
        Console.Error.WriteLine("### DailyArticleReview Triggered ###");
        logger.LogInformation("News ingest triggered at {Time}", DateTime.UtcNow);

        try
        {
            var result = await newsProvider.GetTopHeadlinesAsync(
                country: "us", category: "technology",
                sources: null, q: null, pageSize: 10, page: 1);

            Console.Error.WriteLine($"### Fetched {result?.Articles?.Count() ?? 0} articles ###");

            if (result.Articles == null || !result.Articles.Any())
            {
                logger.LogWarning("No articles returned from news provider.");
                return;
            }

            var savedIds = new List<string>();

            foreach (var article in result.Articles)
            {
                Console.Error.WriteLine($"### Saving article {article.Title} ###");
                var saved = await repository.AddAsync(article);
                savedIds.Add(saved.Id);
            }

            logger.LogInformation("Persisted {Count} articles.", savedIds.Count);

            // Publish article IDs to the ingest queue for Worker 2
            var messages = savedIds.Select(id => new ArticleIngestMessage(id));
            Console.Error.WriteLine($"### Sending to queue {HostApplicationBuilderExtensions.AssessArticleQueue} ###");
            await messageBus.SendBatchAsync(
                HostApplicationBuilderExtensions.AssessArticleQueue, messages);

            logger.LogInformation("Published {Count} messages to '{Queue}'.",
                savedIds.Count, HostApplicationBuilderExtensions.AssessArticleQueue);
        }
        catch (Exception ex)
        {
            Console.Error.WriteLine($"### ERROR in DailyArticleReview: {ex} ###");
            logger.LogError(ex, "News ingest failed.");
        }
    }
}

/// <summary>Message payload placed on the assess-article queue.</summary>
public record ArticleIngestMessage(string ArticleId);
