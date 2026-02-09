/** A geographic scope path extracted from the article text */
export interface ArticleLocation {
    /** Hierarchical path e.g. "/world/europe/western-europe" */
    path: string;
    /** Short quote from the article proving the location */
    reference: string;
}

/** A topic classification extracted during narrative intake */
export interface ArticleTopic {
    /** Stable identifier for cross-article aggregation */
    id: string;
    /** Human-readable label */
    label: string;
    /** Optional relevance score 0–1 */
    confidence?: number;
}

export interface NewsArticle {
    title: string;
    description?: string;
    content?: string;
    url: string;
    imageUrl?: string;
    publishedAt: string;
    source: {
        id?: string;
        name: string;
    };
    tags?: string[];
    /** Structured topic classifications */
    topics?: ArticleTopic[];
    speculativeNarrative?: string;
    claims?: ArticleClaim[];
    /** Geographic scopes extracted during narrative intake */
    locations?: ArticleLocation[];
}

export interface Entity {
    id: string;
    entityType: 'Person' | 'Organization' | 'Place' | 'Concept';
    canonicalName: string;
    description?: string;
}

export interface ArticleClaim {
    id: string;
    normalizedText: string;
    articleId: string;
}

export interface Narrative {
    id: string;
    category: string;
    label: string;
    justification?: string;
    writeUp?: string;
    evidencePosture: 'New' | 'Synthesis' | 'Commentary';
    temporalFocus: 'Immediate' | 'Ongoing' | 'LongTerm';
}

// ─── Entity Schema (mirrors Domain.Models.EntitySchema) ─────────

export type SchemaFilterType = 'text' | 'enum' | 'dateRange' | 'toggle' | 'range';

export interface EntityPropertySchema {
    name: string;
    /** JSON-Schema-like type: "string" | "integer" | "number" | "boolean" | "datetime" | "enum" | "object" */
    type: string;
    description?: string;
    /** UI filter hint */
    filterType: SchemaFilterType;
    /** Populated when type === "enum" */
    enumValues?: string[];
    /** Dot-path to display property for complex objects */
    displayProperty?: string;
}

export interface EntitySchema {
    entity: string;
    properties: EntityPropertySchema[];
}

// ─── Workspace Models ───────────────────────────────────────────

export type LinkableItemType = 'Article' | 'Entity' | 'Claim' | 'Narrative' | 'Note' | 'Topic';

export interface WorkspaceLink {
    id: string;
    workspaceId: string;
    /** External item ID — null/empty for Note and Topic types */
    linkedItemId?: string;
    linkedItemType: LinkableItemType;
    /** Display title (required for Note/Topic, optional for referenced items) */
    title?: string;
    /** Body text — primarily for Notes */
    body?: string;
    /** User annotation */
    note?: string;
    /** Color tag (hex or named) */
    color?: string;
    linkedAt: string;
    sortOrder: number;
}

export interface Workspace {
    id: string;
    userId: string;
    name: string;
    description?: string;
    createdAt: string;
    updatedAt?: string;
    layoutJson?: string;
    links: WorkspaceLink[];
    threads: ConversationThread[];
}

export interface ConversationThread {
    id: string;
    userId: string;
    workspaceId?: string;
    createdAt: string;
    lastMessageAt?: string;
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
}

export interface CreateWorkspaceRequest {
    name: string;
    description?: string;
}

export interface UpdateWorkspaceRequest {
    name?: string;
    description?: string;
    layoutJson?: string;
}

export interface AddLinkRequest {
    linkedItemId?: string;
    linkedItemType: LinkableItemType;
    title?: string;
    body?: string;
    note?: string;
    color?: string;
    sortOrder?: number;
}

export interface UpdateLinkRequest {
    title?: string;
    body?: string;
    note?: string;
    color?: string;
    sortOrder?: number;
}

/**
 * Callback that returns auth headers to attach to every API request.
 * In production it returns `{ Authorization: 'Bearer <token>' }`.
 * In dev mode it returns `{ 'X-Dev-User': '...', 'X-Dev-Roles': '...' }`.
 */
export type AuthHeaderProvider = () => Promise<Record<string, string>>;

export class NewsClient {
    private baseUrl: string;
    private authHeaders?: AuthHeaderProvider;

