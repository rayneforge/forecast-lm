#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Generates Bicep infrastructure templates from the Aspire AppHost.

.DESCRIPTION
    Run this script LOCALLY before committing. It converts the .NET Aspire
    AppHost application model into deployable Bicep templates using the
    Azure Developer CLI (azd).

    Flow:
      AppHost (C# topology) → Aspire manifest → azd infra synth → Bicep

    The generated main.bicep (and companion modules) are placed in
    infra/azure/bicep/. The folder is wiped clean each run to ensure
    a fresh, consistent set of templates.

    After running, commit the generated files so CI can deploy without
    needing dotnet or azd tooling.

.PARAMETER EnvironmentName
    The azd environment name. Defaults to AZURE_ENV_NAME env var or 'rayneforge-dev'.

.PARAMETER Location
    Azure region for the azd environment. Defaults to AZURE_LOCATION env var or 'eastus2'.

.PARAMETER SubscriptionId
    Azure subscription ID. Defaults to AZURE_SUBSCRIPTION_ID env var.

.EXAMPLE
    # From repo root
    ./infra/azure/scripts/generate-bicep.ps1

.EXAMPLE
    # With explicit params
    ./infra/azure/scripts/generate-bicep.ps1 -EnvironmentName rayneforge-prod -Location eastus2
#>
#Requires -Version 5.1
[CmdletBinding()]
param(
    [string] $EnvironmentName,
    [string] $Location,
    [string] $SubscriptionId  = $env:AZURE_SUBSCRIPTION_ID
)

# Apply defaults (PS 5.1 compatible — no ?? operator)
if (-not $EnvironmentName) { $EnvironmentName = if ($env:AZURE_ENV_NAME) { $env:AZURE_ENV_NAME } else { 'rayneforge-dev' } }
if (-not $Location)        { $Location = if ($env:AZURE_LOCATION) { $env:AZURE_LOCATION } else { 'eastus2' } }

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$RepoRoot       = Resolve-Path (Join-Path (Join-Path (Join-Path $PSScriptRoot '..') '..') '..')
$AppHostProject = Join-Path $RepoRoot (Join-Path 'src' (Join-Path 'Rayneforge.Forecast.AppHost' 'Rayneforge.Forecast.AppHost.csproj'))
$BicepDir       = Join-Path $RepoRoot (Join-Path 'infra' (Join-Path 'azure' 'bicep'))
$AzdInfraDir    = Join-Path $RepoRoot 'infra'             # azd writes here by default
$ManifestPath   = Join-Path $AzdInfraDir 'aspire-manifest.json'

# ─── Helpers ─────────────────────────────────────────────────────

function Assert-Command([string] $Name) {
    if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
        throw "'$Name' is required but not found in PATH. Install it and retry."
    }
}

# ─── Prerequisites ───────────────────────────────────────────────

Write-Host '▶ Checking prerequisites...' -ForegroundColor Cyan
Assert-Command 'dotnet'
Assert-Command 'azd'

if (-not (Test-Path $AppHostProject)) {
    throw "AppHost project not found: $AppHostProject"
}
Write-Host '  ✔ dotnet, azd, AppHost project — OK' -ForegroundColor Green

# ─── Step 1: Generate Aspire manifest ───────────────────────────
# Set production providers so the manifest includes ALL Azure resources.
# Without these, conditional resources (Cosmos, OpenAI) default to local-dev
# providers (sqlite, ollama) and are excluded from the generated Bicep.

Write-Host '▶ Step 1/3 — Generating Aspire manifest...' -ForegroundColor Cyan

$env:Providers__Database   = 'cosmos'
$env:Providers__LLM        = 'azureopenai'
$env:Providers__Embedding  = 'azureopenai'
$env:Providers__MessageBus = 'azureservicebus'
$env:DOTNET_ENVIRONMENT    = 'Production'

Push-Location $RepoRoot
try {
    & dotnet run --project $AppHostProject -- `
        --publisher manifest `
        --output-path $ManifestPath

    if ($LASTEXITCODE -ne 0) {
        throw "dotnet run (manifest publisher) failed with exit code $LASTEXITCODE"
    }
    if (-not (Test-Path $ManifestPath)) {
        throw "Manifest was not generated at: $ManifestPath"
    }
    Write-Host ('  + Manifest -> ' + $ManifestPath) -ForegroundColor Green
}
finally { Pop-Location }

