# UI Architecture & App Host Integration

> How the Rayneforge Forecast frontend is structured, how it connects to the .NET Aspire App Host, and how to add new UI applications.

---

## 1. Monorepo Overview

The entire frontend lives under `src/Rayneforge.Forecast.UI/` and is managed as a **pnpm workspace monorepo**.

```
Rayneforge.Forecast.UI/
├── package.json              ← root scripts (dev, build, storybook)
├── pnpm-workspace.yaml       ← declares apps/* and packages/*
├── apps/
│   ├── public-client/        ← main SPA (Vite + React)
│   └── storybook/            ← component gallery (Storybook 8)
├── packages/
│   ├── logic/                ← @rayneforge/logic — shared types & hooks
│   ├── styles/               ← @rayneforge/styles — SCSS design tokens & mixins
│   └── ui/                   ← @rayneforge/ui — reusable React components
└── src/                      ← (reserved / miscellaneous)
```

### Workspace configuration

**pnpm-workspace.yaml** declares which directories contain workspace packages:

```yaml
packages:
  - "apps/*"
  - "packages/*"
```

Every folder inside `apps/` and `packages/` that contains a `package.json` is a workspace member. Internal dependencies use the `workspace:*` protocol:

```json
{
  "dependencies": {
    "@rayneforge/logic": "workspace:*",
    "@rayneforge/styles": "workspace:*",
    "@rayneforge/ui": "workspace:*"
  }
}
```

### Root scripts

The root `package.json` provides convenience scripts that delegate to specific apps:

| Script | Command | Purpose |
|--------|---------|---------|
| `dev` | `pnpm -C apps/public-client dev` | Start the main SPA in dev mode |
| `build` | `pnpm -C apps/public-client build` | Production build of the SPA |
| `test` | `pnpm -r --filter ./packages/logic test` | Run unit tests in the logic package |
| `storybook` | `pnpm -C apps/storybook storybook` | Start Storybook on port 6006 |

---

## 2. Shared Packages

### `@rayneforge/logic`

**Location:** `packages/logic/`

Shared TypeScript types, interfaces, and hooks used across all apps. Contains domain models (`NewsArticle`, `Entity`, `Narrative`, `Claim`, etc.) and API client utilities. Any app can import from here to stay in sync with the domain.

### `@rayneforge/styles`

**Location:** `packages/styles/`

SCSS foundation: design tokens (`_design-tokens.scss`) and mixins (`_mixins.scss`). Exported via `_index.scss` using `@forward`. Apps and components import the token layer with:

```scss
@use '@rayneforge/styles' as *;
```

Key tokens include canvas colors, accent colors, spacing (4 px grid), radius, typography, and elevation values.

### `@rayneforge/ui`

**Location:** `packages/ui/`

The component library. Exports all reusable React components, canvas system hooks, and page-level layouts. Includes:

- **Standard components:** `NewsCard`, `Chip`, `TopBar`, `LensPanel`, `StoryStrip`, `PinnedBoard`, `FloatingSearchBar`, `ConnectorBand`
- **Canvas 2D system:** `FreeCanvasView`, `TimelineView`, `LinearView`, `ArticleNode`, `NoteNode`, `EntityNode`, `TopicBubble`, `GroupFrame`, `CanvasEdges`, `NarrativePane`
- **Canvas 3D system (Three.js):** `ThreeCanvasView`, `ArticleNode3D`, `NoteNode3D`, `EntityNode3D`, `TopicBubble3D`, `GroupFrame3D`, `EdgeLines3D`, `NarrativePanel3D`
- **Page compositions:** `CanvasPage`, `NewsFeedPage`

All exports are barrel-exported from `packages/ui/src/index.ts`.

---

## 3. Existing Apps

### `public-client` — Main SPA

| Property | Value |
|----------|-------|
| **Package name** | `rayneforge-public-client` |
| **Framework** | React 19 + React Router 7 |
| **Bundler** | Vite 5 |
| **Auth** | MSAL / Entra External ID (CIAM) — bypassed in dev mode |
| **PWA** | Enabled via `vite-plugin-pwa` |
| **Port** | `process.env.PORT` or `5173` |

**Entry point flow:**

1. `index.html` loads `src/main.tsx`
2. `main.tsx` calls `initializeAuth()`, then renders `<AuthProvider><App /></AuthProvider>`
3. `App.tsx` sets up React Router with lazy-loaded pages:
   - `/` → `LandingPage` (public)
   - `/home` → `HomePage` (protected behind `<RequireAuth>`)
   - `/workspace` → `WorkspacePage` (protected)

**Environment variables** (prefixed `VITE_`):

