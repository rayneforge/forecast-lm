using System.Security.Claims;
using System.Text.Encodings.Web;
using Microsoft.AspNetCore.Authentication;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace Rayneforge.Forecast.Infrastructure.Authentication;

/// <summary>
/// Development-only authentication handler that reads identity from
/// <c>X-Dev-User</c> and <c>X-Dev-Roles</c> request headers.
///
/// <para>
/// The frontend dev mode sends these headers instead of a real Bearer
/// token, keeping the auth flow structurally similar to production
/// (header-based) without requiring MSAL / Entra infrastructure.
/// </para>
///
/// <para>
/// <b>Never enable in production.</b>  Gate registration behind
/// <c>IsDevelopment()</c> and the <c>DevAuth:Enabled</c> config flag.
/// </para>
/// </summary>
public class DevHeaderAuthHandler(
    IOptionsMonitor<AuthenticationSchemeOptions> options,
    ILoggerFactory logger,
    UrlEncoder encoder)
    : AuthenticationHandler<AuthenticationSchemeOptions>(options, logger, encoder)
{
    public const string SchemeName = "DevHeader";

    protected override Task<AuthenticateResult> HandleAuthenticateAsync()
    {
        var user = Request.Headers["X-Dev-User"].FirstOrDefault();

        if (string.IsNullOrWhiteSpace(user))
        {
            return Task.FromResult(AuthenticateResult.NoResult());
        }

        var roles = Request.Headers["X-Dev-Roles"]
            .FirstOrDefault()?
            .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
            ?? ["user"];

        var claims = new List<Claim>
        {
            new(ClaimTypes.NameIdentifier, user),
            new(ClaimTypes.Name, user),
            new(ClaimTypes.Email, user),
        };

        foreach (var role in roles)
        {
            claims.Add(new Claim(ClaimTypes.Role, role));
        }

        var identity = new ClaimsIdentity(claims, SchemeName);
        var principal = new ClaimsPrincipal(identity);
        var ticket = new AuthenticationTicket(principal, SchemeName);

        Logger.LogDebug("DevHeader auth: authenticated as {User} with roles [{Roles}]",
            user, string.Join(", ", roles));

        return Task.FromResult(AuthenticateResult.Success(ticket));
    }
}
