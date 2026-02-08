namespace Rayneforge.Forecast.Infrastructure.Options;

public class ProviderOptions
{
    public const string SectionName = "Providers";
    
    public string Database { get; set; } = "sqlite";
    public string Blob { get; set; } = "azureblob";
    public string News { get; set; } = "mock";
    public string Embedding { get; set; } = "ollama";
    public string LLM { get; set; } = "ollama";
    public string MessageBus { get; set; } = "azureservicebus";
}
