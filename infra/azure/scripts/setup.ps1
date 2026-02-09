<# 
Bootstrap External ID (CIAM) tenant + customer app + basic user flow + groups

Requirements:
- az CLI installed and logged in
- Permission to create CIAM tenant resource (ciamDirectories) in the target subscription/RG (often Owner at subscription/RG)
- Permission in the created external tenant to manage apps/groups/user flows (Graph):
  - Applications: Application.ReadWrite.All (or equivalent)
  - Service principals: Application.ReadWrite.All / Directory.ReadWrite.All as needed
  - Groups: Group.ReadWrite.All
  - User flows (Graph beta): IdentityUserFlow.ReadWrite.All and user has External ID User Flow Administrator role (least privileged per Graph doc)
    See Create b2cIdentityUserFlow. https://graph.microsoft.com/beta/identity/b2cUserFlows
#>

[CmdletBinding()]
param(
  # Azure subscription where the CIAM directory resource is created (required by the REST API)
  [Parameter(Mandatory)] [string] $SubscriptionId,
  [Parameter(Mandatory)] [string] $ResourceGroupName,

  # CIAM tenant "initial subdomain" (1-26 alphanumeric). This becomes the directory subdomain/tenant resource name.
  [Parameter(Mandatory)]
  [ValidatePattern('^[a-zA-Z0-9]{1,26}$')]
  [string] $CiamResourceName,

  # Per REST API: one of United States / Europe / Asia Pacific / Australia
  [Parameter(Mandatory)]
  [ValidateSet('United States','Europe','Asia Pacific','Australia')]
  [string] $CiamLocation,

  [Parameter(Mandatory)] [string] $CiamDisplayName,
  [Parameter(Mandatory)]
  [ValidatePattern('^[A-Z]{2}$')]
  [string] $CountryCode,

  # Customer app registration
  [Parameter(Mandatory)] [string] $CustomerAppDisplayName,

  # Choose ONE: web or spa. (You can extend for native later.)
  [Parameter(Mandatory)]
  [ValidateSet('web','spa')]
  [string] $CustomerAppType,

  # Redirect URIs for the chosen app type
  [Parameter(Mandatory)]
  [string[]] $RedirectUris,

  # User flow name (Graph will prefix with B2C_1_ if you don't)
  [Parameter(Mandatory)]
  [ValidatePattern('^[a-zA-Z0-9_\\-]{1,64}$')]
  [string] $SignUpSignInFlowName,

  # Downstream groups to create in the External ID tenant
  # Keep it minimal: you can add more later.
  [string[]] $GroupSuffixes = @('app-users','app-admins'),

  # GitHub OIDC federation — org/repo for the federated credential subject
  # e.g. "myorg/Rayneforge.Forecast"
  [string] $GitHubRepo = '',

  # Branch filter for the federated credential (default: main)
  [string] $GitHubBranch = 'main'
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Assert-AzCli {
  if (-not (Get-Command az -ErrorAction SilentlyContinue)) {
    throw "az CLI is required."
  }
}

function Get-AzAccessToken([string] $Resource, [string] $TenantId = $null) {
  $azArgs = @('account','get-access-token','--resource',$Resource,'-o','json')
  if ($TenantId) { $azArgs += @('--tenant',$TenantId) }
  $json = az @azArgs | ConvertFrom-Json
  return $json.accessToken
}

# Map CIAM display locations to Azure regions for resource group creation
function Get-AzureRegion([string] $CiamLocation) {
  switch ($CiamLocation) {
    'United States'  { return 'eastus2' }
    'Europe'         { return 'westeurope' }
    'Asia Pacific'   { return 'southeastasia' }
    'Australia'      { return 'australiaeast' }
    default          { return 'eastus2' }
  }
}

function Ensure-ResourceGroup([string] $SubId, [string] $RgName, [string] $Location) {
  # This is minimal infra needed because ciamDirectories is RG-scoped.
  $existing = az group exists --name $RgName | ForEach-Object { $_.Trim() }
  if ($existing -eq 'true') { return }
  az account set --subscription $SubId | Out-Null
  az group create --name $RgName --location $Location | Out-Null
}

function Invoke-ArmJson([string] $Method, [string] $Uri, [object] $Body = $null) {
  $token = Get-AzAccessToken -Resource 'https://management.azure.com/'
  $headers = @{ Authorization = "Bearer $token"; 'Content-Type' = 'application/json' }
  if ($Body) {
    return Invoke-WebRequest -Method $Method -Uri $Uri -Headers $headers -Body ($Body | ConvertTo-Json -Depth 20) -UseBasicParsing
  }
  return Invoke-WebRequest -Method $Method -Uri $Uri -Headers $headers -UseBasicParsing
}

function Invoke-GraphJson([string] $Method, [string] $Uri, [string] $TenantId, [object] $Body = $null) {
  $token = Get-AzAccessToken -Resource 'https://graph.microsoft.com' -TenantId $TenantId
  $headers = @{ Authorization = "Bearer $token"; 'Content-Type' = 'application/json' }
  try {
    if ($Body) {
      return Invoke-RestMethod -Method $Method -Uri $Uri -Headers $headers -Body ($Body | ConvertTo-Json -Depth 20)
    }
    return Invoke-RestMethod -Method $Method -Uri $Uri -Headers $headers
  } catch {
    $stream = $_.Exception.Response.GetResponseStream()
    if ($stream) {
      $reader = [System.IO.StreamReader]::new($stream)
      Write-Error "Graph API Error: $($reader.ReadToEnd())"
    }
    throw
  }
}

function Ensure-CiamTenant {
  param(
    [string] $SubId,
    [string] $RgName,
    [string] $ResourceName,
    [string] $Location,
    [string] $DisplayName,
    [string] $Country
  )

  $apiVersion = '2023-05-17-preview'
  $resourceId = "/subscriptions/$SubId/resourceGroups/$RgName/providers/Microsoft.AzureActiveDirectory/ciamDirectories/$ResourceName"
  $uri = "https://management.azure.com${resourceId}?api-version=$apiVersion"

  $body = @{
    location = $Location
    sku = @{ name = 'Base'; tier = 'A0' }
    properties = @{
      createTenantProperties = @{
        displayName = $DisplayName
        countryCode = $Country
      }
    }
  }

  $resp = Invoke-ArmJson -Method Put -Uri $uri -Body $body

  $asyncUrl = $resp.Headers['Azure-AsyncOperation']
  if ($asyncUrl) {
    $token = Get-AzAccessToken -Resource 'https://management.azure.com/'
    $headers = @{ Authorization = "Bearer $token"; 'Content-Type' = 'application/json' }
    while ($true) {
      Start-Sleep -Seconds 10
      $op = Invoke-RestMethod -Method Get -Uri $asyncUrl -Headers $headers
      if ($op.status -in @('Succeeded','Failed','Canceled')) {
        if ($op.status -ne 'Succeeded') {
          throw "CIAM tenant create/update failed: $($op | ConvertTo-Json -Depth 20)"
        }
        break
      }
    }
  }

  $final = Invoke-RestMethod -Method Get -Uri $uri -Headers @{ Authorization = "Bearer $(Get-AzAccessToken -Resource 'https://management.azure.com/')"}
  return $final
}

function Ensure-GraphApplication {
  param(
    [string] $TenantId,
    [string] $DisplayName,
    [string] $AppType,
    [string[]] $RedirectUris
  )

  # Find existing by displayName
  $filter = [Uri]::EscapeDataString("displayName eq '$DisplayName'")
  $list = Invoke-GraphJson -Method Get -Uri "https://graph.microsoft.com/v1.0/applications?`$filter=$filter&`$top=1" -TenantId $TenantId
  $app = $null
  if ($list.value -and $list.value.Count -gt 0) { $app = $list.value[0] }

  if (-not $app) {
    $create = @{
      displayName = $DisplayName
      signInAudience = 'AzureADMyOrg'
    }

    if ($AppType -eq 'web') {
      $create.web = @{ redirectUris = $RedirectUris }
    } elseif ($AppType -eq 'spa') {
      $create.spa = @{ redirectUris = $RedirectUris }
    }

    $app = Invoke-GraphJson -Method Post -Uri "https://graph.microsoft.com/v1.0/applications" -TenantId $TenantId -Body $create
    return $app
  }

  # Update redirect URIs if needed (PATCH)
  $patch = @{ }
  if ($AppType -eq 'web') { $patch.web = @{ redirectUris = $RedirectUris } }
  if ($AppType -eq 'spa') { $patch.spa = @{ redirectUris = $RedirectUris } }

  if ($patch.Keys.Count -gt 0) {
    Invoke-GraphJson -Method Patch -Uri "https://graph.microsoft.com/v1.0/applications/$($app.id)" -TenantId $TenantId -Body $patch | Out-Null
    $app = Invoke-GraphJson -Method Get -Uri "https://graph.microsoft.com/v1.0/applications/$($app.id)" -TenantId $TenantId
  }

  return $app
}

function Ensure-ServicePrincipalForApp {
  param([string] $TenantId, [string] $AppId)

  $filter = [Uri]::EscapeDataString("appId eq '$AppId'")
  $list = Invoke-GraphJson -Method Get -Uri "https://graph.microsoft.com/v1.0/servicePrincipals?`$filter=$filter&`$top=1" -TenantId $TenantId
  if ($list.value -and $list.value.Count -gt 0) { return $list.value[0] }

  $sp = Invoke-GraphJson -Method Post -Uri "https://graph.microsoft.com/v1.0/servicePrincipals" -TenantId $TenantId -Body @{ appId = $AppId }
  return $sp
}

function Ensure-SecurityGroup {
  param([string] $TenantId, [string] $DisplayName)

  $filter = [Uri]::EscapeDataString("displayName eq '$DisplayName'")
  $list = Invoke-GraphJson -Method Get -Uri "https://graph.microsoft.com/v1.0/groups?`$filter=$filter&`$top=1" -TenantId $TenantId
  if ($list.value -and $list.value.Count -gt 0) { return $list.value[0] }

  # mailNickname must be unique-ish; keep it deterministic and safe
  $nick = ($DisplayName.ToLowerInvariant() -replace '[^a-z0-9]','')
  if ($nick.Length -lt 6) { $nick = $nick + "grp" }
  if ($nick.Length -gt 64) { $nick = $nick.Substring(0,64) }

  $group = Invoke-GraphJson -Method Post -Uri "https://graph.microsoft.com/v1.0/groups" -TenantId $TenantId -Body @{
    displayName = $DisplayName
    mailEnabled = $false
    mailNickname = $nick
    securityEnabled = $true
  }
  return $group
}

function Ensure-GroupMember {
  param([string] $TenantId, [string] $GroupId, [string] $DirectoryObjectId)

  # Add member (idempotency: try-add; ignore "already exists" conflicts)
  $uri = "https://graph.microsoft.com/v1.0/groups/$GroupId/members/`$ref"
  $body = @{ "@odata.id" = "https://graph.microsoft.com/v1.0/directoryObjects/$DirectoryObjectId" }

  try {
    Invoke-GraphJson -Method Post -Uri $uri -TenantId $TenantId -Body $body | Out-Null
  } catch {
    $msg = $_.Exception.Message
    if ($msg -match 'added object references already exist' -or $msg -match 'Request_BadRequest' -or $msg -match 'One or more added object references already exist') {
      return
    }
    throw
  }
}

function Ensure-SignUpSignInUserFlow {
  param([string] $TenantId, [string] $FlowName)

  # Graph beta: POST /identity/b2cUserFlows
  # If you pass "Customer", Graph returns "B2C_1_Customer" (prefix behavior documented).
  $desiredId = $FlowName
  $flowIdToCheck = if ($FlowName.StartsWith('B2C_1_')) { $FlowName } else { "B2C_1_$FlowName" }

  # Try read first
  try {
    $existing = Invoke-GraphJson -Method Get -Uri "https://graph.microsoft.com/beta/identity/b2cUserFlows/$flowIdToCheck" -TenantId $TenantId
    return $existing
  } catch {
    # not found -> create
  }

  try {
    $created = Invoke-GraphJson -Method Post -Uri "https://graph.microsoft.com/beta/identity/b2cUserFlows" -TenantId $TenantId -Body @{
      id = $desiredId
      userFlowType = "signUpOrSignIn"
      userFlowTypeVersion = 3
    }
    return $created
  } catch {
    Write-Warning "Failed to create User Flow '$desiredId'. You may lack 'IdentityUserFlow.ReadWrite.All' permission. Please create it manually."
    return [pscustomobject]@{ id = $desiredId; userFlowType = "signUpOrSignIn"; userFlowTypeVersion = 3 }
  }
}

# ------------------- MAIN -------------------

Assert-AzCli

# ciamDirectories is RG-scoped, ensure RG exists
$azureRegion = Get-AzureRegion -CiamLocation $CiamLocation
Ensure-ResourceGroup -SubId $SubscriptionId -RgName $ResourceGroupName -Location $azureRegion

# Create/update the external tenant + return tenantId/domainName
$ciam = Ensure-CiamTenant `
  -SubId $SubscriptionId `
  -RgName $ResourceGroupName `
  -ResourceName $CiamResourceName `
  -Location $CiamLocation `
  -DisplayName $CiamDisplayName `
  -Country $CountryCode

$externalTenantId = $ciam.properties.tenantId
$domainName = $ciam.properties.domainName
if (-not $externalTenantId) { throw "CIAM tenantId not returned yet. provisioningState=$($ciam.properties.provisioningState)" }

# Create/update the customer app in the external tenant
$app = Ensure-GraphApplication `
  -TenantId $externalTenantId `
  -DisplayName $CustomerAppDisplayName `
  -AppType $CustomerAppType `
  -RedirectUris $RedirectUris

# Ensure service principal exists (some later operations require it)
$sp = Ensure-ServicePrincipalForApp -TenantId $externalTenantId -AppId $app.appId

# Create minimal groups in the external tenant and add the app SP to them
$createdGroups = @()
foreach ($suffix in $GroupSuffixes) {
  $gName = "$($CiamResourceName)-$suffix"
  $g = Ensure-SecurityGroup -TenantId $externalTenantId -DisplayName $gName
  Ensure-GroupMember -TenantId $externalTenantId -GroupId $g.id -DirectoryObjectId $sp.id
  $createdGroups += [pscustomobject]@{ displayName=$g.displayName; id=$g.id }
}

# Create/ensure a basic SignUpSignIn user flow (Graph beta)
$userFlow = Ensure-SignUpSignInUserFlow -TenantId $externalTenantId -FlowName $SignUpSignInFlowName

# ─── GitHub OIDC Federated Credential ────────────────────────────
# Allows GitHub Actions to authenticate as this SP without storing secrets.
$fedCredCreated = $false
if ($GitHubRepo) {
  $fedCredName = 'github-actions-deploy'
  $existingCreds = Invoke-GraphJson -Method Get `
    -Uri "https://graph.microsoft.com/v1.0/applications/$($app.id)/federatedIdentityCredentials" `
    -TenantId $externalTenantId

  $alreadyExists = $existingCreds.value | Where-Object { $_.name -eq $fedCredName }

  if (-not $alreadyExists) {
    Invoke-GraphJson -Method Post `
      -Uri "https://graph.microsoft.com/v1.0/applications/$($app.id)/federatedIdentityCredentials" `
      -TenantId $externalTenantId `
      -Body @{
        name        = $fedCredName
        issuer      = 'https://token.actions.githubusercontent.com'
        subject     = "repo:${GitHubRepo}:ref:refs/heads/${GitHubBranch}"
        audiences   = @('api://AzureADTokenExchange')
        description = "GitHub Actions OIDC for $GitHubRepo ($GitHubBranch)"
      } | Out-Null
    $fedCredCreated = $true
  }
}

# NOTE: Official docs show "Add application to user flow" in the portal;
# no official Graph endpoint was found for b2cUserFlows app association.
$manualSteps = @()
$manualSteps += @"
- In the External ID tenant, go to: Entra ID > External Identities > User flows
  Select flow: $($userFlow.id)
  Under 'Use' > 'Applications' > 'Add application' and select: $CustomerAppDisplayName
"@
if (-not $GitHubRepo) {
  $manualSteps += '- Re-run with -GitHubRepo "org/repo" to auto-create the federated credential for GitHub Actions OIDC.'
}

# ─── Output ──────────────────────────────────────────────────────
$result = [pscustomobject]@{
  # ── GitHub Actions Secrets (copy these into your repo settings) ──
  githubSecrets = [pscustomobject]@{
    AZURE_CLIENT_ID       = $app.appId                   # App Registration → Application (client) ID
    AZURE_TENANT_ID       = $externalTenantId             # CIAM tenant ID
    AZURE_SUBSCRIPTION_ID = $SubscriptionId               # Azure subscription
  }
  # ── Full resource details ──
  ciam = [pscustomobject]@{
    resourceId        = $ciam.id
    tenantId          = $externalTenantId
    domainName        = $domainName
    provisioningState = $ciam.properties.provisioningState
  }
  customerApp = [pscustomobject]@{
    displayName              = $app.displayName
    appObjectId              = $app.id                    # Entra Object ID (for Graph API calls)
    clientId                 = $app.appId                 # Application (client) ID
    servicePrincipalObjectId = $sp.id                     # SP Object ID (for RBAC principalId)
    appType                  = $CustomerAppType
    redirectUris             = $RedirectUris
  }
  federation = [pscustomobject]@{
    created    = $fedCredCreated
    githubRepo = $GitHubRepo
    branch     = $GitHubBranch
  }
  userFlows = @(
    [pscustomobject]@{
      id      = $userFlow.id
      type    = $userFlow.userFlowType
      version = $userFlow.userFlowTypeVersion
    }
  )
  groups      = $createdGroups
  manualSteps = $manualSteps
}

$result | ConvertTo-Json -Depth 10

# -- Print a quick-copy block to stderr so it doesn't pollute JSON stdout --
Write-Host ''
Write-Host '+--------------------------------------------------------------+' -ForegroundColor Cyan
Write-Host '|  GitHub Actions Secrets -- copy into repo Settings > Secrets |' -ForegroundColor Cyan
Write-Host '+--------------------------------------------------------------+' -ForegroundColor Cyan
Write-Host "|  AZURE_CLIENT_ID       = $($app.appId)" -ForegroundColor Yellow
Write-Host "|  AZURE_TENANT_ID       = $externalTenantId" -ForegroundColor Yellow
Write-Host "|  AZURE_SUBSCRIPTION_ID = $SubscriptionId" -ForegroundColor Yellow
Write-Host '+--------------------------------------------------------------+' -ForegroundColor Cyan
