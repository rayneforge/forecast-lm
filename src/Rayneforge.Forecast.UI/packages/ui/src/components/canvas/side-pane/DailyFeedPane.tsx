import React, { useCallback } from 'react';
import type { NewsArticle } from '@rayneforge/logic';
import './side-pane.scss';

/* ------------------------------------------------------------------ */
/*  DailyFeedPane — independent right-side pane for daily articles     */
/* ------------------------------------------------------------------ */

export interface DailyFeedPaneProps {
    open: boolean;
    onClose: () => void;
    articles: NewsArticle[];
    loading?: boolean;
    /** Called when user clicks "＋" to add an article to the canvas */
    onAddArticle?: (article: NewsArticle) => void;
    /** Called when user clicks an article card */
    onArticleClick?: (article: NewsArticle) => void;
}

function formatDate(iso: string): string {
    try {
        return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    } catch {
        return '';
    }
}

export const DailyFeedPane: React.FC<DailyFeedPaneProps> = ({
    open,
    onClose,
    articles,
    loading,
    onAddArticle,
    onArticleClick,
}) => {
    if (!open) return null;

    return (
        <div className="rf-side-pane rf-side-pane--right">
            <div className="rf-side-pane__header">
                <span className="rf-side-pane__title">📰 Daily Feed</span>
                <button className="rf-side-pane__close" onClick={onClose} title="Close">
                    ✕
                </button>
            </div>

            <div className="rf-side-pane__body">
                {loading ? (
                    <div className="rf-side-pane__empty">Loading daily news…</div>
                ) : articles.length === 0 ? (
                    <div className="rf-side-pane__empty">No recent articles</div>
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

/* ── Shared mini article card ──────────────────────────────────── */

export interface SidePaneArticleCardProps {
    article: NewsArticle;
    onAdd?: (article: NewsArticle) => void;
    onClick?: (article: NewsArticle) => void;
}

export const SidePaneArticleCard: React.FC<SidePaneArticleCardProps> = ({ article, onAdd, onClick }) => {
    const handleClick = useCallback(() => onClick?.(article), [article, onClick]);
    const handleAdd = useCallback(
        (e: React.MouseEvent) => {
            e.stopPropagation();
            onAdd?.(article);
        },
        [article, onAdd],
    );

    return (
        <div className="rf-side-pane__card" onClick={handleClick}>
            <div className="rf-side-pane__card-source">
                <span>{article.source.name}</span>
                {onAdd && (
                    <button className="rf-side-pane__card-add" onClick={handleAdd} title="Add to canvas">
                        ＋
                    </button>
                )}
            </div>
            <div className="rf-side-pane__card-title">{article.title}</div>
            <div className="rf-side-pane__card-date">{formatDate(article.publishedAt)}</div>
        </div>
    );
};
