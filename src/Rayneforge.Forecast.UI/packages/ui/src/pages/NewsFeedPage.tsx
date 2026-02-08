import React from 'react';
import { NewsArticle } from '@rayneforge/logic';
import { TopBar } from '../components/top-bar/TopBar';
import { LensPanel, FilterSection } from '../components/lens-panel/LensPanel';
import { PinnedBoard, PinnedBoardProps } from '../components/pinned-board/PinnedBoard';
import { NewsCard } from '../components/news-card/NewsCard';

export interface NewsFeedPageProps {
    articles: NewsArticle[];
    pinnedItems: PinnedBoardProps['items'];
    filters: FilterSection[];
    isLensOpen: boolean;
    onToggleLens: () => void;
    onSearch: (query: string) => void;
}

export const NewsFeedPage: React.FC<NewsFeedPageProps> = ({
    articles,
    pinnedItems,
    filters,
    isLensOpen,
    onToggleLens,
    onSearch
}) => {
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
