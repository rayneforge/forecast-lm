using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Rayneforge.Forecast.Infrastructure.Data;

namespace Rayneforge.Forecast.API.Management.Controllers;

[ApiController]
[Authorize(Policy = "Management")]
[Route("migrations")]
public class MigrationsController(IServiceProvider serviceProvider, IConfiguration configuration) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetMigrations()
    {
        var provider = configuration["Providers:Database"] ?? "sqlite";
        if (!provider.Equals("sqlite", StringComparison.OrdinalIgnoreCase))
        {
            return BadRequest($"Migrations are only supported for SQLite. Current provider: {provider}");
        }

        // Create a scope because DbContext is Scoped
        using var scope = serviceProvider.CreateScope();
        var db = scope.ServiceProvider.GetService<SqliteNewsDbContext>();

        if (db == null)
        {
             return StatusCode(StatusCodes.Status500InternalServerError, "Database context is null");
        }
        
        var applied = await db.Database.GetAppliedMigrationsAsync();
        var pending = await db.Database.GetPendingMigrationsAsync();
        
        return Ok(new { Applied = applied, Pending = pending });
    }

    [HttpPost]
    public async Task<IActionResult> RunMigrations()
    {
        var provider = configuration["Providers:Database"] ?? "sqlite";
        if (!provider.Equals("sqlite", StringComparison.OrdinalIgnoreCase))
        {
            return BadRequest($"Migrations are only supported for SQLite. Current provider: {provider}");
        }

        using var scope = serviceProvider.CreateScope();
        var db = scope.ServiceProvider.GetService<SqliteNewsDbContext>();
        
        if (db == null)
        {
             return StatusCode(StatusCodes.Status500InternalServerError, "Database context is null");
        }
        
        var pending = await db.Database.GetPendingMigrationsAsync();
        if (!pending.Any())
        {
            return Ok("No pending migrations.");
        }
        
        await db.Database.MigrateAsync();
        
        return Ok($"Applied migrations: {string.Join(", ", pending)}");
    }
}
