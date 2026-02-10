@description('The location for the resource(s) to be deployed.')
param location string = resourceGroup().location

resource cosmos 'Microsoft.DocumentDB/databaseAccounts@2024-08-15' = {
  name: take('cosmos-${uniqueString(resourceGroup().id)}', 44)
  location: location
  properties: {
    locations: [
      {
        locationName: location
        failoverPriority: 0
      }
    ]
    capabilities: [
      {
        name: 'EnableServerless'
      }
    ]
    consistencyPolicy: {
      defaultConsistencyLevel: 'Session'
    }
    databaseAccountOfferType: 'Standard'
    disableLocalAuth: true
  }
  kind: 'GlobalDocumentDB'
  tags: {
    'aspire-resource-name': 'cosmos'
  }
}

resource NewsDb 'Microsoft.DocumentDB/databaseAccounts/sqlDatabases@2024-08-15' = {
  name: 'NewsDb'
  location: location
  properties: {
    resource: {
      id: 'NewsDb'
    }
  }
  parent: cosmos
}

resource news 'Microsoft.DocumentDB/databaseAccounts/sqlDatabases/containers@2024-08-15' = {
  name: 'news'
  location: location
  properties: {
    resource: {
      id: 'news'
      partitionKey: {
        paths: [
          '/id'
        ]
        kind: 'Hash'
      }
    }
  }
  parent: NewsDb
}

resource entities 'Microsoft.DocumentDB/databaseAccounts/sqlDatabases/containers@2024-08-15' = {
  name: 'entities'
  location: location
  properties: {
    resource: {
      id: 'entities'
      partitionKey: {
        paths: [
          '/id'
        ]
        kind: 'Hash'
      }
    }
  }
  parent: NewsDb
}

resource claims 'Microsoft.DocumentDB/databaseAccounts/sqlDatabases/containers@2024-08-15' = {
  name: 'claims'
  location: location
  properties: {
    resource: {
      id: 'claims'
      partitionKey: {
        paths: [
          '/articleId'
        ]
        kind: 'Hash'
      }
    }
  }
  parent: NewsDb
}

resource narratives 'Microsoft.DocumentDB/databaseAccounts/sqlDatabases/containers@2024-08-15' = {
  name: 'narratives'
  location: location
  properties: {
    resource: {
      id: 'narratives'
      partitionKey: {
        paths: [
          '/id'
        ]
        kind: 'Hash'
      }
    }
  }
  parent: NewsDb
}

resource claim_entities 'Microsoft.DocumentDB/databaseAccounts/sqlDatabases/containers@2024-08-15' = {
  name: 'claim-entities'
  location: location
  properties: {
    resource: {
      id: 'claim-entities'
      partitionKey: {
        paths: [
          '/claimId'
        ]
        kind: 'Hash'
      }
    }
  }
  parent: NewsDb
}

resource narrative_claims 'Microsoft.DocumentDB/databaseAccounts/sqlDatabases/containers@2024-08-15' = {
  name: 'narrative-claims'
  location: location
  properties: {
    resource: {
      id: 'narrative-claims'
      partitionKey: {
        paths: [
          '/narrativeId'
        ]
        kind: 'Hash'
      }
    }
  }
  parent: NewsDb
}

resource narrative_entities 'Microsoft.DocumentDB/databaseAccounts/sqlDatabases/containers@2024-08-15' = {
  name: 'narrative-entities'
  location: location
  properties: {
    resource: {
      id: 'narrative-entities'
      partitionKey: {
        paths: [
          '/narrativeId'
        ]
        kind: 'Hash'
      }
    }
  }
  parent: NewsDb
}

resource UserDb 'Microsoft.DocumentDB/databaseAccounts/sqlDatabases@2024-08-15' = {
  name: 'UserDb'
  location: location
  properties: {
    resource: {
      id: 'UserDb'
    }
  }
  parent: cosmos
}

resource threads 'Microsoft.DocumentDB/databaseAccounts/sqlDatabases/containers@2024-08-15' = {
  name: 'threads'
  location: location
  properties: {
    resource: {
      id: 'threads'
      partitionKey: {
        paths: [
          '/userId'
        ]
        kind: 'Hash'
      }
    }
  }
  parent: UserDb
}

resource messages 'Microsoft.DocumentDB/databaseAccounts/sqlDatabases/containers@2024-08-15' = {
  name: 'messages'
  location: location
  properties: {
    resource: {
      id: 'messages'
      partitionKey: {
        paths: [
          '/threadId'
        ]
        kind: 'Hash'
      }
    }
  }
  parent: UserDb
}

resource workspaces 'Microsoft.DocumentDB/databaseAccounts/sqlDatabases/containers@2024-08-15' = {
  name: 'workspaces'
  location: location
  properties: {
    resource: {
      id: 'workspaces'
      partitionKey: {
        paths: [
          '/userId'
        ]
        kind: 'Hash'
      }
    }
  }
  parent: UserDb
}

resource workspace_links 'Microsoft.DocumentDB/databaseAccounts/sqlDatabases/containers@2024-08-15' = {
  name: 'workspace-links'
  location: location
  properties: {
    resource: {
      id: 'workspace-links'
      partitionKey: {
        paths: [
          '/workspaceId'
        ]
        kind: 'Hash'
      }
    }
  }
  parent: UserDb
}

output connectionString string = cosmos.properties.documentEndpoint

output name string = cosmos.name