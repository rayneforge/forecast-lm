# Rayneforge.Forecast

A distributed, AI-enhanced news forecasting system orchestrated with **.NET Aspire**. This project integrates modern .NET 10 services, specific infrastructure for AI agents (MCP), and a modern React frontend.

## 🏗 Architecture

The solution is split into distinct microservices and libraries:

### 🚀 Applications
| Service | Project | Description |
|---------|---------|-------------|
| **AppHost** | `Rayneforge.Forecast.AppHost` | The .NET Aspire orchestrator that spins up the entire environment (containers, executables, cloud resources). |
| **Client API** | `Rayneforge.Forecast.API.Client` | Public-facing API supporting Model Context Protocol (MCP) and Vector Search. |
| **Management API** | `Rayneforge.Forecast.API.Management` | Administrative API for system tasks (e.g., Database Migrations). |
| **Worker** | `Rayneforge.Forecast.Worker` | Azure Functions worker that fetches news on a schedule and generates embeddings. |
| **Frontend** | `Rayneforge.Forecast.UI` | A Vite/React application and Storybook design system. |

### 📚 Libraries
| Library | Description |
|---------|-------------|
| **Domain** | shared data models (`NewsArticle`, `SearchResult`) and interfaces (`ISemanticEntity`). |
| **Infrastructure** | Concrete implementations for Database (EF Core), Embeddings (Ollama/OpenAI), and News APIs. |
| **ServiceDefaults** | Standard Aspire service configurations (OpenTelemetry, Health Checks, Resilience). |

## 🛠 Prerequisites

- **.NET 9.0 / 10.0 SDK** (Preview)
- **Docker Desktop** (Required for Aspire containers)
- **Node.js** (v20+) & **pnpm**
- **Azure CLI** (`az login` required for deployment)
- **Ollama** (Optional, for local embeddings)

## ⚡ Getting Started

### 1. Clone & Install Dependencies

```bash
# Restore .NET dependencies
dotnet restore

# Install Frontend dependencies
cd src/Rayneforge.Forecast.UI
pnpm install
cd ../..
```

### 2. Configuration & Secrets

The system relies on several providers which can be configured in `appsettings.json` or User Secrets.

**Key Configuration Keys:**
*   `Providers:News`: `newsapi`
*   `Providers:Database`: `sqlite` (local) or `cosmos` (prod)
*   `Embeddings:Provider`: `ollama` (local) or `azureopenai` (prod)
*   `NewsApi:ApiKey`: Your API Key from NewsAPI.org

To set secrets for the AppHost:
```bash
dotnet user-secrets set "NewsApi:ApiKey" "<YOUR_KEY>" --project src/Rayneforge.Forecast.AppHost/Rayneforge.Forecast.AppHost.csproj
```

### 3. Run the Application

Start the entire distributed system using the AppHost:

```bash
dotnet run --project src/Rayneforge.Forecast.AppHost/Rayneforge.Forecast.AppHost.csproj
```

This will launch the **Aspire Dashboard**, where you can view:
*   **Web**: The React Frontend (http://localhost:5173 by default)
*   **Client API**: The backend API
*   **Worker**: The background job processor
*   **Traces & Logs**: OpenTelemetry data for all services.

## 🤖 AI & Embeddings

The system supports swappable embedding providers:
1.  **Ollama**: Great for local development. Ensure you have the `nomic-embed-text` or `all-minilm` model pulled.
2.  **Azure OpenAI**: Used for production. Requires `Endpoint` and `Deployment` configuration.

## 📦 Deployment

The `infra/` folder contains **Bicep** definitions for provisioning Azure resources:
*   Azure Container Apps
*   Azure Cosmos DB / SQL
*   Azure Key Vault
*   Managed Identities

To deploy using Azure Developer CLI:
```bash
azd up
```
