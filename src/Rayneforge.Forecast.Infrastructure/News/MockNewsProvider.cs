namespace Rayneforge.Forecast.Infrastructure.News;

using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Rayneforge.Forecast.Domain.Models;
using Rayneforge.Forecast.Infrastructure.Abstractions;

public class MockNewsProvider : INewsProvider
{
    public Task<NewsResult> GetEverythingAsync(string q, string? from, string? sortBy, string? language, int pageSize, int page)
    {
        return Task.FromResult(GenerateMockData(pageSize > 0 ? pageSize : 20));
    }

    public Task<NewsResult> GetTopHeadlinesAsync(string? country, string? category, string? sources, string? q, int pageSize, int page)
    {
        return Task.FromResult(GenerateMockData(pageSize > 0 ? pageSize : 10));
    }
    
    private NewsResult GenerateMockData(int count)
    {
        var articles = new List<NewsArticle>();
        for (int i = 0; i < count; i++)
        {
            articles.Add(new NewsArticle
            {
                Id = Guid.NewGuid().ToString(),
                Title = $"Mock Article {i + 1}: The Future of Tech",
                Author = "Mock Author",
                Description = "This is a simulated article description for development and testing.",
                Content = $"This is the full content of mock article {i + 1}. It contains enough text to simulate a real news story for embedding purposes. The quick brown fox jumps over the lazy dog.",
                Url = $"https://example.com/mock-news/{Guid.NewGuid()}",
                UrlToImage = "https://via.placeholder.com/150",
                PublishedAt = DateTimeOffset.UtcNow.AddMinutes(-i * 15),
                Source = new NewsSource("mock-source", "Mock News Network")
            });
        }
        
        return new NewsResult(count, articles);
    }
}
