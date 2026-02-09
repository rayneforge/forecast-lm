using Azure.Core;
using Azure.Identity;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Options;
using Microsoft.EntityFrameworkCore;
using Rayneforge.Forecast.Domain.Models;
using Rayneforge.Forecast.Infrastructure.Abstractions;
using Rayneforge.Forecast.Infrastructure.Data;
using Rayneforge.Forecast.Infrastructure.Factories;
using Rayneforge.Forecast.Infrastructure.News;
using Rayneforge.Forecast.Infrastructure.Options;
using Rayneforge.Forecast.Infrastructure.Repositories;
using Rayneforge.Forecast.Infrastructure.Embeddings;
using Rayneforge.Forecast.Infrastructure.Agents;
using Rayneforge.Forecast.Infrastructure.Services;

namespace Rayneforge.Forecast.Infrastructure.Extensions;

public static class HostApplicationBuilderExtensions
{
    // ─── Well-known queue names ─────────────────────────────────────
    public const string AssessArticleQueue = "article-ingest";

    public static IHostApplicationBuilder AddMessageBus(this IHostApplicationBuilder builder)
    {
        builder.Services.AddOptions<ProviderOptions>()
            .BindConfiguration(ProviderOptions.SectionName);

        builder.Services.AddOptions<MessageBusOptions>()
            .Bind(builder.Configuration.GetSection(MessageBusOptions.SectionName))
            .Configure<IConfiguration>((options, config) =>
            {
                // Fallback: If ConnectionString is missing in "MessageBus:AzureServiceBus",
                // try "ServiceBusConnection" (used by Functions triggers) or "ConnectionStrings:messaging" (Aspire standard).
                if (string.IsNullOrWhiteSpace(options.AzureServiceBus.ConnectionString))
                {
                    var fallback = config["ServiceBusConnection"] ?? config.GetConnectionString("messaging");
                    if (!string.IsNullOrWhiteSpace(fallback))
                    {
                        options.AzureServiceBus.ConnectionString = fallback;
                    }
                }
            });

        builder.Services.AddSingleton<IMessageBusFactory, MessageBusFactory>();

        builder.Services.AddSingleton<IMessageBus>(sp =>
            sp.GetRequiredService<IMessageBusFactory>().CreateMessageBus());

        return builder;
    }

    public static IHostApplicationBuilder AddNewsProvider(this IHostApplicationBuilder builder)
    {
        builder.Services.AddOptions<NewsApiOptions>()
            .BindConfiguration(NewsApiOptions.SectionName);
            
        builder.Services.AddHttpClient<NewsApiHttpProvider>();

        builder.Services.AddScoped<INewsProviderFactory, NewsProviderFactory>();
        
        builder.Services.AddScoped<INewsProvider>(sp => 
        {
            var factory = sp.GetRequiredService<INewsProviderFactory>();
            return factory.CreateNewsProvider();
        });
        
        return builder;
    }

    public static IHostApplicationBuilder AddNewsRepository(this IHostApplicationBuilder builder)
    {
        builder.Services.AddOptions<ProviderOptions>()
            .BindConfiguration(ProviderOptions.SectionName);
            
        var provider = builder.Configuration["Providers:Database"] ?? "sqlite";

        // Register News-specific DbContext
        if (provider.Equals("sqlite", StringComparison.OrdinalIgnoreCase))
        {
            builder.Services.AddDbContext<SqliteNewsDbContext>(options =>
                options.UseSqlite(builder.Configuration.GetConnectionString("NewsDb") ?? "Data Source=news.db"));
        }
        else if (provider.Equals("cosmos", StringComparison.OrdinalIgnoreCase))
        {
            builder.Services.AddDbContext<CosmosNewsDbContext>(options =>
                options.UseCosmos(
                    builder.Configuration.GetConnectionString("cosmos")!,
                    databaseName: "NewsDb"
                ));
        }

        builder.Services.AddScoped<IDbProviderFactory, DbProviderFactory>();
        
        // Register the generic repository for NewsArticle
        builder.Services.AddScoped<ISemanticRepository<NewsArticle>>(sp => 
        {
            var factory = sp.GetRequiredService<IDbProviderFactory>();
            return factory.CreateSemanticRepository<NewsArticle>();
        });
        
        return builder;
    }

    public static IHostApplicationBuilder AddUserStore(this IHostApplicationBuilder builder)
    {
        builder.Services.AddOptions<ProviderOptions>()
            .BindConfiguration(ProviderOptions.SectionName);

        var provider = builder.Configuration["Providers:Database"] ?? "sqlite";

        // Register Conversation-specific DbContext
        if (provider.Equals("sqlite", StringComparison.OrdinalIgnoreCase))
        {
            builder.Services.AddDbContext<SqliteUserDbContext>(options =>
                options.UseSqlite(builder.Configuration.GetConnectionString("UserDb") ?? "Data Source=user.db"));
        }
        else if (provider.Equals("cosmos", StringComparison.OrdinalIgnoreCase))
        {
            builder.Services.AddDbContext<CosmosUserDbContext>(options =>
                options.UseCosmos(
                    builder.Configuration.GetConnectionString("cosmos")!,
                    databaseName: "UserDb"
                ));
        }

        // Chat DB provider (SQLite or Cosmos)
        builder.Services.AddScoped<IChatDbProviderFactory, ChatDbProviderFactory>();
        builder.Services.AddScoped<IChatDbProvider>(sp =>
            sp.GetRequiredService<IChatDbProviderFactory>().CreateChatDbProvider());

        // Chat blob provider (Azure Blob Storage — Azurite local, Azure cloud)
        builder.Services.AddScoped<IChatBlobProviderFactory, ChatBlobProviderFactory>();
        builder.Services.AddScoped<IChatBlobProvider>(sp =>
            sp.GetRequiredService<IChatBlobProviderFactory>().CreateChatBlobProvider());

        // Workspace repository (SQLite or Cosmos)
        builder.Services.AddScoped<IWorkspaceRepositoryFactory, WorkspaceRepositoryFactory>();
        builder.Services.AddScoped<IWorkspaceRepository>(sp =>
            sp.GetRequiredService<IWorkspaceRepositoryFactory>().CreateWorkspaceRepository());

        return builder;
    }

