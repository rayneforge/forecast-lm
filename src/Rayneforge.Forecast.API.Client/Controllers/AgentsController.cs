using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Rayneforge.Forecast.Domain.Models;
using Rayneforge.Forecast.Infrastructure.Agents;

namespace Rayneforge.Forecast.API.Client.Controllers;

[ApiController]
[Authorize]
[Route("api/[controller]")]
public class AgentsController(AgentService agentService) : ControllerBase
{
    public record RunAgentRequest(
        string Input,
        string? ThreadId = null
    );

    [HttpPost("{agentName}/run")]
    public async Task<IActionResult> RunAgent(
        string agentName, 
        [FromBody] RunAgentRequest request,
        CancellationToken ct)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;

        try
        {
            var response = await agentService.RunAgentAsync(
                agentName,
                request.Input,
                userId,
                request.ThreadId,
                ct);

            return Ok(response);
        }
        catch (KeyNotFoundException)
        {
            return NotFound($"Agent '{agentName}' not found.");
        }
    }

    public record ChatRequest(
        string Message,
        LLMTier Tier = LLMTier.Basic
    );

    [HttpPost("chat")]
    public async Task<IActionResult> Chat([FromBody] ChatRequest request, CancellationToken ct)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;

        var response = await agentService.ChatAsync(
            request.Message,
            userId,
            request.Tier,
            ct);

        return Ok(response);
    }
}