| Variable | Dev default | Production | Purpose |
|----------|-------------|------------|---------|
| `VITE_AUTH_MODE` | `dev` | *(unset → MSAL)* | Bypass auth in dev |
| `VITE_API_BASE_URL` | Injected by Aspire | Deployment value | Client API endpoint |
| `VITE_ENTRA_CLIENT_ID` | — | SPA client ID | Entra CIAM app registration |
| `VITE_ENTRA_AUTHORITY` | — | Authority URL | Entra CIAM tenant |

### `storybook` — Component Gallery

| Property | Value |
|----------|-------|
| **Package name** | `rayneforge-storybook` |
| **Framework** | Storybook 8 with `@storybook/react-vite` |
| **Port** | `6006` (default) |

Discovers stories from `packages/ui/src/**/*.stories.tsx`. Depends on `@rayneforge/ui` and `@rayneforge/styles` so all components render with real tokens.

---

## 4. App Host Integration (Aspire)

The .NET Aspire App Host (`src/Rayneforge.Forecast.AppHost/AppHost.cs`) orchestrates all backend services **and** the frontend dev server.

### How `public-client` is wired

```csharp
var web = builder.AddExecutable("web", "pnpm", "../Rayneforge.Forecast.UI/apps/public-client")
    .WithArgs("run", "dev")
    .WithReference(clientApi)
    .WithEnvironment("VITE_API_BASE_URL", clientApi.GetEndpoint("http"))
    .WithEnvironment("VITE_AUTH_MODE", "dev")
    .WithHttpEndpoint(env: "PORT")
    .WithExternalHttpEndpoints();
```

**What each line does:**

| Call | Purpose |
|------|---------|
| `AddExecutable("web", "pnpm", workingDir)` | Registers a non-.NET process. Aspire runs `pnpm` in the `apps/public-client` directory. |
| `.WithArgs("run", "dev")` | Passes `run dev` to pnpm → launches `vite` in dev mode. |
| `.WithReference(clientApi)` | Declares a dependency on the Client API project so Aspire starts it first. |
| `.WithEnvironment("VITE_API_BASE_URL", clientApi.GetEndpoint("http"))` | Injects the dynamically-allocated API URL. Vite picks this up as `import.meta.env.VITE_API_BASE_URL`. |
| `.WithEnvironment("VITE_AUTH_MODE", "dev")` | Overrides auth to dev-bypass mode during local Aspire runs. |
| `.WithHttpEndpoint(env: "PORT")` | Aspire allocates a port and sets `PORT` env var. Vite's config reads `process.env.PORT` for `server.port`. |
| `.WithExternalHttpEndpoints()` | Exposes the Vite dev server on the Aspire dashboard so you can open it directly. |

### Critical Vite config for Aspire

The Vite config in `apps/public-client/vite.config.ts` has two settings essential for Aspire integration:

```typescript
server: {
  host: true,          // binds to 0.0.0.0 so Aspire's proxy can reach it
  port: parseInt(process.env.PORT ?? "5173"),
  strictPort: true,    // fails if port is in use — Aspire needs deterministic ports
}
```

---

## 5. Adding a New UI App

Follow these steps to add a new frontend application (e.g., an admin dashboard, a mobile-web client, or a docs site) to the monorepo and wire it into the App Host.

### Step 1 — Scaffold the app

Create a new directory under `apps/`:

```
apps/
  admin-dashboard/       ← new app
    index.html
    package.json
    tsconfig.json
    vite.config.ts
    src/
      main.tsx
      App.tsx
      style.scss
```

### Step 2 — Create `package.json`

```json
{
  "name": "rayneforge-admin-dashboard",
  "private": true,
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "@rayneforge/logic": "workspace:*",
    "@rayneforge/styles": "workspace:*",
    "@rayneforge/ui": "workspace:*",
    "react": "^19.2.4",
    "react-dom": "^19.2.4",
    "react-router-dom": "^7.13.0"
  },
  "devDependencies": {
    "@types/react": "^19.2.13",
    "@types/react-dom": "^19.2.3",
    "@vitejs/plugin-react": "^5.1.3",
    "sass": "^1.71.1",
    "typescript": "^5.3.3",
    "vite": "^5.1.4"
  }
}
```

Key points:
- Reference shared packages with `workspace:*`
- Keep `"type": "module"` for ESM
- Add or remove shared packages based on what the app needs