# Note: AppHost logic (IsPublishMode check) excludes unsupported resources
# like 'executable.v0' (public-client) automatically.

# ─── Step 2: Configure azd environment ──────────────────────────

Write-Host "▶ Step 2/3 — Configuring azd environment '$EnvironmentName'..." -ForegroundColor Cyan

Push-Location $RepoRoot
try {
    # Try to select existing environment; create if it doesn't exist
    azd env select $EnvironmentName 2>$null
    if ($LASTEXITCODE -ne 0) {
        Write-Host "  ↳ Creating new azd environment..." -ForegroundColor Yellow
        azd env new $EnvironmentName --location $Location --no-prompt
    }

    # Wire subscription & location into the environment
    if ($SubscriptionId) {
        azd env set AZURE_SUBSCRIPTION_ID $SubscriptionId
    }
    azd env set AZURE_LOCATION $Location
}
finally { Pop-Location }

# ─── Step 3: Generate Bicep from manifest ────────────────────────

Write-Host '▶ Step 3/3 — Generating Bicep templates...' -ForegroundColor Cyan

# Clean the output folder so each run is a fresh, consistent set of templates
if (Test-Path $BicepDir) {
    Remove-Item -Path $BicepDir -Recurse -Force
    Write-Host '  ~ Cleared infra/azure/bicep/' -ForegroundColor Yellow
}
New-Item -ItemType Directory -Path $BicepDir -Force | Out-Null

Push-Location $RepoRoot
try {
    # Force azd to regenerate infrastructure from the AppHost
    azd infra gen --force

    if ($LASTEXITCODE -ne 0) {
        throw "azd infra gen failed with exit code $LASTEXITCODE"
    }

    # azd writes into infra/ — move generated Bicep files into infra/azure/bicep/
    $generatedItems = Get-ChildItem -Path $AzdInfraDir -Recurse | Where-Object {
        # Only bicep files/folders and parameters; skip manifest, scripts folder, azure folder itself
        $rel = $_.FullName.Substring($AzdInfraDir.Length + 1)
        $rel -notmatch '^azure[\\/]' -and
        $rel -notmatch '^aspire-manifest\.json$'
    }

    foreach ($item in $generatedItems) {
        $relativePath = $item.FullName.Substring($AzdInfraDir.Length + 1)
        $destinationPath = Join-Path $BicepDir $relativePath

        if ($item.PSIsContainer) {
            if (-not (Test-Path $destinationPath)) {
                New-Item -ItemType Directory -Path $destinationPath -Force | Out-Null
            }
        }
        else {
            $destDir = Split-Path $destinationPath -Parent
            if (-not (Test-Path $destDir)) {
                New-Item -ItemType Directory -Path $destDir -Force | Out-Null
            }
            Move-Item -Path $item.FullName -Destination $destinationPath -Force
            Write-Host ('  + ' + $relativePath) -ForegroundColor Green
        }
    }

    # Clean up empty generated folders left behind in infra/
    Get-ChildItem -Path $AzdInfraDir -Directory | Where-Object {
        $_.Name -ne 'azure' -and
        (Get-ChildItem -Path $_.FullName -Recurse -File).Count -eq 0
    } | Remove-Item -Recurse -Force -ErrorAction SilentlyContinue
}
finally { Pop-Location }

# ─── Success ─────────────────────────────────────────────────────

Write-Host '' -ForegroundColor Green
Write-Host 'Bicep generation complete.' -ForegroundColor Green
Write-Host "  Manifest : $ManifestPath"
Write-Host "  Bicep    : $BicepDir"
Write-Host ''
Write-Host '  Next steps:'
Write-Host '    1. Review the generated files in infra/azure/bicep/'
Write-Host '    2. git add infra/azure/bicep/'
Write-Host "    3. git commit -m 'chore: regenerate Aspire Bicep'"
Write-Host '    4. git push — CI deploys via main.bicep'
