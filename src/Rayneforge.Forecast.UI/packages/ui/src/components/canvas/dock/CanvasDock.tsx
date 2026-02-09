import React, { useState, useCallback, KeyboardEvent } from 'react';
import type { DockPanelId } from '../../../canvas/CanvasTypes';
import type { NewsArticle } from '@rayneforge/logic';
import './canvas-dock.scss';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export type SearchMode = 'simple' | 'semantic' | 'hybrid';

export interface CanvasDockProps {
    /** Which tab is expanded (null = collapsed) */
    activePanel: DockPanelId | null;
    /** Toggle a dock panel open/closed */
    onSetPanel: (panel: DockPanelId | null) => void;

    /* Daily feed */
    dailyArticles: NewsArticle[];
    dailyLoading?: boolean;

    /* Search */
    searchResults: NewsArticle[];
    searchLoading?: boolean;
    onSearch: (query: string, mode: SearchMode) => void;

    /** Called when user clicks "＋" to add an article to the canvas */
    onAddArticle?: (article: NewsArticle) => void;
    /** Called when user clicks an article card */
    onArticleClick?: (article: NewsArticle) => void;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

const SEARCH_MODES: SearchMode[] = ['simple', 'semantic', 'hybrid'];

function formatDate(iso: string): string {
    try {
        return new Date(iso).toLocaleDateString(undefined, {
            month: 'short',
            day: 'numeric',
        });
    } catch {
        return '';
    }
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export const CanvasDock: React.FC<CanvasDockProps> = ({
    activePanel,
    onSetPanel,
    dailyArticles,
    dailyLoading,
    searchResults,
    searchLoading,
    onSearch,
    onAddArticle,
    onArticleClick,
}) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [searchMode, setSearchMode] = useState<SearchMode>('simple');

    /* Toggle tab: same tab → close, different tab → switch */
    const handleTabClick = useCallback(
        (panel: DockPanelId) => {
            onSetPanel(activePanel === panel ? null : panel);
        },
        [activePanel, onSetPanel],
    );

    /* Cycle search mode */
    const handleCycleMode = useCallback(() => {
        setSearchMode(prev => {
            const idx = SEARCH_MODES.indexOf(prev);
            return SEARCH_MODES[(idx + 1) % SEARCH_MODES.length];
        });
    }, []);

    /* Search on Enter */
    const handleSearchKeyDown = useCallback(
        (e: KeyboardEvent<HTMLInputElement>) => {
            if (e.key === 'Enter' && searchQuery.trim()) {
                onSearch(searchQuery.trim(), searchMode);
            }
        },
        [searchQuery, searchMode, onSearch],
    );

    return (
        <div className="rf-canvas-dock">
            {/* ── Tabs ── */}
            <div className="rf-canvas-dock__tabs">
                <button
                    className={`rf-canvas-dock__tab ${activePanel === 'daily' ? 'rf-canvas-dock__tab--active' : ''}`}
                    onClick={() => handleTabClick('daily')}
                >
                    📰 Daily
                </button>
                <button
                    className={`rf-canvas-dock__tab ${activePanel === 'search' ? 'rf-canvas-dock__tab--active' : ''}`}
                    onClick={() => handleTabClick('search')}
                >
                    🔍 Search
                </button>
            </div>

            {/* ── Panel ── */}
            {activePanel === 'daily' && (
                <div className="rf-canvas-dock__panel" key="daily">
                    {dailyLoading ? (
                        <div className="rf-canvas-dock__loading">Loading daily news…</div>
                    ) : dailyArticles.length === 0 ? (
                        <div className="rf-canvas-dock__empty">No recent articles</div>
                    ) : (
                        <div className="rf-canvas-dock__list">
                            {dailyArticles.map((article, i) => (
                                <ArticleCard
                                    key={article.url + i}
                                    article={article}
                                    onAdd={onAddArticle}
                                    onClick={onArticleClick}
                                />
                            ))}
                        </div>
                    )}
                </div>
            )}

            {activePanel === 'search' && (
                <div className="rf-canvas-dock__panel" key="search">
                    {/* Search input row */}
                    <div className="rf-canvas-dock__search-row">
                        <span className="rf-canvas-dock__search-icon">
                            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                                <path d="M10.68 11.74a6 6 0 0 1-7.922-8.98 6 6 0 0 1 8.98 7.922l3.5 3.5a.75.75 0 0 1-1.06 1.06l-3.5-3.5ZM11.25 7a4.25 4.25 0 1 1-8.5 0 4.25 4.25 0 0 1 8.5 0Z" />
                            </svg>
                        </span>
                        <input
                            type="text"
                            className="rf-canvas-dock__search-input"
                            placeholder="Search news…"
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            onKeyDown={handleSearchKeyDown}
                            autoFocus
                        />
                        <button
                            className="rf-canvas-dock__search-mode"
                            onClick={handleCycleMode}
                            title={`Search mode: ${searchMode}. Click to cycle.`}
                        >
                            {searchMode}
                        </button>
                    </div>

                    {/* Results */}
                    {searchLoading ? (
                        <div className="rf-canvas-dock__loading">Searching…</div>
                    ) : searchResults.length === 0 ? (
                        <div className="rf-canvas-dock__empty">
                            {searchQuery ? 'No results' : 'Type a query and press Enter'}
                        </div>
                    ) : (
                        <div className="rf-canvas-dock__list">
                            {searchResults.map((article, i) => (
                                <ArticleCard
                                    key={article.url + i}
                                    article={article}
                                    onAdd={onAddArticle}
                                    onClick={onArticleClick}
                                />
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

/* ------------------------------------------------------------------ */
/*  Mini article card                                                  */
/* ------------------------------------------------------------------ */

interface ArticleCardProps {
    article: NewsArticle;
    onAdd?: (article: NewsArticle) => void;
    onClick?: (article: NewsArticle) => void;
}

const ArticleCard: React.FC<ArticleCardProps> = ({ article, onAdd, onClick }) => {
    const handleClick = useCallback(() => onClick?.(article), [article, onClick]);
    const handleAdd = useCallback(
        (e: React.MouseEvent) => {
            e.stopPropagation();
            onAdd?.(article);
        },
        [article, onAdd],
    );

    return (
        <div className="rf-canvas-dock__article" onClick={handleClick}>
            <div className="rf-canvas-dock__article-source">
                <span>{article.source.name}</span>
                {onAdd && (
                    <button className="rf-canvas-dock__article-add" onClick={handleAdd} title="Add to canvas">
                        ＋
                    </button>
                )}
            </div>
            <div className="rf-canvas-dock__article-title">{article.title}</div>
            <div className="rf-canvas-dock__article-date">{formatDate(article.publishedAt)}</div>
        </div>
    );
};
