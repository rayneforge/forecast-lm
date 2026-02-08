namespace Rayneforge.Forecast.Infrastructure.Abstractions;

using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Rayneforge.Forecast.Domain.Abstractions;
using Rayneforge.Forecast.Domain.Models;

using System.Linq.Expressions;

public interface ISemanticRepository<T> where T : class, ISemanticEntity
{
    // CRUD
    Task<T?> GetAsync(string id);
    Task<IEnumerable<T>> GetAllAsync();
    Task<IEnumerable<T>> FindAsync(Expression<Func<T, bool>> predicate);
    Task<T> AddAsync(T entity);
    Task<T> UpdateAsync(T entity);
    Task DeleteAsync(string id);

    // Semantic & Hybrid Search
    Task<IEnumerable<T>> SemanticSearchAsync(ReadOnlyMemory<float> queryEmbedding, Expression<Func<T, bool>>? filter = null, int limit = 10, float threshold = 0.8f);
    Task<IEnumerable<SearchResult<T>>> HybridSearchAsync(string textQuery, ReadOnlyMemory<float> queryEmbedding, Expression<Func<T, bool>>? filter = null, int limit = 10);
}
