using System;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.OData;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Rayneforge.Forecast.Infrastructure.Authentication;
using Rayneforge.Forecast.Infrastructure.Extensions;

var builder = WebApplication.CreateBuilder(args);

builder.AddServiceDefaults();

// Add Application Insights Telemetry (only when connection string is configured)
if (!string.IsNullOrEmpty(builder.Configuration["APPLICATIONINSIGHTS_CONNECTION_STRING"]))
{
    builder.Services.AddApplicationInsightsTelemetry();
}
else
{
    // Register a default TelemetryClient to prevent DI failures in services that depend on it
    builder.Services.AddSingleton(new Microsoft.ApplicationInsights.Extensibility.TelemetryConfiguration 
    { 
        ConnectionString = "InstrumentationKey=00000000-0000-0000-0000-000000000000;",
        DisableTelemetry = true 
    });
    builder.Services.AddSingleton<Microsoft.ApplicationInsights.TelemetryClient>();
}

// Configure all logs to go to stderr (stdout is used for the MCP protocol messages).
builder.Logging.ClearProviders(); 
builder.Logging.AddConsole(o => o.LogToStandardErrorThreshold = LogLevel.Trace);

// Register the News Provider infrastructure
builder.AddNewsProvider();
builder.AddNewsRepository();
builder.AddEmbeddingsProvider();
builder.AddLLMProvider();
builder.AddConversationStore();
builder.AddMessageBus();
builder.AddAgentService();

// ─── Authentication & Authorization ──────────────────────────────
var devAuthEnabled = builder.Environment.IsDevelopment()
    && builder.Configuration.GetValue<bool>("DevAuth:Enabled");

var authBuilder = builder.Services
    .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        var instance = builder.Configuration["AzureAd:Instance"] ?? "https://login.microsoftonline.com/";
        var tenantId = builder.Configuration["AzureAd:TenantId"] ?? "";
        options.Authority = $"{instance.TrimEnd('/')}/{tenantId}/v2.0";
        options.Audience = builder.Configuration["AzureAd:ClientId"] ?? "";
        options.TokenValidationParameters.ValidIssuer =
            $"{instance.TrimEnd('/')}/{tenantId}/v2.0";

        if (builder.Environment.IsDevelopment())
        {
            options.RequireHttpsMetadata = false;
        }
    });

if (devAuthEnabled)
{
    authBuilder.AddScheme<AuthenticationSchemeOptions, DevHeaderAuthHandler>(
        DevHeaderAuthHandler.SchemeName, _ => { });
}

builder.Services.AddAuthorization(options =>
{
    var defaultPolicy = new Microsoft.AspNetCore.Authorization.AuthorizationPolicyBuilder()
        .RequireAuthenticatedUser();

    if (devAuthEnabled)
    {
        defaultPolicy.AddAuthenticationSchemes(
            JwtBearerDefaults.AuthenticationScheme,
            DevHeaderAuthHandler.SchemeName);
    }

    options.DefaultPolicy = defaultPolicy.Build();
});

bool isSse = builder.Configuration["Mcp:Transport"]?.Equals("sse", StringComparison.OrdinalIgnoreCase) ?? false;

var mcpBuilder = builder.Services
    .AddMcpServer()
    .WithTools<Rayneforge.Forecast.API.Tools.NewsApiTools>();

if (isSse)
{
    mcpBuilder.WithHttpTransport();
    
    // Add CORS for UI development
    builder.Services.AddCors(options =>
    {
        options.AddDefaultPolicy(policy => 
            policy.AllowAnyOrigin()
                  .AllowAnyMethod()
                  .AllowAnyHeader());
    });

    builder.Services.AddControllers()
        .AddOData(opt => opt.Select().Filter().OrderBy().Count().SetMaxTop(100));
        
    builder.Services.AddEndpointsApiExplorer();
    builder.Services.AddSwaggerGen();
}
else
{
    mcpBuilder.WithStdioServerTransport();
}

var app = builder.Build();

app.MapDefaultEndpoints();

if (isSse)
{
    if (app.Environment.IsDevelopment())
    {
        app.UseSwagger();
        app.UseSwaggerUI();
    }

    app.UseCors();
    app.UseAuthentication();
    app.UseAuthorization();
    app.MapMcp("/mcp");
    app.MapControllers();

    await app.RunAsync();
}
else
{
    // Stdio transport runs as a hosted service
    await app.RunAsync();
}
