using Azure.AI.OpenAI;
using Azure.Identity;
using Microsoft.Extensions.AI;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;
using OllamaSharp;
using Rayneforge.Forecast.Infrastructure.Abstractions;
using Rayneforge.Forecast.Infrastructure.Options;
using OpenAI;
using OpenAI.Chat;
using Rayneforge.Forecast.Domain.Models;

namespace Rayneforge.Forecast.Infrastructure.Factories;

public class ChatClientFactory : IChatClientFactory
{
    private readonly IConfiguration _configuration;
    private readonly IOptions<LLMOptions> _options;
    private readonly IServiceProvider _serviceProvider;

    public ChatClientFactory(
        IConfiguration configuration, 
        IOptions<LLMOptions> options,
        IServiceProvider serviceProvider)
    {
        _configuration = configuration;
        _options = options;
        _serviceProvider = serviceProvider;
    }

    public IChatClient CreateChatClient(LLMTier tier)
    {
        // Provider strategy: Environment Var "Providers:LLM" or "Embeddings:Provider" (fallback? user typically sets dedicated)
        // Let's assume a "Providers:LLM" key or similar. The user mentioned "PROVIDER" env var in their snippet.
        // In AppHost, we set "Embeddings:Provider" but not explicitly "LLM:Provider". 
        // User said: "we need to specify a provide for LLM".
        // Let's look for "Providers:LLM", defaulting to "ollama".
        
        var provider = _configuration["Providers:LLM"] ?? "ollama";

        return provider.ToLowerInvariant() switch
        {
            "azureopenai" => CreateAzureOpenAIClient(tier),
            "ollama" => CreateOllamaClient(tier),
            "openai" => CreateOpenAIClient(tier),
            _ => throw new InvalidOperationException($"Unsupported LLM provider: {provider}")
        };
    }

    private IChatClient CreateAzureOpenAIClient(LLMTier tier)
    {
        var opt = _options.Value.AzureOpenAI;
        var deploymentName = tier == LLMTier.Lite ? opt.LiteDeployment : opt.BasicDeployment;

        AzureOpenAIClient azureClient;

        if (opt.UseManagedIdentity)
        {
            var credOpts = new DefaultAzureCredentialOptions();
            if (!string.IsNullOrWhiteSpace(opt.ManagedIdentityClientId))
                credOpts.ManagedIdentityClientId = opt.ManagedIdentityClientId;
            
            azureClient = new AzureOpenAIClient(new Uri(opt.Endpoint), new DefaultAzureCredential(credOpts));
        }
        else if (!string.IsNullOrWhiteSpace(opt.ApiKey))
        {
            azureClient = new AzureOpenAIClient(new Uri(opt.Endpoint), new System.ClientModel.ApiKeyCredential(opt.ApiKey));
        }
        else 
        {
            var cred = _serviceProvider.GetService<Azure.Core.TokenCredential>();
            if (cred != null)
                azureClient = new AzureOpenAIClient(new Uri(opt.Endpoint), cred);
            else
                throw new InvalidOperationException("Azure OpenAI credentials not found (ApiKey or ManagedIdentity).");
        }

        // Try the extension method again, but ensuring we are using the ChatClient from OpenAI.Chat
        // and relying on Microsoft.Extensions.AI.OpenAI extension methods.
        // It's possible the extension method is named differently or in a different namespace.
        // I will try 'AsChatClient' again but if it fails, I will assume I need to find the right import.
        // Wait, did I miss `using Microsoft.Extensions.AI.OpenAI;`? 
        // I'll assume the extension is in the root namespace `Microsoft.Extensions.AI`.
        
        return azureClient.GetChatClient(deploymentName).AsIChatClient();
    }

    private IChatClient CreateOllamaClient(LLMTier tier)
    {
        var opt = _options.Value.Ollama;
        var model = tier == LLMTier.Lite ? opt.LiteModel : opt.BasicModel;
        
        // OllamaSharp implements IChatClient directly on OllamaApiClient in recent versions.
        return new OllamaApiClient(new Uri(opt.BaseUrl), model);
    }

    private IChatClient CreateOpenAIClient(LLMTier tier)
    {
        var opt = _options.Value.OpenAI;
        var model = tier == LLMTier.Lite ? opt.LiteModel : opt.BasicModel;

        // Ensure ApiKey is provided.
        if (string.IsNullOrWhiteSpace(opt.ApiKey))
        {
             throw new InvalidOperationException("OpenAI configuration requires an ApiKey.");
        }
        
        var client = new OpenAI.OpenAIClient(opt.ApiKey);
        
        return client.GetChatClient(model).AsIChatClient();
    }
}