    constructor(baseUrl: string, authHeaders?: AuthHeaderProvider) {
        this.baseUrl = baseUrl;
        this.authHeaders = authHeaders;
    }

    private async fetchWithAuth(url: string | URL, init?: RequestInit): Promise<Response> {
        const headers: Record<string, string> = {
            ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
        };
        if (this.authHeaders) {
            Object.assign(headers, await this.authHeaders());
        }
        return fetch(url.toString(), { ...init, headers });
    }

    async getNews(): Promise<NewsArticle[]> {
        const response = await this.fetchWithAuth(`${this.baseUrl}/api/news`);
        if (!response.ok) {
            throw new Error(`Failed to fetch news: ${response.statusText}`);
        }
        return response.json();
    }

    // ─── Schemas ───

    async getNewsSchema(): Promise<EntitySchema> {
        const response = await this.fetchWithAuth(`${this.baseUrl}/api/news/schema`);
        if (!response.ok) throw new Error(`Failed to fetch news schema: ${response.statusText}`);
        return response.json();
    }

    async getEntitiesSchema(): Promise<EntitySchema> {
        const response = await this.fetchWithAuth(`${this.baseUrl}/api/entities/schema`);
        if (!response.ok) throw new Error(`Failed to fetch entities schema: ${response.statusText}`);
        return response.json();
    }

    async getNarrativesSchema(): Promise<EntitySchema> {
        const response = await this.fetchWithAuth(`${this.baseUrl}/api/narratives/schema`);
        if (!response.ok) throw new Error(`Failed to fetch narratives schema: ${response.statusText}`);
        return response.json();
    }
    
    async getRecentNews(): Promise<NewsArticle[]> {
        const response = await this.fetchWithAuth(`${this.baseUrl}/api/news/recent`);
        if (!response.ok) {
            throw new Error(`Failed to fetch recent news: ${response.statusText}`);
        }
        return response.json();
    }

    async searchNews(query: string, mode: 'simple' | 'semantic' | 'hybrid' = 'simple'): Promise<NewsArticle[]> {
        const url = new URL(`${this.baseUrl}/api/news/search`);
        url.searchParams.append('q', query);
        url.searchParams.append('mode', mode);
        
        const response = await this.fetchWithAuth(url.toString());
        if (!response.ok) {
            throw new Error(`Failed to search news: ${response.statusText}`);
        }
        return response.json();
    }

    // ─── Entities ───

    async getEntities(): Promise<Entity[]> {
        const response = await this.fetchWithAuth(`${this.baseUrl}/api/entities`);
        if (!response.ok) throw new Error(`Failed to fetch entities: ${response.statusText}`);
        return response.json();
    }

    async searchEntities(query: string, mode: 'simple' | 'semantic' | 'hybrid' = 'simple'): Promise<Entity[]> {
        const url = new URL(`${this.baseUrl}/api/entities/search`);
        url.searchParams.append('q', query);
        url.searchParams.append('mode', mode);
        
        const response = await this.fetchWithAuth(url.toString());
        if (!response.ok) throw new Error(`Failed to search entities: ${response.statusText}`);
        return response.json();
    }

    async getEntitiesForArticle(articleId: string): Promise<Entity[]> {
         const response = await this.fetchWithAuth(`${this.baseUrl}/api/entities/related-to-article/${encodeURIComponent(articleId)}`);
         if (!response.ok) throw new Error(`Failed to fetch entities for article: ${response.statusText}`);
         return response.json();
    }

    // ─── Narratives ───

    async getNarratives(): Promise<Narrative[]> {
        const response = await this.fetchWithAuth(`${this.baseUrl}/api/narratives`);
        if (!response.ok) throw new Error(`Failed to fetch narratives: ${response.statusText}`);
        return response.json();
    }

    async searchNarratives(query: string, mode: 'simple' | 'semantic' | 'hybrid' = 'simple'): Promise<Narrative[]> {
        const url = new URL(`${this.baseUrl}/api/narratives/search`);
        url.searchParams.append('q', query);
        url.searchParams.append('mode', mode);
        
        const response = await this.fetchWithAuth(url.toString());
        if (!response.ok) throw new Error(`Failed to search narratives: ${response.statusText}`);
        return response.json();
    }

