using Rayneforge.Forecast.Domain.Models;

namespace Rayneforge.Forecast.Infrastructure.Abstractions;

public interface INewsProvider
{
    Task<NewsResult> GetEverythingAsync(string q, string? from, string? sortBy, string? language, int pageSize, int page);
    Task<NewsResult> GetTopHeadlinesAsync(string? country, string? category, string? sources, string? q, int pageSize, int page);
}
