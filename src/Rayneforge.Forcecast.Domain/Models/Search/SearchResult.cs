namespace Rayneforge.Forecast.Domain.Models;

public record SearchResult<T>(T Entity, float VectorScore, float? TextScore);
