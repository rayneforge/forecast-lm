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
    speculativeNarrative?: string;
    claims?: ArticleClaim[];
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
        const headers: Record<string, string> = {};
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
}
