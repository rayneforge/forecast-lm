# Authentication & Authorization

This document describes the dual-mode authentication pattern used across the Rayneforge Forecast stack; how it works in development, how it works in production, and why the two modes are structurally similar by design.

---

## Design Goals

1. **Production-ready security** — Entra External ID (CIAM) with PKCE auth-code flow.
2. **Frictionless local dev** — No real identity provider needed; synthetic headers bypass MSAL but still flow through ASP.NET middleware.
3. **Structural parity** — Both modes use HTTP headers and the standard `ClaimsPrincipal` pipeline, so controllers never branch on environment.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│  React SPA  (public-client)                                     │
│                                                                 │
│  VITE_AUTH_MODE=dev        │  VITE_AUTH_MODE=(unset/prod)       │
│  ─────────────────         │  ────────────────────────          │
│  DevAuthProvider           │  MsalProvider                      │
│  • synthetic user          │  • loginRedirect (PKCE)            │
│  • X-Dev-User header       │  • Bearer token via acquireToken   │
│  • X-Dev-Roles header      │    Silent                          │
└──────────────┬─────────────┴──────────────┬─────────────────────┘
               │                            │
               ▼                            ▼
┌─────────────────────────────────────────────────────────────────┐
│  ASP.NET Core  (Client API / Management API)                    │
│                                                                 │
│  Scheme 1: JwtBearer (default)                                  │
│    → Validates Entra-issued access tokens                       │
│    → RequireHttpsMetadata=false in Development                  │
│                                                                 │
│  Scheme 2: DevHeader (Development only)                         │
│    → Reads X-Dev-User / X-Dev-Roles                             │
│    → Builds ClaimsPrincipal with NameIdentifier + Role claims   │
│    → Gated: IsDevelopment() && DevAuth:Enabled == true          │
│                                                                 │
│  Authorization Policy:                                          │
│    Default  → RequireAuthenticatedUser (either scheme)          │
│    Management → RequireAuthenticatedUser + RequireRole("admin") │
└─────────────────────────────────────────────────────────────────┘
```

---

## Frontend

### Packages

| Package | Purpose |
|---|---|
| `@azure/msal-browser` | MSAL 2.0 single-page app library |
| `@azure/msal-react` | React bindings (`MsalProvider`, `useMsal`) |

### Key Files

| File | Role |
|---|---|
| `apps/public-client/src/auth/msalConfig.ts` | MSAL `Configuration` object; reads `VITE_ENTRA_CLIENT_ID`, `VITE_ENTRA_AUTHORITY`; exports `isDev` flag |
| `apps/public-client/src/auth/AuthProvider.tsx` | Dual-mode provider; wraps children in `DevAuthProvider` or `MsalProvider` + `MsalAuthInner` |
| `apps/public-client/src/auth/RequireAuth.tsx` | Route guard; triggers `loginRedirect` if unauthenticated |
| `apps/public-client/src/auth/index.ts` | Barrel exports |

### AuthContext Shape

```ts
interface AuthContextValue {
    isAuthenticated: boolean;
    user: AuthUser | null;       // { id, name, email, roles }
    login: () => void;           // loginRedirect in prod, no-op in dev
    logout: () => void;
    getAuthHeaders: () => Promise<Record<string, string>>;
    isLoading: boolean;          // true while MSAL redirect is in-flight
}
```

### Mode Selection

Controlled by **`VITE_AUTH_MODE`** environment variable:

| Value | Behavior |
|---|---|
| `"dev"` | `DevAuthProvider` — synthetic user, sends `X-Dev-User` / `X-Dev-Roles` headers |
| anything else / unset | `MsalProvider` — real Entra CIAM authentication |

AppHost sets `VITE_AUTH_MODE=dev` for the web executable. Production builds read from `.env.production` where the variable is not set.

### Route Structure

| Route | Access | Component |
|---|---|---|
| `/` | Public | `LandingPage` — sign-in CTA; redirects to `/home` if already authenticated |
| `/home` | Protected | `HomePage` — news feed with search |
| `/workspace` | Protected | `WorkspacePage` — canvas/newsspace |

### API Client Integration

`NewsClient` (in `@rayneforge/logic`) accepts an optional `AuthHeaderProvider` callback:

```ts
type AuthHeaderProvider = () => Promise<Record<string, string>>;

