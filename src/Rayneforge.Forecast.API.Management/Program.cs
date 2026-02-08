using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Builder;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Rayneforge.Forecast.Infrastructure.Authentication;
using Rayneforge.Forecast.Infrastructure.Extensions;

var builder = WebApplication.CreateBuilder(args);

// Add service defaults & Aspire client integrations.
builder.AddServiceDefaults();

// Add services to the container.
builder.Services.AddControllers();
builder.Services.AddOpenApi();

// Add Infrastructure services
builder.AddNewsRepository();

// ─── Authentication & Authorization ──────────────────────────────
var devAuthEnabled = builder.Environment.IsDevelopment()
    && builder.Configuration.GetValue<bool>("DevAuth:Enabled");

var authBuilder = builder.Services
    .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        var instance = builder.Configuration["AzureAd:Instance"] ?? "https://login.microsoftonline.com/";
        var tenantId = builder.Configuration["AzureAd:TenantId"] ?? "";
        options.Authority = $"{instance.TrimEnd('/')}/{tenantId}/v2.0";
        options.Audience = builder.Configuration["AzureAd:ClientId"] ?? "";
        options.TokenValidationParameters.ValidIssuer =
            $"{instance.TrimEnd('/')}/{tenantId}/v2.0";

        if (builder.Environment.IsDevelopment())
        {
            options.RequireHttpsMetadata = false;
        }
    });

if (devAuthEnabled)
{
    authBuilder.AddScheme<AuthenticationSchemeOptions, DevHeaderAuthHandler>(
        DevHeaderAuthHandler.SchemeName, _ => { });
}

builder.Services.AddAuthorization(options =>
{
    // Default policy: any authenticated user
    var defaultPolicy = new Microsoft.AspNetCore.Authorization.AuthorizationPolicyBuilder()
        .RequireAuthenticatedUser();

    if (devAuthEnabled)
    {
        defaultPolicy.AddAuthenticationSchemes(
            JwtBearerDefaults.AuthenticationScheme,
            DevHeaderAuthHandler.SchemeName);
    }

    options.DefaultPolicy = defaultPolicy.Build();

    // Management policy: requires "admin" role
    var managementPolicy = new Microsoft.AspNetCore.Authorization.AuthorizationPolicyBuilder()
        .RequireAuthenticatedUser()
        .RequireRole("admin");

    if (devAuthEnabled)
    {
        managementPolicy.AddAuthenticationSchemes(
            JwtBearerDefaults.AuthenticationScheme,
            DevHeaderAuthHandler.SchemeName);
    }

    options.AddPolicy("Management", managementPolicy.Build());
});

var app = builder.Build();

app.MapDefaultEndpoints();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.UseHttpsRedirection();
app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

app.Run();
