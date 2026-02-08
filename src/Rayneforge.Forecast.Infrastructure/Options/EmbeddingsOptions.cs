using System.ComponentModel.DataAnnotations;

namespace Rayneforge.Forecast.Infrastructure.Options;

public sealed class EmbeddingsOptions
{
    public OllamaEmbeddingsOptions Ollama { get; set; } = new();
    public AzureOpenAIEmbeddingsOptions AzureOpenAI { get; set; } = new();
    public OpenAIEmbeddingsOptions OpenAI { get; set; } = new();
}

public sealed class OllamaEmbeddingsOptions
{
    [Required] public string BaseUrl { get; set; } = "http://localhost:11434";
    [Required] public string Model { get; set; } = "nomic-embed-text";
}

public sealed class AzureOpenAIEmbeddingsOptions : IValidatableObject
{
    public string Endpoint { get; set; } = default!;
    public string Deployment { get; set; } = default!;

    /// <summary>Azure OpenAI api-version. Set a sane default if omitted.</summary>
    public string? ApiVersion { get; set; } = "2024-10-21";

    /// <summary>If set, use key auth. Prefer injecting from KeyVault/env var.</summary>
    public string? ApiKey { get; set; }

    /// <summary>If true, use DefaultAzureCredential/Managed Identity.</summary>
    public bool UseManagedIdentity { get; set; }

    /// <summary>Optional: UAMI client id (if using user-assigned MI).</summary>
    public string? ManagedIdentityClientId { get; set; }

    public IEnumerable<ValidationResult> Validate(ValidationContext validationContext)
    {
        if (string.IsNullOrWhiteSpace(Endpoint))
        {
             yield return new ValidationResult(
                "AzureOpenAI Endpoint is required.",
                new[] { nameof(Endpoint) });
        }
        
        if (string.IsNullOrWhiteSpace(Deployment))
        {
             yield return new ValidationResult(
                "AzureOpenAI Deployment is required.",
                new[] { nameof(Deployment) });
        }
        
        if (string.IsNullOrWhiteSpace(ApiKey) && !UseManagedIdentity)
        {
            yield return new ValidationResult(
                "AzureOpenAI requires either ApiKey or UseManagedIdentity=true.",
                new[] { nameof(ApiKey), nameof(UseManagedIdentity) });
        }

        if (!string.IsNullOrWhiteSpace(ApiKey) && UseManagedIdentity)
        {
            yield return new ValidationResult(
                "Set either ApiKey OR UseManagedIdentity=true, not both.",
                new[] { nameof(ApiKey), nameof(UseManagedIdentity) });
        }
    }
}

public sealed class OpenAIEmbeddingsOptions
{
    [Required] public string Model { get; set; } = "text-embedding-3-small";
    public string? ApiKey { get; set; } // KeyVault/env var preferred
    public string? BaseUrl { get; set; } // optional gateway
}
