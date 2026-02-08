namespace Rayneforge.Forecast.Infrastructure.Services;

using System.Text.Json;
using Azure.Identity;
using Azure.Messaging.ServiceBus;
using Microsoft.Extensions.Options;
using Rayneforge.Forecast.Infrastructure.Abstractions;
using Rayneforge.Forecast.Infrastructure.Options;

/// <summary>
/// Azure Service Bus implementation of <see cref="IMessageBus"/>.
/// Supports both connection-string and managed-identity auth.
/// </summary>
public sealed class AzureServiceBusMessageBus : IMessageBus, IAsyncDisposable
{
    private readonly ServiceBusClient _client;

    public AzureServiceBusMessageBus(IOptions<MessageBusOptions> options)
    {
        var opt = options.Value.AzureServiceBus;

        if (opt.UseManagedIdentity && !string.IsNullOrWhiteSpace(opt.Namespace))
        {
            var credOpts = new DefaultAzureCredentialOptions();
            if (!string.IsNullOrWhiteSpace(opt.ManagedIdentityClientId))
                credOpts.ManagedIdentityClientId = opt.ManagedIdentityClientId;

            _client = new ServiceBusClient(opt.Namespace, new DefaultAzureCredential(credOpts));
        }
        else if (!string.IsNullOrWhiteSpace(opt.ConnectionString))
        {
            _client = new ServiceBusClient(opt.ConnectionString);
        }
        else
        {
            throw new InvalidOperationException(
                "Azure Service Bus requires either a ConnectionString or Namespace + UseManagedIdentity.");
        }
    }

    public async Task SendAsync<T>(string queueName, T message, CancellationToken ct = default) where T : class
    {
        await using var sender = _client.CreateSender(queueName);
        var body = JsonSerializer.Serialize(message);
        await sender.SendMessageAsync(new ServiceBusMessage(body), ct);
    }

    public async Task SendBatchAsync<T>(string queueName, IEnumerable<T> messages, CancellationToken ct = default) where T : class
    {
        await using var sender = _client.CreateSender(queueName);
        using var batch = await sender.CreateMessageBatchAsync(ct);

        foreach (var msg in messages)
        {
            var body = JsonSerializer.Serialize(msg);
            if (!batch.TryAddMessage(new ServiceBusMessage(body)))
            {
                // Batch full — send what we have and start a new batch
                await sender.SendMessagesAsync(batch, ct);
                using var newBatch = await sender.CreateMessageBatchAsync(ct);
                if (!newBatch.TryAddMessage(new ServiceBusMessage(body)))
                    throw new InvalidOperationException("Single message too large for Service Bus batch.");
            }
        }

        if (batch.Count > 0)
            await sender.SendMessagesAsync(batch, ct);
    }

    public async ValueTask DisposeAsync()
    {
        await _client.DisposeAsync();
    }
}