    async getNarrativesForArticle(articleId: string): Promise<Narrative[]> {
         const response = await this.fetchWithAuth(`${this.baseUrl}/api/narratives/related-to-article/${encodeURIComponent(articleId)}`);
         if (!response.ok) throw new Error(`Failed to fetch narratives for article: ${response.statusText}`);
         return response.json();
    }

    async getNarrativesForEntity(entityId: string): Promise<Narrative[]> {
         const response = await this.fetchWithAuth(`${this.baseUrl}/api/narratives/related-to-entity/${encodeURIComponent(entityId)}`);
         if (!response.ok) throw new Error(`Failed to fetch narratives for entity: ${response.statusText}`);
         return response.json();
    }

    // ─── Workspaces ───

    async getWorkspaces(): Promise<Workspace[]> {
        const response = await this.fetchWithAuth(`${this.baseUrl}/api/workspaces`);
        if (!response.ok) throw new Error(`Failed to fetch workspaces: ${response.statusText}`);
        return response.json();
    }

    async getWorkspace(id: string): Promise<Workspace> {
        const response = await this.fetchWithAuth(`${this.baseUrl}/api/workspaces/${encodeURIComponent(id)}`);
        if (!response.ok) throw new Error(`Failed to fetch workspace: ${response.statusText}`);
        return response.json();
    }

    async createWorkspace(request: CreateWorkspaceRequest): Promise<Workspace> {
        const response = await this.fetchWithAuth(`${this.baseUrl}/api/workspaces`, {
            method: 'POST',
            body: JSON.stringify(request),
        });
        if (!response.ok) throw new Error(`Failed to create workspace: ${response.statusText}`);
        return response.json();
    }

    async updateWorkspace(id: string, request: UpdateWorkspaceRequest): Promise<Workspace> {
        const response = await this.fetchWithAuth(`${this.baseUrl}/api/workspaces/${encodeURIComponent(id)}`, {
            method: 'PATCH',
            body: JSON.stringify(request),
        });
        if (!response.ok) throw new Error(`Failed to update workspace: ${response.statusText}`);
        return response.json();
    }

    async deleteWorkspace(id: string): Promise<void> {
        const response = await this.fetchWithAuth(`${this.baseUrl}/api/workspaces/${encodeURIComponent(id)}`, {
            method: 'DELETE',
        });
        if (!response.ok) throw new Error(`Failed to delete workspace: ${response.statusText}`);
    }

    // ─── Workspace Links ───

    async getWorkspaceLinks(workspaceId: string): Promise<WorkspaceLink[]> {
        const response = await this.fetchWithAuth(`${this.baseUrl}/api/workspaces/${encodeURIComponent(workspaceId)}/links`);
        if (!response.ok) throw new Error(`Failed to fetch workspace links: ${response.statusText}`);
        return response.json();
    }

    async addWorkspaceLink(workspaceId: string, request: AddLinkRequest): Promise<WorkspaceLink> {
        const response = await this.fetchWithAuth(`${this.baseUrl}/api/workspaces/${encodeURIComponent(workspaceId)}/links`, {
            method: 'POST',
            body: JSON.stringify(request),
        });
        if (!response.ok) throw new Error(`Failed to add workspace link: ${response.statusText}`);
        return response.json();
    }

    async updateWorkspaceLink(workspaceId: string, linkId: string, request: UpdateLinkRequest): Promise<WorkspaceLink> {
        const response = await this.fetchWithAuth(
            `${this.baseUrl}/api/workspaces/${encodeURIComponent(workspaceId)}/links/${encodeURIComponent(linkId)}`,
            { method: 'PATCH', body: JSON.stringify(request) },
        );
        if (!response.ok) throw new Error(`Failed to update workspace link: ${response.statusText}`);
        return response.json();
    }

    async removeWorkspaceLink(workspaceId: string, linkId: string): Promise<void> {
        const response = await this.fetchWithAuth(
            `${this.baseUrl}/api/workspaces/${encodeURIComponent(workspaceId)}/links/${encodeURIComponent(linkId)}`,
            { method: 'DELETE' },
        );
        if (!response.ok) throw new Error(`Failed to remove workspace link: ${response.statusText}`);
    }
}
