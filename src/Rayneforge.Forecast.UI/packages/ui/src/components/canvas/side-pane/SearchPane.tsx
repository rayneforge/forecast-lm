import React, { useState, useCallback, KeyboardEvent } from 'react';
import type { NewsArticle } from '@rayneforge/logic';
import { SidePaneArticleCard } from './DailyFeedPane';
import './side-pane.scss';

/* ------------------------------------------------------------------ */
/*  SearchPane — independent right-side pane for news search           */
/* ------------------------------------------------------------------ */

export type SearchMode = 'simple' | 'semantic' | 'hybrid';

export interface SearchPaneProps {
    open: boolean;
    onClose: () => void;
    results: NewsArticle[];
    loading?: boolean;
    onSearch: (query: string, mode: SearchMode) => void;
    /** Called when user clicks "＋" to add an article to the canvas */
    onAddArticle?: (article: NewsArticle) => void;
    /** Called when user clicks an article card */
    onArticleClick?: (article: NewsArticle) => void;
}

const MODES: SearchMode[] = ['simple', 'semantic', 'hybrid'];

export const SearchPane: React.FC<SearchPaneProps> = ({
    open,
    onClose,
    results,
    loading,
    onSearch,
    onAddArticle,
    onArticleClick,
}) => {
    const [query, setQuery] = useState('');
    const [mode, setMode] = useState<SearchMode>('simple');

    const handleCycleMode = useCallback(() => {
        setMode(prev => MODES[(MODES.indexOf(prev) + 1) % MODES.length]);
    }, []);

    const handleKeyDown = useCallback(
        (e: KeyboardEvent<HTMLInputElement>) => {
            if (e.key === 'Enter' && query.trim()) {
                onSearch(query.trim(), mode);
            }
        },
        [query, mode, onSearch],
    );

    if (!open) return null;

    return (
        <div className="rf-side-pane rf-side-pane--right rf-side-pane--search">
            <div className="rf-side-pane__header">
                <span className="rf-side-pane__title">🔍 Search</span>
                <button className="rf-side-pane__close" onClick={onClose} title="Close">
                    ✕
                </button>
            </div>

            {/* Search input */}
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
                    autoFocus
                />
                <button
                    className="rf-side-pane__search-mode"
                    onClick={handleCycleMode}
                    title={`Search mode: ${mode}. Click to cycle.`}
                >
                    {mode}
                </button>
            </div>

            <div className="rf-side-pane__body">
                {loading ? (
                    <div className="rf-side-pane__empty">Searching…</div>
                ) : results.length === 0 ? (
                    <div className="rf-side-pane__empty">
                        {query ? 'No results' : 'Type a query and press Enter'}
                    </div>
                ) : (
                    <div className="rf-side-pane__list">
                        {results.map((article, i) => (
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
