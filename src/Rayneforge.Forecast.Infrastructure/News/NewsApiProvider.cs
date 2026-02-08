using System.Net.Http.Json;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Rayneforge.Forecast.Domain.Models;
using Rayneforge.Forecast.Infrastructure.Abstractions;
using Rayneforge.Forecast.Infrastructure.Options;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace Rayneforge.Forecast.Infrastructure.News;

public class NewsApiHttpProvider(HttpClient httpClient, IOptions<NewsApiOptions> options, ILogger<NewsApiHttpProvider> logger) : INewsProvider
{
    private const string BaseUrl = "https://newsapi.org/v2/";

    public async Task<NewsResult> GetEverythingAsync(string q, string? from, string? sortBy, string? language, int pageSize, int page)
    {
        return await CallNewsApi("everything", new Dictionary<string, string?>
        {
            ["q"] = q,
            ["from"] = from,
            ["sortBy"] = sortBy,
            ["language"] = language,
            ["pageSize"] = pageSize.ToString(),
            ["page"] = page.ToString()
        });
    }

    public async Task<NewsResult> GetTopHeadlinesAsync(string? country, string? category, string? sources, string? q, int pageSize, int page)
    {
        return await CallNewsApi("top-headlines", new Dictionary<string, string?>
        {
            ["country"] = country,
            ["category"] = category,
            ["sources"] = sources,
            ["q"] = q,
            ["pageSize"] = pageSize.ToString(),
            ["page"] = page.ToString()
        });
    }

    private async Task<NewsResult> CallNewsApi(string endpoint, Dictionary<string, string?> parameters)
    {
        var apiKey = options.Value.ApiKey;
        // Fallback to environment variable if options is empty (useful for simple dev setup)
        if (string.IsNullOrEmpty(apiKey))
        {
             apiKey = Environment.GetEnvironmentVariable("NEWS_API_KEY");
        }

        if (string.IsNullOrEmpty(apiKey))
        {
            logger.LogError("NewsAPI key is missing.");
             return new NewsResult(0, Enumerable.Empty<NewsArticle>());
        }

        var queryString = string.Join("&", parameters
            .Where(p => !string.IsNullOrEmpty(p.Value))
            .Select(p => $"{p.Key}={Uri.EscapeDataString(p.Value!)}"));

        var url = $"{BaseUrl}{endpoint}?{queryString}&apiKey={apiKey}";

        try
        {
            // Reset headers and add User-Agent as required by NewsAPI
            httpClient.DefaultRequestHeaders.UserAgent.Clear();
            httpClient.DefaultRequestHeaders.UserAgent.ParseAdd("Rayneforge.Forecast/1.0");

            var response = await httpClient.GetAsync(url);
            
            if (!response.IsSuccessStatusCode)
            {
                var errorContent = await response.Content.ReadAsStringAsync();
                logger.LogError("NewsAPI error: {StatusCode} {Content}", response.StatusCode, errorContent);
                return new NewsResult(0, Enumerable.Empty<NewsArticle>());
            }

            var apiResponse = await response.Content.ReadFromJsonAsync<NewsApiResponse>();
            if (apiResponse == null || apiResponse.Status != "ok")
            {
                 logger.LogError("NewsAPI invalid response: {Status}", apiResponse?.Status);
                 return new NewsResult(0, Enumerable.Empty<NewsArticle>());
            }

            return new NewsResult(
                apiResponse.TotalResults,
                apiResponse.Articles.Select(a => new NewsArticle
                {
                    Source = new NewsSource(a.Source.Id, a.Source.Name),
                    Author = a.Author,
                    Title = a.Title,
                    Description = a.Description,
                    Url = a.Url,
                    UrlToImage = a.UrlToImage,
                    PublishedAt = a.PublishedAt,
                    Content = a.Content
                })
            );
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Error calling NewsAPI");
            return new NewsResult(0, Enumerable.Empty<NewsArticle>());
        }
    }

    private class NewsApiResponse
    {
        public string Status { get; set; } = string.Empty;
        public int TotalResults { get; set; }
        public List<ApiArticle> Articles { get; set; } = [];
    }

    private class ApiArticle
    {
        public ApiSource Source { get; set; } = new();
        public string? Author { get; set; }
        public string Title { get; set; } = string.Empty;
        public string? Description { get; set; }
        public string Url { get; set; } = string.Empty;
        public string? UrlToImage { get; set; }
        public DateTimeOffset PublishedAt { get; set; }
        public string? Content { get; set; }
    }

    private class ApiSource
    {
        public string? Id { get; set; }
        public string Name { get; set; } = string.Empty;
    }
}
