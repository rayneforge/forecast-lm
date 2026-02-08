using Microsoft.Extensions.AI;
using Rayneforge.Forecast.Domain.Models;

namespace Rayneforge.Forecast.Infrastructure.Abstractions;

public interface IChatClientFactory
{
    IChatClient CreateChatClient(LLMTier tier);
}
