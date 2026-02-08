namespace Rayneforge.Forecast.Infrastructure.Services;

using Microsoft.Extensions.AI;
using Rayneforge.Forecast.Domain.Models;
using Rayneforge.Forecast.Infrastructure.Abstractions;

public class ChatClientProvider : IChatClientProvider
{
    private readonly IChatClientFactory _factory;
    private IChatClient? _basic;
    private IChatClient? _lite;
    private readonly object _lock = new();

    public ChatClientProvider(IChatClientFactory factory)
    {
        _factory = factory;
    }

    public IChatClient Basic
    {
        get
        {
            if (_basic == null)
            {
                lock (_lock)
                {
                    _basic ??= _factory.CreateChatClient(LLMTier.Basic);
                }
            }
            return _basic;
        }
    }

    public IChatClient Lite 
    {
        get
        {
            if (_lite == null)
            {
                lock (_lock)
                {
                    _lite ??= _factory.CreateChatClient(LLMTier.Lite);
                }
            }
            return _lite;
        }
    }
}
