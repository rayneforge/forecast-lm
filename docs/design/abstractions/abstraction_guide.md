# Abstraction & Provider Model

This guide explains how we swap implementations (Providers) without changing code.

## The Core Concept

We separate **Selection** from **Configuration**.

1.  **Selection (`Providers:`)**: "Which implementation do I use?" (e.g., SQLite vs Cosmos).
2.  **Configuration (`Embeddings:`, `Database:`)**: "What are the settings for that implementation?" (e.g., Connection Strings, API Keys).

---

## 1. Define the Options

We use a central `ProviderOptions` class to drive the factory logic.

```csharp
// Infrastructure/Options/ProviderOptions.cs
public class ProviderOptions
{
    public const string SectionName = "Providers";
    public string Embedding { get; set; } = "ollama"; // The switch
}
```

Detailed settings live in their own specific option classes.

```csharp
// Infrastructure/Options/EmbeddingsOptions.cs
public class EmbeddingsOptions 
{ 
    public OllamaOptions Ollama { get; set; } 
    public AzureOpenAIOptions AzureOpenAI { get; set; } 
}
```

## 2. The Abstraction & Factory

The Factory injects `IOptions<ProviderOptions>` to decide which concrete class to create.

```csharp
// Infrastructure/Factories/EmbeddingsProviderFactory.cs
public class EmbeddingsProviderFactory(IServiceProvider sp, IOptions<ProviderOptions> providers) 
    : IEmbeddingsProviderFactory
{
    public IEmbeddingsProvider CreateEmbeddingsProvider()
    {
        // 1. Read the switch
        var provider = providers.Value.Embedding.ToLower();

        // 2. Return the concrete service
        return provider switch
        {
            "ollama" => ActivatorUtilities.CreateInstance<OllamaEmbeddingsProvider>(sp),
            "azureopenai" => ActivatorUtilities.CreateInstance<AzureOpenAIEmbeddingsProvider>(sp),
            _ => throw new NotImplementedException()
        };
    }
}
```

## 3. Dependency Injection Wiring

In `HostApplicationBuilderExtensions.cs`, we register the factory and then the abstraction.

```csharp
// 1. Bind the decision switch
builder.Services.AddOptions<ProviderOptions>().BindConfiguration("Providers");

// 2. Bind the detailed settings
builder.Services.AddOptions<EmbeddingsOptions>().BindConfiguration("Embeddings");

// 3. Register the Factory
builder.Services.AddScoped<IEmbeddingsProviderFactory, EmbeddingsProviderFactory>();

// 4. Register the Abstraction (delegates to Factory)
builder.Services.AddScoped<IEmbeddingsProvider>(sp => 
    sp.GetRequiredService<IEmbeddingsProviderFactory>().CreateEmbeddingsProvider());
```

---

## 4. Configuration (appsettings.json)

This is where the runtime decision happens.

```json
{
  "Providers": {
    "Embedding": "azureopenai"  
  },
  "Embeddings": {
    "AzureOpenAI": {            
      "Endpoint": "https://..."
    }
  }
}
```

---

## 5. AppHost Integration (Cloud Dependencies)

The `AppHost` must match the application's implementation choice to provision the right resources.

```csharp
// AppHost/Program.cs

// 1. Read the same config value
var embeddingProvider = builder.Configuration["Providers:Embedding"] ?? "ollama";

// 2. Conditionally provision resources
if (embeddingProvider == "azureopenai")
{
    // Create Cloud Resource
    var aoai = builder.AddAzureOpenAI("aoai");
    
    // Inject Configuration
    api.WithEnvironment("Embeddings__AzureOpenAI__Endpoint", aoai.GetEndpoint("https"));
}
// If "ollama", we do nothing (assumes local sidecar or service)
```
