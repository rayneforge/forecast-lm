namespace Rayneforge.Forecast.Infrastructure.Options;

public sealed class MessageBusOptions
{
    public const string SectionName = "MessageBus";

    public AzureServiceBusOptions AzureServiceBus { get; set; } = new();
}

public sealed class AzureServiceBusOptions
{
    /// <summary>Full connection string — mutually exclusive with <see cref="Namespace"/>.</summary>
    public string? ConnectionString { get; set; }

    /// <summary>Fully-qualified namespace (e.g. "myns.servicebus.windows.net") for Managed Identity auth.</summary>
    public string? Namespace { get; set; }

    /// <summary>Use DefaultAzureCredential instead of a connection string key.</summary>
    public bool UseManagedIdentity { get; set; }

    public string? ManagedIdentityClientId { get; set; }
}
