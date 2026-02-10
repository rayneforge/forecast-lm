var builder = DistributedApplication.CreateBuilder(args);

// ─── Provider switches (appsettings → env) ──────────────────────
var databaseProvider = builder.Configuration["Providers:Database"] ?? "sqlite";
var newsProvider = builder.Configuration["Providers:News"] ?? "mock";
var embeddingProvider = builder.Configuration["Providers:Embedding"] ?? "ollama";
var llmProvider = builder.Configuration["Providers:LLM"] ?? "ollama";
var messageBusProvider = builder.Configuration["Providers:MessageBus"] ?? "azureservicebus";

// ─── 1. Key Vault (secrets) ─────────────────────────────────────
// Secrets (API keys, connection strings) are stored in Key Vault.
// Each consuming project calls builder.Configuration.AddAzureKeyVaultSecrets("kv")
// in its Program.cs — Aspire wires the vault URI via WithReference.
//
// Expected secrets in the vault:
//   newsapi-apikey        → binds to NewsApi:ApiKey
//   llm-openai-apikey     → binds to LLM:OpenAI:ApiKey
//   llm-aoai-apikey       → binds to LLM:AzureOpenAI:ApiKey  (if not using MI)
//   embed-openai-apikey   → binds to Embeddings:OpenAI:ApiKey
//   embed-aoai-apikey     → binds to Embeddings:AzureOpenAI:ApiKey (if not using MI)
//
// For local dev, use User Secrets or appsettings.Development.json instead.
// Uncomment the block below when deploying to Azure:

// var keyVault = builder.AddAzureKeyVault("kv");

// ─── 2. Blob Storage ────────────────────────────────────────────
var storage = builder.AddAzureStorage("storage")
    .RunAsEmulator();

var blobs = storage.AddBlobs("blobs");

// ─── 3. Projects ────────────────────────────────────────────────
var clientApi = builder.AddProject<Projects.Rayneforge_Forecast_API_Client>("client-api")
    .WithReference(blobs)
    .WithEnvironment("Providers__Database", databaseProvider)
    .WithEnvironment("Providers__News", newsProvider)
    .WithEnvironment("Providers__Embedding", embeddingProvider)
    .WithEnvironment("Providers__LLM", llmProvider)
    .WithEnvironment("Mcp__Transport", "sse")
    .WithEnvironment("AzureAd__Instance", builder.Configuration["AzureAd:Instance"] ?? "")
    .WithEnvironment("AzureAd__TenantId", builder.Configuration["AzureAd:TenantId"] ?? "")
    .WithEnvironment("AzureAd__ClientId", builder.Configuration["AzureAd:ClientId"] ?? "");
    // .WithReference(keyVault);    // ← uncomment for Key Vault

var managementApi = builder.AddProject<Projects.Rayneforge_Forecast_API_Management>("management-api")
    .WithEnvironment("Providers__Database", databaseProvider)
    .WithEnvironment("AzureAd__Instance", builder.Configuration["AzureAd:Instance"] ?? "")
    .WithEnvironment("AzureAd__TenantId", builder.Configuration["AzureAd:TenantId"] ?? "")
    .WithEnvironment("AzureAd__ClientId", builder.Configuration["AzureAd:ClientId"] ?? "");
    // .WithReference(keyVault);    // ← uncomment for Key Vault

// ─── 3a. Web UI ─────────────────────────────────────────────────
if (!builder.ExecutionContext.IsPublishMode)
{
    // Local dev: pnpm dev server with HMR
    var web = builder.AddExecutable("web", "pnpm", "../Rayneforge.Forecast.UI/apps/public-client")
        .WithArgs("run", "dev")
        .WithReference(clientApi)
        .WithEnvironment("VITE_API_BASE_URL", clientApi.GetEndpoint("http"))
        .WithEnvironment("VITE_AUTH_MODE", "dev")
        .WithHttpEndpoint(env: "PORT")
        .WithExternalHttpEndpoints();
}
else
{
    // Publish: containerized Vite build served by nginx
    var web = builder.AddDockerfile("web", "../Rayneforge.Forecast.UI")
        .WithHttpEndpoint(targetPort: 80)
        .WithExternalHttpEndpoints()
        .WithReference(clientApi);
}

var worker = builder.AddProject<Projects.Rayneforge_Forecast_Worker>("worker")
    .WithReference(blobs)
    .WithEnvironment("AzureWebJobsStorage", blobs.Resource.ConnectionStringExpression)
    .WithEnvironment("Providers__Database", databaseProvider)
    .WithEnvironment("Providers__News", newsProvider)
    .WithEnvironment("NewsApi__ApiKey", builder.Configuration["NewsApi:ApiKey"]) // Inject API Key if present
    .WithEnvironment("Providers__Embedding", embeddingProvider)
    .WithEnvironment("Providers__LLM", llmProvider);
    // .WithReference(keyVault);    // ← uncomment for Key Vault

