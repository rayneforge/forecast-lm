using Azure.Messaging.ServiceBus.Administration;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Builder;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Rayneforge.Forecast.Infrastructure.Data;
using Rayneforge.Forecast.Infrastructure.Extensions;

var builder = FunctionsApplication.CreateBuilder(args);

builder.AddServiceDefaults();

builder.ConfigureFunctionsWebApplication();

// Infrastructure
builder.AddNewsProvider();
builder.AddNewsRepository();
builder.AddEmbeddingsProvider();
builder.AddLLMProvider();
builder.AddMessageBus();
builder.AddUserStore();
builder.AddAgentService();

builder.Services
    .ConfigureFunctionsApplicationInsights();

if (!string.IsNullOrEmpty(builder.Configuration["APPLICATIONINSIGHTS_CONNECTION_STRING"]))
{
    builder.Services.AddApplicationInsightsTelemetryWorkerService();
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

var host = builder.Build();

// Ensure the queue exists in Development (fixes emulator timing issues)
if (Tools.IsDevelopment())
{
    try
    {
        var connStr = builder.Configuration["ServiceBusConnection"];
        if (!string.IsNullOrEmpty(connStr))
        {
            var adminClient = new ServiceBusAdministrationClient(connStr);
            var queueName = HostApplicationBuilderExtensions.AssessArticleQueue;
            
            if (!await adminClient.QueueExistsAsync(queueName))
            {
                await adminClient.CreateQueueAsync(queueName);
                Console.WriteLine($"[Bootstrap] Created queue '{queueName}' to ensure worker startup.");
            }
        }
    }
    catch (Exception ex)
    {
        Console.WriteLine($"[Bootstrap] Warning: Could not auto-create queue: {ex.Message}");
    }
}

host.Run();

public static class Tools {
    public static bool IsDevelopment() => 
        Environment.GetEnvironmentVariable("AZURE_FUNCTIONS_ENVIRONMENT") == "Development" 
        || Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") == "Development";
}
