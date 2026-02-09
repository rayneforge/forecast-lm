import React from 'react';
import { NewsArticle, EntitySchema } from '@rayneforge/logic';
import { TopBar } from '../components/top-bar/TopBar';
import { LensPanel, FilterSection } from '../components/lens-panel/LensPanel';
import { PinnedBoard, PinnedBoardProps } from '../components/pinned-board/PinnedBoard';
import { NewsCard } from '../components/news-card/NewsCard';
import { useEntitySchema } from '../hooks/useEntitySchema';

export interface NewsFeedPageProps {
    articles: NewsArticle[];
    pinnedItems: PinnedBoardProps['items'];
    isLensOpen: boolean;
    onToggleLens: () => void;
    onSearch: (query: string) => void;

    /**
     * When provided, the LensPanel is driven by these explicit filters
     * (backward-compatible). When omitted, the page fetches the
     * NewsArticle schema and auto-generates them.
     */
    filters?: FilterSection[];

    /**
     * Async function that returns the entity schema for auto-filter mode.
     * Typically: `() => client.getNewsSchema()`
     */
    schemaFetcher?: () => Promise<EntitySchema>;
}

export const NewsFeedPage: React.FC<NewsFeedPageProps> = ({
    articles,
    pinnedItems,
    filters: explicitFilters,
    schemaFetcher,
    isLensOpen,
    onToggleLens,
    onSearch
}) => {
    // If no explicit filters AND a schema fetcher is provided, auto-generate.
    const { filters: schemaFilters } = useEntitySchema({
        fetcher: schemaFetcher ?? (() => Promise.resolve({ entity: '', properties: [] })),
    });

    const filters = explicitFilters ?? schemaFilters;

    return (
        <div className="rf-app-layout" style={{ display: 'flex', flexDirection: 'column', height: '100vh', width: '100%' }}>
            <TopBar onSearch={onSearch} />
            
            <main style={{ display: 'flex', flex: 1, overflow: 'hidden', position: 'relative' }}>
                <LensPanel 
                    isOpen={isLensOpen} 
                    onToggle={onToggleLens}
                    filters={filters}
                />
                
                <section className="rf-feed" style={{ flex: 1, overflowY: 'auto', padding: '1rem', backgroundColor: 'var(--color-surface-2)' }}>
                    <div className="rf-feed__grid" style={{
                         display: 'grid',
                         gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
                         gap: '1rem'
                    }}>
                       {articles.map((article, i) => (
                           <NewsCard key={article.url || i} article={article} />
                       ))}
                    </div>
                </section>

                <PinnedBoard items={pinnedItems} />
            </main>
        </div>
    );
};
