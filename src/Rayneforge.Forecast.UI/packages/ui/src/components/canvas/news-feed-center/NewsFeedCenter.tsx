import React, { useCallback, useRef, useEffect } from 'react';
import type { NewsArticle } from '@rayneforge/logic';
import type { Attachment } from '../command-bar/CommandBar';
import './news-feed-center.scss';

// ─── Types ──────────────────────────────────────────────────────

export type SearchMode = 'simple' | 'semantic' | 'hybrid';

/** A reference pill embedded in a message (article, narrative, claim, entity) */
export interface EmbeddedRef {
    type: 'article' | 'narrative' | 'claim' | 'entity';
    id: string;
    label: string;
    icon: string;
}

/** A single chat message in the thread */
export interface ChatThreadMessage {
    id: string;
    role: 'user' | 'assistant' | 'system';
    text: string;
    /** Enriched reference pills extracted from / attached to the message */
    refs?: EmbeddedRef[];
    /** Attached items from command bar */
    attachments?: Attachment[];
    /** Optional article cards surfaced by the assistant */
    articles?: NewsArticle[];
    timestamp: number;
}

// ─── Props ──────────────────────────────────────────────────────

export interface NewsFeedCenterProps {
    messages: ChatThreadMessage[];
    dailyArticles: NewsArticle[];
    dailyLoading?: boolean;
    onPinArticle?: (article: NewsArticle) => void;
    onArticleClick?: (article: NewsArticle) => void;
    onRefClick?: (ref: EmbeddedRef) => void;
}

// ─── Helpers ────────────────────────────────────────────────────

function formatDate(iso: string): string {
    try {
        return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    } catch {
        return '';
    }
}

function formatTime(ts: number): string {
    try {
        return new Date(ts).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
    } catch {
        return '';
    }
}

// ─── Component ──────────────────────────────────────────────────

export const NewsFeedCenter: React.FC<NewsFeedCenterProps> = ({
    messages,
    dailyArticles,
    dailyLoading,
    onPinArticle,
    onArticleClick,
    onRefClick,
}) => {
    const listRef = useRef<HTMLDivElement>(null);

    // Auto-scroll to bottom on new messages
    useEffect(() => {
        if (listRef.current) {
            listRef.current.scrollTop = listRef.current.scrollHeight;
        }
    }, [messages.length]);

    const hasMsgs = messages.length > 0;

    return (
        <div className="rf-feed-center">
            <div className="rf-feed-center__thread" ref={listRef}>
                {/* ── Daily articles as welcome state ── */}
                {!hasMsgs && (
                    <div className="rf-feed-center__welcome">
                        <div className="rf-feed-center__welcome-title">Daily Feed</div>
                        <div className="rf-feed-center__welcome-sub">
                            Today's intelligence briefing. Pin items or ask questions below.
                        </div>
                    </div>
                )}

                {!hasMsgs && dailyLoading && (
                    <div className="rf-feed-center__loading">Loading daily news…</div>
                )}

                {!hasMsgs && !dailyLoading && dailyArticles.length === 0 && (
                    <div className="rf-feed-center__loading">No recent articles</div>
                )}

                {!hasMsgs && !dailyLoading && dailyArticles.map((article, i) => (
                    <FeedArticleCard
                        key={article.url + i}
                        article={article}
                        onPin={onPinArticle}
                        onClick={onArticleClick}
                    />
                ))}

                {/* ── Chat messages ── */}
                {messages.map(msg => (
                    <MessageBubble
                        key={msg.id}
                        message={msg}
                        onPinArticle={onPinArticle}
                        onArticleClick={onArticleClick}
                        onRefClick={onRefClick}
                    />
                ))}
            </div>
        </div>
    );
};

// ─── Message bubble ─────────────────────────────────────────────

const MessageBubble: React.FC<{
    message: ChatThreadMessage;
    onPinArticle?: (article: NewsArticle) => void;
    onArticleClick?: (article: NewsArticle) => void;
    onRefClick?: (ref: EmbeddedRef) => void;
}> = ({ message, onPinArticle, onArticleClick, onRefClick }) => {
    const isUser = message.role === 'user';
    const isSystem = message.role === 'system';

    return (
        <div className={`rf-msg rf-msg--${message.role}`}>
            <div className="rf-msg__avatar">
                {isUser ? '👤' : isSystem ? '🔔' : '✨'}
            </div>

            <div className="rf-msg__body">
                <div className="rf-msg__header">
                    <span className="rf-msg__author">
                        {isUser ? 'You' : isSystem ? 'System' : 'Rayneforge'}
                    </span>
                    <span className="rf-msg__time">{formatTime(message.timestamp)}</span>
                </div>

                {message.text && (
                    <div className="rf-msg__text">{message.text}</div>
                )}

                {/* ── Attachments (user-attached) ── */}
                {message.attachments && message.attachments.length > 0 && (
                    <div className="rf-msg__refs">
                        {message.attachments.map(a => (
                            <span key={a.id} className={`rf-msg__ref rf-msg__ref--${a.type}`}>
                                <span className="rf-msg__ref-icon">{a.icon}</span>
                                {a.label}
                            </span>
                        ))}
                    </div>
                )}

                {/* ── Enriched reference pills ── */}
                {message.refs && message.refs.length > 0 && (
                    <div className="rf-msg__refs">
                        {message.refs.map(ref => (
                            <button
                                key={ref.id}
                                className={`rf-msg__ref rf-msg__ref--${ref.type}`}
                                onClick={() => onRefClick?.(ref)}
                            >
                                <span className="rf-msg__ref-icon">{ref.icon}</span>
                                {ref.label}
                            </button>
                        ))}
                    </div>
                )}

                {/* ── Surfaced article cards ── */}
                {message.articles && message.articles.length > 0 && (
                    <div className="rf-msg__articles">
                        {message.articles.map((article, i) => (
                            <FeedArticleCard
                                key={article.url + i}
                                article={article}
                                onPin={onPinArticle}
                                onClick={onArticleClick}
                                compact
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

// ─── Article card ───────────────────────────────────────────────

const FeedArticleCard: React.FC<{
    article: NewsArticle;
    onPin?: (article: NewsArticle) => void;
    onClick?: (article: NewsArticle) => void;
    compact?: boolean;
}> = ({ article, onPin, onClick, compact }) => {
    const handleClick = useCallback(() => onClick?.(article), [article, onClick]);
    const handlePin = useCallback(
        (e: React.MouseEvent) => {
            e.stopPropagation();
            onPin?.(article);
        },
        [article, onPin],
    );

    return (
        <div className={`rf-feed-card${compact ? ' rf-feed-card--compact' : ''}`} onClick={handleClick}>
            <div className="rf-feed-card__row">
                <span className="rf-feed-card__source">{article.source.name}</span>
                <span className="rf-feed-card__date">{formatDate(article.publishedAt)}</span>
            </div>
            <div className="rf-feed-card__title">{article.title}</div>
            {!compact && article.description && (
                <div className="rf-feed-card__desc">{article.description}</div>
            )}
            {onPin && (
                <button className="rf-feed-card__pin" onClick={handlePin} title="Pin to workspace">
                    📌 Pin
                </button>
            )}
        </div>
    );
};