    public static IHostApplicationBuilder AddEmbeddingsProvider(this IHostApplicationBuilder builder)
    {
        // 1. Bind Options
        builder.Services.AddOptions<EmbeddingsOptions>()
            .Bind(builder.Configuration.GetSection("Embeddings"))
            .ValidateDataAnnotations()
            .ValidateOnStart();

        // 2. Register HttpClients
        builder.Services.AddHttpClient<OllamaEmbeddingsProvider>((sp, http) =>
        {
            var opt = sp.GetRequiredService<IOptions<EmbeddingsOptions>>().Value.Ollama;
            if (!string.IsNullOrWhiteSpace(opt.BaseUrl))
                http.BaseAddress = new Uri(opt.BaseUrl.TrimEnd('/'));
        });

        builder.Services.AddHttpClient<AzureOpenAIEmbeddingsProvider>((sp, http) =>
        {
            var opt = sp.GetRequiredService<IOptions<EmbeddingsOptions>>().Value.AzureOpenAI;
            if (!string.IsNullOrWhiteSpace(opt.Endpoint))
                http.BaseAddress = new Uri(opt.Endpoint.TrimEnd('/'));
        });
        
        builder.Services.AddHttpClient<OpenAIEmbeddingsProvider>((sp, http) =>
        {
             var opt = sp.GetRequiredService<IOptions<EmbeddingsOptions>>().Value.OpenAI;
             http.BaseAddress = new Uri((opt.BaseUrl ?? "https://api.openai.com").TrimEnd('/'));
        });

        // 3. Register TokenCredential for Azure (only used when UseManagedIdentity=true)
        var useMi = builder.Configuration.GetValue<bool>("Embeddings:AzureOpenAI:UseManagedIdentity");

        if (useMi)
        {
            builder.Services.AddSingleton<TokenCredential>(sp =>
            {
                // Accessing options via IOptions to respect live updates if needed, though credentials usually static
                var opt = sp.GetRequiredService<IOptions<EmbeddingsOptions>>().Value.AzureOpenAI;
                
                var credOpts = new DefaultAzureCredentialOptions();
                if (!string.IsNullOrWhiteSpace(opt.ManagedIdentityClientId))
                    credOpts.ManagedIdentityClientId = opt.ManagedIdentityClientId;

                return new DefaultAzureCredential(credOpts);
            });
        }

        // 4. Factory and Provider
        builder.Services.AddScoped<IEmbeddingsProviderFactory, EmbeddingsProviderFactory>();
        
        builder.Services.AddScoped<IEmbeddingsProvider>(sp => 
        {
            var factory = sp.GetRequiredService<IEmbeddingsProviderFactory>();
            return factory.CreateEmbeddingsProvider();
        });
        
        return builder;
    }

    public static IHostApplicationBuilder AddLLMProvider(this IHostApplicationBuilder builder)
    {
        // 1. Bind Options
        builder.Services.AddOptions<LLMOptions>()
            .Bind(builder.Configuration.GetSection("LLM"))
            .ValidateDataAnnotations()
            .ValidateOnStart();
            
        // 2. Register Factory
        builder.Services.AddScoped<IChatClientFactory, ChatClientFactory>();
        
        // 3. Register Provider
        builder.Services.AddScoped<IChatClientProvider, Rayneforge.Forecast.Infrastructure.Services.ChatClientProvider>();

        // 4. Register Default IChatClient (resolves to Basic for backward compatibility)
        builder.Services.AddScoped<Microsoft.Extensions.AI.IChatClient>(sp =>
        {
            var provider = sp.GetRequiredService<IChatClientProvider>();
            return provider.Basic;
        });

        // 5. Ensure TokenCredential is registered if AzureOpenAI is used (may duplicate generic registration if embeddings also used it, but Safe)
        // Check if Embeddings provider already registered it? 
        // Best practice: TryAddSingleton for TokenCredential if it's not specific to Embeddings.
        // However, we can just rely on the Factory to either use the one from Embeddings or creating new if needed 
        // (but Factory uses new DefaultAzureCredential if not found, or retrieves from SP).
        // Let's just keep it simple as the Factory logic handles missing credential fallback.
        
        return builder;
    }

    public static IHostApplicationBuilder AddAgentService(this IHostApplicationBuilder builder)
    {
        builder.Services.AddScoped<IChatMessageStoreFactory, ChatMessageStoreFactory>();
        // AgentFactory should be scoped or singleton? It depends on IAgentSetup lifetime.
        // User code: AgentFactory(IServiceProvider services) gets all IAgentSetup.
        // If IAgentSetup is Scoped (e.g. relying on scoped services), Factory needs to be Scoped.
        // Let's default to Scoped to be safe.
        builder.Services.AddScoped<AgentFactory>();
        builder.Services.AddScoped<AgentService>();
        
        // Register Agents
        builder.Services.AddScoped<Rayneforge.Forecast.Infrastructure.Abstractions.AgentSetup, Rayneforge.Forecast.Infrastructure.Agents.QueryClassifierAgent>();
        builder.Services.AddScoped<Rayneforge.Forecast.Infrastructure.Abstractions.AgentSetup, Rayneforge.Forecast.Infrastructure.Agents.NarrativeResearchAgent>();

        return builder;
    }
}
