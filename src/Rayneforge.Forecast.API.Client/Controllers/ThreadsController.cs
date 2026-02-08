using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Rayneforge.Forecast.Infrastructure.Agents;

namespace Rayneforge.Forecast.API.Client.Controllers;

[ApiController]
[Authorize]
[Route("api/[controller]")]
public class ThreadsController(AgentService agentService) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetThreads(CancellationToken ct)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;
        var threads = await agentService.GetThreadsAsync(userId, ct);
        return Ok(threads);
    }

    [HttpGet("{threadId}")]
    public async Task<IActionResult> GetThread(string threadId, CancellationToken ct)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;
        var thread = await agentService.GetThreadAsync(threadId, userId, ct);
        if (thread == null) return NotFound();
        return Ok(thread);
    }

    [HttpDelete("{threadId}")]
    public async Task<IActionResult> DeleteThread(string threadId, CancellationToken ct)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;
        await agentService.DeleteThreadAsync(threadId, userId, ct);
        return NoContent();
    }
}