const client = new NewsClient(apiBaseUrl, getAuthHeaders);
```

Every `fetch` call goes through `fetchWithAuth()` which invokes the callback and merges the returned headers. In dev mode this produces `X-Dev-User` / `X-Dev-Roles`; in prod it produces `Authorization: Bearer <token>`.

---

## Backend

### DevHeaderAuthHandler

`Infrastructure/Authentication/DevHeaderAuthHandler.cs`

A custom `AuthenticationHandler<AuthenticationSchemeOptions>` that:

1. Reads `X-Dev-User` from the request header.
2. If present, reads `X-Dev-Roles` (comma-separated, defaults to `"user"`).
3. Builds a `ClaimsPrincipal` with `NameIdentifier`, `Name`, `Email`, and `Role` claims.
4. Returns `AuthenticateResult.Success`.
5. If `X-Dev-User` is absent, returns `AuthenticateResult.NoResult()` (falls through to JwtBearer).

**Registration guard** — the scheme is only added when both conditions are true:
```csharp
var devAuthEnabled = builder.Environment.IsDevelopment()
    && builder.Configuration.GetValue<bool>("DevAuth:Enabled");
```

### Authentication Schemes

| Scheme | When | Validates |
|---|---|---|
| `JwtBearer` (default) | Always registered | Entra-issued access tokens (audience, issuer, signature) |
| `DevHeader` | Development + `DevAuth:Enabled` | `X-Dev-User` / `X-Dev-Roles` headers |

The authorization default policy includes both schemes when dev auth is enabled, so ASP.NET tries JwtBearer first and falls back to DevHeader.

### Authorization Policies

| Policy | Requirement | Applied to |
|---|---|---|
| Default | `RequireAuthenticatedUser` | All `[Authorize]` controllers |
| `Management` | `RequireAuthenticatedUser` + `RequireRole("admin")` | `MigrationsController` |

### Controller Changes

All controllers carry `[Authorize]`. `AgentsController` and `ThreadsController` read userId from `ClaimsPrincipal`:

```csharp
var userId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;
```

The `UserId` field was removed from request DTOs (`RunAgentRequest`, `ChatRequest`) and `ThreadsController` no longer takes `userId` as a query parameter.

---

## Configuration

### Client API — `appsettings.json`

```json
{
  "AzureAd": {
    "Instance": "https://login.microsoftonline.com/",
    "TenantId": "",
    "ClientId": ""
  }
}
```

### Client API — `appsettings.Development.json`

```json
{
  "DevAuth": { "Enabled": true }
}
```

### Management API

Same structure. Additionally defines the `"Management"` policy requiring the `"admin"` role.

### AppHost Wiring

```csharp
// Auth config → APIs
.WithEnvironment("AzureAd__Instance", ...)
.WithEnvironment("AzureAd__TenantId", ...)
.WithEnvironment("AzureAd__ClientId", ...)

// Auth mode → SPA
.WithEnvironment("VITE_AUTH_MODE", "dev")
```

### Frontend Env Files

| File | Tracked | Purpose |
|---|---|---|
| `.env.development` | Yes | Sets `VITE_AUTH_MODE=dev` |
| `.env.production` | Yes | Template with Entra placeholders |
| `.env.local` | No (gitignored) | Personal overrides |

---

## Security Considerations

1. **DevHeader is never registered in production** — double-gated on `IsDevelopment()` plus explicit config flag.
2. **RequireHttpsMetadata** is only relaxed in Development (empty authority would otherwise throw).
3. **CORS** is `AllowAnyOrigin` in development only — production should restrict to the deployed SPA origin.
4. **loginRedirect** (not popup) was chosen for PWA / mobile / VR compatibility.
5. **Token refresh** — `acquireTokenSilent` is attempted first; on failure the user is redirected to sign in again.

---

## Adding a New Protected Route

1. Add the route in `App.tsx` wrapped in `<RequireAuth>`.
2. If the page calls the API, use `useAuth().getAuthHeaders` to construct an authenticated client.
3. No backend changes needed — the `[Authorize]` attribute + dual-scheme setup handles both modes automatically.

## Adding a New API Scope / Policy

1. Define the policy in `Program.cs` under `AddAuthorization(options => ...)`.
2. Apply `[Authorize(Policy = "YourPolicy")]` to the controller or action.
3. In dev mode, set the required role in the `X-Dev-Roles` header (the dev auth provider defaults to `user,admin`).
4. In production, configure the role in the Entra app registration's App Roles manifest.