// ─── 4. SQLite (local dev) ──────────────────────────────────────
if (databaseProvider.Equals("sqlite", StringComparison.OrdinalIgnoreCase))
{
    var basePath = Path.GetFullPath(Path.Combine(builder.Environment.ContentRootPath, "..", ".."));

    var newsConnStr = $"Data Source={Path.Combine(basePath, "news.db")}";
    var userConnStr = $"Data Source={Path.Combine(basePath, "user.db")}";

    clientApi.WithEnvironment("ConnectionStrings__NewsDb", newsConnStr)
             .WithEnvironment("ConnectionStrings__UserDb", userConnStr);

    managementApi.WithEnvironment("ConnectionStrings__NewsDb", newsConnStr)
                 .WithEnvironment("ConnectionStrings__UserDb", userConnStr);

    worker.WithEnvironment("ConnectionStrings__NewsDb", newsConnStr);
}

// ─── 5. Cosmos DB ───────────────────────────────────────────────
if (databaseProvider.Equals("cosmos", StringComparison.OrdinalIgnoreCase))
{
    var cosmos = builder.AddAzureCosmosDB("cosmos");

    var newsDb = cosmos.AddCosmosDatabase("NewsDb");
    newsDb.AddContainer("news", "/id");
    newsDb.AddContainer("entities", "/id");
    newsDb.AddContainer("claims", "/articleId");
    newsDb.AddContainer("narratives", "/id");
    newsDb.AddContainer("claim-entities", "/claimId");
    newsDb.AddContainer("narrative-claims", "/narrativeId");
    newsDb.AddContainer("narrative-entities", "/narrativeId");

    var userDb = cosmos.AddCosmosDatabase("UserDb");
    userDb.AddContainer("threads", "/userId");
    userDb.AddContainer("messages", "/threadId");
    userDb.AddContainer("workspaces", "/userId");
    userDb.AddContainer("workspace-links", "/workspaceId");

    worker.WithReference(newsDb);

    clientApi.WithReference(newsDb)
             .WithReference(userDb);

    managementApi.WithReference(newsDb)
                 .WithReference(userDb);
}

// ─── 6. Azure OpenAI (embeddings + LLM) ────────────────────────
if (embeddingProvider.Equals("azureopenai", StringComparison.OrdinalIgnoreCase)
    || llmProvider.Equals("azureopenai", StringComparison.OrdinalIgnoreCase))
{
    var aoai = builder.AddAzureOpenAI("aoai");

    if (embeddingProvider.Equals("azureopenai", StringComparison.OrdinalIgnoreCase))
    {
        var embeddings = aoai.AddDeployment("embeddings", "text-embedding-3-small", "1");

        clientApi.WithReference(embeddings);
        worker.WithReference(embeddings);
    }

    if (llmProvider.Equals("azureopenai", StringComparison.OrdinalIgnoreCase))
    {
        var chatBasic = aoai.AddDeployment("chat-basic", "gpt-4o", "1");
        var chatLite  = aoai.AddDeployment("chat-lite", "gpt-4o-mini", "1");

        clientApi.WithReference(chatBasic)
                 .WithReference(chatLite);
        worker.WithReference(chatBasic)
              .WithReference(chatLite);

        // Endpoint comes from config (appsettings / user-secrets / Key Vault).
        // WithReference(aoai) wires connection info automatically in production;
        // these env vars bridge to LLMOptions.AzureOpenAI for the IChatClient factory.
        var aoaiEndpoint = builder.Configuration["LLM:AzureOpenAI:Endpoint"] ?? "";

        clientApi.WithEnvironment("LLM__AzureOpenAI__Endpoint", aoaiEndpoint)
                 .WithEnvironment("LLM__AzureOpenAI__BasicDeployment", "chat-basic")
                 .WithEnvironment("LLM__AzureOpenAI__LiteDeployment", "chat-lite")
                 .WithEnvironment("LLM__AzureOpenAI__UseManagedIdentity", "true");

        worker.WithEnvironment("LLM__AzureOpenAI__Endpoint", aoaiEndpoint)
              .WithEnvironment("LLM__AzureOpenAI__BasicDeployment", "chat-basic")
              .WithEnvironment("LLM__AzureOpenAI__LiteDeployment", "chat-lite")
              .WithEnvironment("LLM__AzureOpenAI__UseManagedIdentity", "true");
    }
}

// ─── 7. Service Bus ─────────────────────────────────────────────
if (messageBusProvider.Equals("azureservicebus", StringComparison.OrdinalIgnoreCase))
{
    var serviceBus = builder.AddAzureServiceBus("messaging")
        .RunAsEmulator();

    var processArticleQueue = serviceBus.AddServiceBusQueue("article-ingest");

    // WithReference wires the connection string automatically.
    // The Worker Azure Functions trigger reads "ServiceBusConnection".
    worker.WithReference(serviceBus)
          .WithReference(processArticleQueue) // Ensure dependency so queue is created before worker starts
          .WithEnvironment("ServiceBusConnection", serviceBus.Resource.ConnectionStringExpression)
          .WithEnvironment("Providers__MessageBus", "azureservicebus");
}

builder.Build().Run();
