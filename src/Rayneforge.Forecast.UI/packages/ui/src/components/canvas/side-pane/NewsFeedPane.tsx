import React, { useState, useCallback, KeyboardEvent } from 'react';
import type { NewsArticle } from '@rayneforge/logic';
import { SidePaneArticleCard } from './DailyFeedPane';
import './side-pane.scss';

/* ------------------------------------------------------------------ */
/*  NewsFeedPane — unified news pane: search bar + daily articles      */
/*  When a search is active, results replace the daily feed below.     */
/* ------------------------------------------------------------------ */

export type SearchMode = 'simple' | 'semantic' | 'hybrid';

export interface NewsFeedPaneProps {
    open: boolean;
    onClose: () => void;

    /* ── Daily feed ── */
    dailyArticles: NewsArticle[];
    dailyLoading?: boolean;

    /* ── Search ── */
    searchResults: NewsArticle[];
    searchLoading?: boolean;
    onSearch: (query: string, mode: SearchMode) => void;

    /** Called when user clicks "＋" to add an article to the canvas */
    onAddArticle?: (article: NewsArticle) => void;
    /** Called when user clicks an article card (preview) */
    onArticleClick?: (article: NewsArticle) => void;
}

const MODES: SearchMode[] = ['simple', 'semantic', 'hybrid'];

export const NewsFeedPane: React.FC<NewsFeedPaneProps> = ({
    open,
    onClose,
    dailyArticles,
    dailyLoading,
    searchResults,
    searchLoading,
    onSearch,
    onAddArticle,
    onArticleClick,
}) => {
    const [query, setQuery] = useState('');
    const [mode, setMode] = useState<SearchMode>('simple');
    const [hasSearched, setHasSearched] = useState(false);

    const handleCycleMode = useCallback(() => {
        setMode(prev => MODES[(MODES.indexOf(prev) + 1) % MODES.length]);
    }, []);

    const handleKeyDown = useCallback(
        (e: KeyboardEvent<HTMLInputElement>) => {
            if (e.key === 'Enter' && query.trim()) {
                setHasSearched(true);
                onSearch(query.trim(), mode);
            }
        },
        [query, mode, onSearch],
    );

    const handleClearSearch = useCallback(() => {
        setQuery('');
        setHasSearched(false);
    }, []);

    if (!open) return null;

    // Show search results if user has searched, otherwise daily feed
    const showingSearch = hasSearched && query.trim().length > 0;
    const articles = showingSearch ? searchResults : dailyArticles;
    const loading  = showingSearch ? searchLoading : dailyLoading;

    return (
        <div className="rf-side-pane rf-side-pane--right">
            <div className="rf-side-pane__header">
                <span className="rf-side-pane__title">📰 News</span>
                <button className="rf-side-pane__close" onClick={onClose} title="Close">
                    ✕
                </button>
            </div>

            {/* ── Search bar (always visible) ── */}
            <div className="rf-side-pane__search-row">
                <span className="rf-side-pane__search-icon">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                        <path d="M10.68 11.74a6 6 0 0 1-7.922-8.98 6 6 0 0 1 8.98 7.922l3.5 3.5a.75.75 0 0 1-1.06 1.06l-3.5-3.5ZM11.25 7a4.25 4.25 0 1 1-8.5 0 4.25 4.25 0 0 1 8.5 0Z" />
                    </svg>
                </span>
                <input
                    type="text"
                    className="rf-side-pane__search-input"
                    placeholder="Search news…"
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    onKeyDown={handleKeyDown}
                />
                {showingSearch && (
                    <button
                        className="rf-side-pane__search-clear"
                        onClick={handleClearSearch}
                        title="Clear search — back to daily feed"
                    >
                        ✕
                    </button>
                )}
                <button
                    className="rf-side-pane__search-mode"
                    onClick={handleCycleMode}
                    title={`Search mode: ${mode}. Click to cycle.`}
                >
                    {mode}
                </button>
            </div>

            {/* ── Section label ── */}
            <div className="rf-side-pane__section-label">
                {showingSearch ? `Results for "${query}"` : 'Daily Feed'}
            </div>

            {/* ── Articles ── */}
            <div className="rf-side-pane__body">
                {loading ? (
                    <div className="rf-side-pane__empty">
                        {showingSearch ? 'Searching…' : 'Loading daily news…'}
                    </div>
                ) : articles.length === 0 ? (
                    <div className="rf-side-pane__empty">
                        {showingSearch ? 'No results found' : 'No recent articles'}
                    </div>
                ) : (
                    <div className="rf-side-pane__list">
                        {articles.map((article, i) => (
                            <SidePaneArticleCard
                                key={article.url + i}
                                article={article}
                                onAdd={onAddArticle}
                                onClick={onArticleClick}
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};
