# Overview
Forecast is a centralized news intelligence platform designed to ingest, unify, and analyze disparate global news feeds. It serves as a single pane of glass for tracking emerging narratives, transforming raw information into actionable forecasting data.

By aggregating news from multiple sources into a centralized semantic graph, the system enables users to:
*   **Centralize Intelligence:** Ingest and normalize news articles from global feeds/APIs in real-time.
*   **Identify Narratives:** Automatically synthesize unconnected events into cohesive, evolving storylines using AI agents.
*   **Forecast Trends:** Use historical data and entity extraction to predict how current news cycles might evolve.

> **Status:** Active Development  
> **Core Stack:** .NET 9.0 (Aspire), React, Semantic Kernel, Azure AI

## 🏗 Architecture

The platform is built as specialized "Intelligent Ingestion" pipeline:

### 📰 The News Engine
| Component | Role | Description |
|-----------|------|-------------|
| **Feed Aggregator** | Ingestion | Discovers and fetches articles from external providers (NewsAPI, RSS, etc.). |
| **Intake Service** | Processing |  Standardizes raw articles and queues them for semantic analysis. |
| **Assessment Agent** | AI Analysis |  Reads each article to extract **Entities** (People, Places) and **Claims** (Assertions of fact). |
| **Narrative Engine** | Synthesis | Connects individual articles into broader **Narratives** based on shared semantic meaning. |

### 🚀 Technical Implementation
The system is orchestrated by **.NET Aspire** (`Rayneforge.Forecast.AppHost`):

*   **Client API**: The central nervous system exposing the Knowledge Graph (MCP & Vector Search).
*   **Worker**: The background engine driving the Ingestion -> Extraction -> Embedding pipeline.
*   **UI (React)**: A visual workspace for analysts to explore the news feed, query the knowledge graph, and view forecasts.
*   **Dev Infrastructure**: Local-first design using SQLite/Ollama, seamlessly scalable to CosmosDB/Azure OpenAI.

### 🧠 AI & Agents
The "Brain" of the operation lives in `docs/agents/`:
*   **Narrative Intake**: Extracts core facts from raw text.
*   **Research Agent**: recursively searches the graph to broaden context.
*   **Query Classifier**: Understands user intent to filter the massive centralized feed.

### ☁️ Infrastructure
The project supports a hybrid deployment model ("Local" vs "Cloud"):

*   **Database**: SQLite (Local) or Azure Cosmos DB (Prod).
*   **Storage**: Azurite (Local) or Azure Blob Storage (Prod).
*   **AI Models**: Ollama (Local) or Azure OpenAI (Prod).
*   **Identity**: Azure External ID (CIAM) for users, and Entra ID for service-to-service security.

## 🛠 Prerequisites

*   **.NET 9.0 SDK** (or latest preview)
*   **Docker Desktop** (Required for Aspire)
*   **Azure Developer CLI (`azd`)** - for deployment
*   **PowerShell 7+** & **Azure CLI (`az`)** - for bootstrapping
*   **Node.js 20+** & **pnpm**

## 🚀 Getting Started

### 1. Initial Setup (One-Time)
This project requires a specialized Azure configuration (CIAM Tenant + Deployment Identity).
Run the setup script to provision your local or cloud environment configuration:

```powershell
./infra/azure/scripts/setup.ps1 -GitHubRepo "your-org/Rayneforge.Forecast"
```

### 2. Local Development

Restore dependencies and start the Aspire Dashboard:

```bash
# Restore Backend
dotnet restore

# Restore Frontend
cd src/Rayneforge.Forecast.UI
pnpm install
cd ../..

# Start AppHost
dotnet run --project src/Rayneforge.Forecast.AppHost/Rayneforge.Forecast.AppHost.csproj
```

Visit the **Aspire Dashboard** (link in console) to see the endpoints for:
*   `client-api`
*   `web` (The React UI)
*   `worker`

### 3. Configuration
The system uses `.NET Aspire` configuration injection.
See `src/Rayneforge.Forecast.AppHost/AppHost.cs` for available switches:

| Key | Default | Options |
|-----|---------|---------|
| `Providers:Database` | `sqlite` | `cosmos` |
| `Providers:Embedding` | `ollama` | `azureopenai` |
| `Providers:News` | `mock` | `newsapi` |

**Setting Secrets for Local Dev:**
```bash
dotnet user-secrets set "NewsApi:ApiKey" "<YOUR_KEY>" --project src/Rayneforge.Forecast.AppHost/Rayneforge.Forecast.AppHost.csproj
```

## 📦 Deployment

This repository utilizes **GitOps** for infrastructure.
The `infra/` folder is synchronized with Azure via `azd` and GitHub Actions.

1.  **Commit** your changes (including `infra/` and `src/`).
2.  **Push** to `main`.
3.  The **GitHub Action** (`.github/workflows/az-bicep-deploy.yml`) will:
    *   Synthesize Bicep templates from the C# App Model (`azd infra synth`).
    *   Deploy resources to Azure using the Federated Credential set up in Step 1.

## 📚 Documentation

Detailed documentation is available in the `docs/` folder:
*   [Agents & Workflows](docs/agents/)
*   [API Specification](docs/api/)
*   [UI Architecture](docs/design/ui/)