### Step 3 — Create `vite.config.ts` (Aspire-compatible)

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  clearScreen: false,
  server: {
    host: true,                                    // bind 0.0.0.0 for Aspire
    port: parseInt(process.env.PORT ?? "5174"),    // pick a unique fallback port
    strictPort: true,                              // Aspire needs deterministic ports
  },
  envPrefix: ['VITE_'],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: true,
  },
});
```

> **Required for Aspire:** `host: true`, `strictPort: true`, and reading `process.env.PORT`.

### Step 4 — Create `tsconfig.json`

```jsonc
{
  "compilerOptions": {
    "target": "ESNext",
    "useDefineForClassFields": true,
    "lib": ["DOM", "DOM.Iterable", "ESNext"],
    "allowJs": false,
    "skipLibCheck": true,
    "esModuleInterop": false,
    "allowSyntheticDefaultImports": true,
    "strict": true,
    "forceConsistentCasingInFileNames": true,
    "module": "ESNext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx"
  },
  "include": ["src"]
}
```

### Step 5 — Install dependencies

From the UI monorepo root:

```bash
pnpm install
```

pnpm will automatically link the workspace dependencies.

### Step 6 — Register in the App Host

In `src/Rayneforge.Forecast.AppHost/AppHost.cs`, add the new executable alongside the existing `web` entry:

```csharp
// ─── Admin Dashboard ─────────────────────────────────────────────
var adminDashboard = builder.AddExecutable(
        "admin-dashboard",                              // resource name (Aspire dashboard)
        "pnpm",                                         // executable
        "../Rayneforge.Forecast.UI/apps/admin-dashboard" // working directory
    )
    .WithArgs("run", "dev")
    .WithReference(managementApi)                       // depends on the Management API
    .WithEnvironment("VITE_API_BASE_URL", managementApi.GetEndpoint("http"))
    .WithEnvironment("VITE_AUTH_MODE", "dev")
    .WithHttpEndpoint(env: "PORT")
    .WithExternalHttpEndpoints();
```

**Adapt these calls to your app's needs:**

| Decision | What to change |
|----------|----------------|
| Which API does this app consume? | `.WithReference(clientApi)` or `.WithReference(managementApi)` or both |
| What environment variables does Vite need? | Add more `.WithEnvironment("VITE_*", ...)` calls |
| Does it need blob storage or other infra? | Add `.WithReference(blobs)` etc. |

### Step 7 — Add a root convenience script (optional)

In the root `package.json`, add a shortcut:

```json
{
  "scripts": {
    "admin": "pnpm -C apps/admin-dashboard dev"
  }
}
```

### Step 8 — Verify

1. Run the Aspire App Host — the new app should appear in the Aspire dashboard.
2. Click the endpoint link — Vite dev server should load.
3. Confirm `import.meta.env.VITE_API_BASE_URL` points to the correct backend.

---

## 6. Adding a Non-Vite App (e.g., Next.js, Astro)

The same `AddExecutable` pattern works for any Node.js dev server. The key contract is:

1. **Read `PORT` from the environment** — the framework's dev server must bind to the port Aspire assigns.
2. **Bind to `0.0.0.0`** — not `localhost`, so Aspire's reverse proxy can reach it.
3. **Fail on port conflict** — the server should exit if the port is taken (strict port mode).

Example for a Next.js app:

```csharp
var docs = builder.AddExecutable("docs", "pnpm", "../Rayneforge.Forecast.UI/apps/docs")
    .WithArgs("run", "dev")
    .WithHttpEndpoint(env: "PORT")
    .WithExternalHttpEndpoints();
```

And in the Next.js `package.json`:

```json
{
  "scripts": {
    "dev": "next dev -H 0.0.0.0 -p $PORT"
  }
}
```

> On Windows, use `cross-env` or read the port in `next.config.js` from `process.env.PORT`.

---

## 7. Dependency Graph

```
┌─────────────────────────────────────────────────┐
│               Aspire App Host                   │
│  (orchestrates all services + frontends)        │
└────────┬──────────┬──────────┬─────────────────┘
         │          │          │
    ┌────▼────┐ ┌───▼────┐ ┌──▼──────────┐
    │  web    │ │ admin  │ │ storybook   │
    │ (SPA)  │ │ (new)  │ │ (component  │
    │        │ │        │ │  gallery)   │
    └───┬────┘ └───┬────┘ └──────┬──────┘
        │          │              │
        ▼          ▼              ▼
   ┌─────────────────────────────────┐
   │  @rayneforge/ui                 │  ← React components
   │  @rayneforge/logic              │  ← Types & hooks
   │  @rayneforge/styles             │  ← SCSS tokens
   └──────────┬──────────────────────┘
              │
     ┌────────▼────────┐
     │  Client API /   │
     │  Management API │   ← .NET backends
     └─────────────────┘
```

---

## 8. Checklist for New Apps

- [ ] Create `apps/<app-name>/` with `package.json`, `vite.config.ts`, `tsconfig.json`, `index.html`, `src/`
- [ ] Reference shared packages (`@rayneforge/logic`, `@rayneforge/styles`, `@rayneforge/ui`) as needed
- [ ] Set `server.host = true`, `server.strictPort = true`, read `PORT` from env in Vite config
- [ ] Register in `AppHost.cs` with `AddExecutable(...)` and wire API references / env vars
- [ ] Run `pnpm install` from the UI root
- [ ] (Optional) Add a convenience script in the root `package.json`
- [ ] (Optional) Add Storybook stories by placing `*.stories.tsx` files alongside components
- [ ] Verify the app appears and is reachable from the Aspire dashboard
