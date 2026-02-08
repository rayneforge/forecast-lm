namespace Rayneforge.Forecast.Infrastructure.Abstractions;

using Microsoft.Extensions.AI;

public interface IChatClientProvider
{
    IChatClient Basic { get; }
    IChatClient Lite { get; }
}
