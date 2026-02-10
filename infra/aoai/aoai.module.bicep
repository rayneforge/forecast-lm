@description('The location for the resource(s) to be deployed.')
param location string = resourceGroup().location

resource aoai 'Microsoft.CognitiveServices/accounts@2024-10-01' = {
  name: take('aoai-${uniqueString(resourceGroup().id)}', 64)
  location: location
  kind: 'OpenAI'
  properties: {
    customSubDomainName: toLower(take(concat('aoai', uniqueString(resourceGroup().id)), 24))
    publicNetworkAccess: 'Enabled'
    disableLocalAuth: true
  }
  sku: {
    name: 'S0'
  }
  tags: {
    'aspire-resource-name': 'aoai'
  }
}

resource embeddings 'Microsoft.CognitiveServices/accounts/deployments@2024-10-01' = {
  name: 'embeddings'
  properties: {
    model: {
      format: 'OpenAI'
      name: 'text-embedding-3-small'
      version: '1'
    }
  }
  sku: {
    name: 'Standard'
    capacity: 8
  }
  parent: aoai
}

resource chat_basic 'Microsoft.CognitiveServices/accounts/deployments@2024-10-01' = {
  name: 'chat-basic'
  properties: {
    model: {
      format: 'OpenAI'
      name: 'gpt-4o'
      version: '1'
    }
  }
  sku: {
    name: 'Standard'
    capacity: 8
  }
  parent: aoai
  dependsOn: [
    embeddings
  ]
}

resource chat_lite 'Microsoft.CognitiveServices/accounts/deployments@2024-10-01' = {
  name: 'chat-lite'
  properties: {
    model: {
      format: 'OpenAI'
      name: 'gpt-4o-mini'
      version: '1'
    }
  }
  sku: {
    name: 'Standard'
    capacity: 8
  }
  parent: aoai
  dependsOn: [
    chat_basic
  ]
}

output connectionString string = 'Endpoint=${aoai.properties.endpoint}'

output endpoint string = aoai.properties.endpoint

output name string = aoai.name