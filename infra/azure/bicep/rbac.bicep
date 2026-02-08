param identityPrincipalId string
param cosmosAccountId string
param keyVaultId string
param openAiAccountId string
param storageAccountId string
param serviceBusNamespaceId string

// ─── Cosmos DB: CRUD (data plane) ───────────────────────────────
resource cosmosRole 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(cosmosAccountId, identityPrincipalId, 'cosmos')
  scope: cosmosAccountId
  properties: {
    roleDefinitionId: subscriptionResourceId(
      'Microsoft.Authorization/roleDefinitions',
      '00000000-0000-0000-0000-000000000002' // Cosmos DB Built-in Data Contributor
    )
    principalId: identityPrincipalId
    principalType: 'ServicePrincipal'
  }
}

// ─── Key Vault: read secrets only ───────────────────────────────
resource kvRole 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(keyVaultId, identityPrincipalId, 'kv')
  scope: keyVaultId
  properties: {
    roleDefinitionId: subscriptionResourceId(
      'Microsoft.Authorization/roleDefinitions',
      '4633458b-17de-408a-b874-0445c86b69e6' // Key Vault Secrets User
    )
    principalId: identityPrincipalId
    principalType: 'ServicePrincipal'
  }
}

// ─── Azure OpenAI: inference only ───────────────────────────────
resource openAiRole 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(openAiAccountId, identityPrincipalId, 'openai')
  scope: openAiAccountId
  properties: {
    roleDefinitionId: subscriptionResourceId(
      'Microsoft.Authorization/roleDefinitions',
      '5e0bd9bd-7b93-4f28-af87-19fc36ad61bd' // Cognitive Services User
    )
    principalId: identityPrincipalId
    principalType: 'ServicePrincipal'
  }
}

// ─── Storage: Blob Data access (Worker + Apps) ──────────────────
resource storageRole 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(storageAccountId, identityPrincipalId, 'storage')
  scope: storageAccountId
  properties: {
    roleDefinitionId: subscriptionResourceId(
      'Microsoft.Authorization/roleDefinitions',
      'ba92f5b4-2d11-453d-a403-e96b0029c9fe' // Storage Blob Data Contributor
    )
    principalId: identityPrincipalId
    principalType: 'ServicePrincipal'
  }
}

// ─── Service Bus: Message sending/receiving ─────────────────────
resource serviceBusRole 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(serviceBusNamespaceId, identityPrincipalId, 'servicebus')
  scope: serviceBusNamespaceId
  properties: {
    roleDefinitionId: subscriptionResourceId(
      'Microsoft.Authorization/roleDefinitions',
      '090c5cfd-751d-4904-8948-3ce6f1109419' // Azure Service Bus Data Owner
    )
    principalId: identityPrincipalId
    principalType: 'ServicePrincipal'
  }
}
