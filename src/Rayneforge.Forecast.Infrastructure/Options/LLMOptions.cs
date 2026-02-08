using System.ComponentModel.DataAnnotations;

namespace Rayneforge.Forecast.Infrastructure.Options;

public sealed class LLMOptions
{
    public const string SectionName = "LLM";

    public OllamaLLMOptions Ollama { get; set; } = new();
    public AzureOpenAILLMOptions AzureOpenAI { get; set; } = new();
    public OpenAILLMOptions OpenAI { get; set; } = new();
}

public sealed class OllamaLLMOptions
{
    [Required] public string BaseUrl { get; set; } = "http://localhost:11434";
    [Required] public string BasicModel { get; set; } = "phi3";
    [Required] public string LiteModel { get; set; } = "phi3:mini";
}

public sealed class AzureOpenAILLMOptions : IValidatableObject
{
    public string Endpoint { get; set; } = default!;
    public string BasicDeployment { get; set; } = default!;
    public string LiteDeployment { get; set; } = default!;
    
    // Reuse the same logic as Embeddings for consistency, user requested strict separation but underlying creds are same usage pattern.
    public string? ApiKey { get; set; }
    public bool UseManagedIdentity { get; set; }
    public string? ManagedIdentityClientId { get; set; }

    public IEnumerable<ValidationResult> Validate(ValidationContext validationContext)
    {
        if (string.IsNullOrWhiteSpace(Endpoint))
             yield return new ValidationResult("Endpoint required", new[] { nameof(Endpoint) });
             
        if (string.IsNullOrWhiteSpace(BasicDeployment))
             yield return new ValidationResult("BasicDeployment required", new[] { nameof(BasicDeployment) });

        if (string.IsNullOrWhiteSpace(LiteDeployment))
             yield return new ValidationResult("LiteDeployment required", new[] { nameof(LiteDeployment) });
    }
}

public sealed class OpenAILLMOptions
{
    [Required] public string BasicModel { get; set; } = "gpt-4o";
    [Required] public string LiteModel { get; set; } = "gpt-3.5-turbo";
    public string? ApiKey { get; set; }
    public string? BaseUrl { get; set; }
}
