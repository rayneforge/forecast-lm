namespace Rayneforge.Forecast.Infrastructure.Abstractions;

/// <summary>
/// Abstraction for publishing and subscribing to messages across worker functions.
/// Follows the provider pattern — implementations may be Azure Service Bus, 
/// in-memory queues, RabbitMQ, etc.
/// </summary>
public interface IMessageBus
{
    /// <summary>Send a single message to the named queue.</summary>
    Task SendAsync<T>(string queueName, T message, CancellationToken ct = default) where T : class;

    /// <summary>Send a batch of messages to the named queue.</summary>
    Task SendBatchAsync<T>(string queueName, IEnumerable<T> messages, CancellationToken ct = default) where T : class;
}
