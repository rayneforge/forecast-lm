#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Generates Bicep infrastructure templates from the Aspire AppHost.

.DESCRIPTION
    Run this script LOCALLY before committing. It converts the .NET Aspire
    AppHost application model into deployable Bicep templates using the
    Azure Developer CLI (azd).

    Flow:
      AppHost (C# topology) -> Aspire manifest -> azd infra synth -> Bicep

    The infra/ folder is wiped clean each run, then azd writes all
    generated Bicep files directly into it.

    After running, commit the generated files so CI can deploy without
    needing dotnet or azd tooling.

.PARAMETER EnvironmentName
    The azd environment name. Defaults to AZURE_ENV_NAME env var or 'rayneforge-dev'.

.PARAMETER Location
    Azure region for the azd environment. Defaults to AZURE_LOCATION env var or 'eastus2'.

.PARAMETER SubscriptionId
    Azure subscription ID. Defaults to AZURE_SUBSCRIPTION_ID env var.

.EXAMPLE
    ./scripts/generate-bicep.ps1

.EXAMPLE
    ./scripts/generate-bicep.ps1 -EnvironmentName rayneforge-prod -Location eastus2
#>
#Requires -Version 5.1
[CmdletBinding()]
param(
    [string] $EnvironmentName,
    [string] $Location,
    [string] $SubscriptionId = $env:AZURE_SUBSCRIPTION_ID
)

# Apply defaults (PS 5.1 compatible)
if (-not $EnvironmentName) { $EnvironmentName = if ($env:AZURE_ENV_NAME) { $env:AZURE_ENV_NAME } else { 'rayneforge-dev' } }
if (-not $Location)        { $Location = if ($env:AZURE_LOCATION) { $env:AZURE_LOCATION } else { 'eastus2' } }

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$RepoRoot       = Resolve-Path (Join-Path $PSScriptRoot '..')
$AppHostProject = Join-Path $RepoRoot (Join-Path 'src' (Join-Path 'Rayneforge.Forecast.AppHost' 'Rayneforge.Forecast.AppHost.csproj'))
$InfraDir       = Join-Path $RepoRoot 'infra'
$ManifestPath   = Join-Path $InfraDir 'aspire-manifest.json'

# ─── Helpers ─────────────────────────────────────────────────────

function Assert-Command([string] $Name) {
    if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
        throw "'$Name' is required but not found in PATH. Install it and retry."
    }
}

# ─── Prerequisites ───────────────────────────────────────────────

Write-Host '>> Checking prerequisites...' -ForegroundColor Cyan
Assert-Command 'dotnet'
Assert-Command 'azd'

if (-not (Test-Path $AppHostProject)) {
    throw "AppHost project not found: $AppHostProject"
}
Write-Host '  OK: dotnet, azd, AppHost project' -ForegroundColor Green

# ─── Wipe infra/ for a clean slate ──────────────────────────────

if (Test-Path $InfraDir) {
    Remove-Item -Path $InfraDir -Recurse -Force
    Write-Host '  ~ Cleared infra/' -ForegroundColor Yellow
}
New-Item -ItemType Directory -Path $InfraDir -Force | Out-Null

# ─── Step 1: Generate Aspire manifest ───────────────────────────

Write-Host '>> Step 1/3 - Generating Aspire manifest...' -ForegroundColor Cyan

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

# ─── Step 2: Configure azd environment ──────────────────────────

Write-Host ">> Step 2/3 - Configuring azd environment '$EnvironmentName'..." -ForegroundColor Cyan

Push-Location $RepoRoot
try {
    azd env select $EnvironmentName 2>$null
    if ($LASTEXITCODE -ne 0) {
        Write-Host '  -> Creating new azd environment...' -ForegroundColor Yellow
        azd env new $EnvironmentName --location $Location --no-prompt
    }

    if ($SubscriptionId) {
        azd env set AZURE_SUBSCRIPTION_ID $SubscriptionId
    }
    azd env set AZURE_LOCATION $Location
}
finally { Pop-Location }

# ─── Step 3: Generate Bicep ─────────────────────────────────────

Write-Host '>> Step 3/3 - Generating Bicep templates...' -ForegroundColor Cyan

Push-Location $RepoRoot
try {
    azd infra gen --force

    if ($LASTEXITCODE -ne 0) {
        throw "azd infra gen failed with exit code $LASTEXITCODE"
    }

    # List what was generated
    Get-ChildItem -Path $InfraDir -Recurse -File | ForEach-Object {
        $rel = $_.FullName.Substring($InfraDir.Length + 1)
        Write-Host ('  + ' + $rel) -ForegroundColor Green
    }
}
finally { Pop-Location }

# ─── Done ────────────────────────────────────────────────────────

Write-Host ''
Write-Host 'Bicep generation complete.' -ForegroundColor Green
Write-Host "  Output: $InfraDir"
Write-Host ''
Write-Host '  Next steps:'
Write-Host '    1. Review the generated files in infra/'
Write-Host '    2. git add infra/'
Write-Host "    3. git commit -m 'chore: regenerate Aspire Bicep'"
Write-Host '    4. git push'
