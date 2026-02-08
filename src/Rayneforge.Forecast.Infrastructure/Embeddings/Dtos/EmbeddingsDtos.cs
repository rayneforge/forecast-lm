using System.Text.Json.Serialization;

namespace Rayneforge.Forecast.Infrastructure.Embeddings.Dtos;

public sealed class EmbeddingsResponse
{
    [JsonPropertyName("data")]
    public List<EmbeddingItem> Data { get; set; } = new();

    [JsonPropertyName("usage")]
    public EmbeddingsUsage? Usage { get; set; }

    public sealed class EmbeddingItem
    {
        [JsonPropertyName("index")]
        public int Index { get; set; }

        [JsonPropertyName("embedding")]
        public float[] Embedding { get; set; } = Array.Empty<float>();
    }

    public sealed class EmbeddingsUsage
    {
        [JsonPropertyName("prompt_tokens")]
        public int PromptTokens { get; set; }

        [JsonPropertyName("total_tokens")]
        public int TotalTokens { get; set; }
    }
}

public sealed class OllamaEmbeddingsResponse
{
    [JsonPropertyName("embeddings")]
    public List<float[]> Embeddings { get; set; } = new();

    [JsonPropertyName("prompt_eval_count")]
    public int PromptEvalCount { get; set; }

    [JsonPropertyName("eval_count")]
    public int EvalCount { get; set; }
}
