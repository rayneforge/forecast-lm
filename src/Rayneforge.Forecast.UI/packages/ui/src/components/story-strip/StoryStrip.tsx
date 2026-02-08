import React from 'react';
import { NewsArticle } from '@rayneforge/logic';
import { Chip } from '../chip/Chip';

export interface StoryStripProps {
    article: NewsArticle;
    state?: 'collapsed' | 'peek' | 'inspect';
    onPin?: () => void;
    onExpand?: () => void;
}

export const StoryStrip: React.FC<StoryStripProps> = ({ 
    article, 
    state = 'collapsed', 
    onPin, 
    onExpand 
}) => {
    let dateStr = "";
    try {
        // Handle both ISO strings and generic date strings safely
         dateStr = new Date(article.publishedAt).toLocaleDateString(undefined, { 
            month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
        });
    } catch(e) { dateStr = article.publishedAt; }

    return (
        <article className={`rf-story-strip rf-story-strip--${state}`}>
            {/* Signal Bar */}
            <div className="rf-story-strip__signal" />
            
            {/* Content Container */}
            <div className="rf-story-strip__content">
                {/* Meta Row */}
                <div className="rf-story-strip__meta">
                    <span className="rf-story-strip__source">{article.source.name}</span>
                    <span className="rf-story-strip__divider">·</span>
                    <time className="rf-story-strip__time">{dateStr}</time>
                </div>

                {/* Headline */}
                <h3 className="rf-story-strip__headline">{article.title}</h3>

                {/* Entity Chips */}
                {article.tags && article.tags.length > 0 && (
                    <div className="rf-story-strip__entities" style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                        {article.tags.map((tag, index) => (
                            <Chip key={`${tag}-${index}`} label={tag} variant="entity" />
                        ))}
                    </div>
                )}
                
                {/* Details (Peek/Inspect) */}
                {state !== 'collapsed' && (
                    <div className="rf-story-strip__details">
                        <p className="rf-story-strip__summary">
                            {article.description || 'No summary available.'}
                        </p>
                    </div>
                )}
            </div>

            {/* Actions */}
            <div className="rf-story-strip__actions">
                <button 
                    className="rf-icon-btn" 
                    aria-label="Pin story"
                    onClick={onPin}
                >
                    📌
                </button>
                <button 
                    className="rf-icon-btn" 
                    aria-label="Expand story"
                    onClick={onExpand}
                >
                    ⌄
                </button>
            </div>
        </article>
    );
};
