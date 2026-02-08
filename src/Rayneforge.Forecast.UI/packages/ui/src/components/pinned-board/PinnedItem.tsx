import React from 'react';
import { NewsArticle } from '@rayneforge/logic';
import './pinned-board.scss'; 

export interface PinnedItemProps {
    article: NewsArticle;
    note?: string;
    onUnpin?: () => void;
}

export const PinnedItem: React.FC<PinnedItemProps> = ({ article, note, onUnpin }) => {
    return (
        <article className="rf-pinned-item" onClick={(e) => e.stopPropagation()}>
            <div className="rf-pinned-item__header">
                <span className="rf-pinned-item__icon">📌</span>
                <h4 className="rf-pinned-item__title">{article.title}</h4>
            </div>
            
            <div className="rf-pinned-item__meta">{article.source.name}</div>
            
            {note && (
                <div className="rf-pinned-item__note">{note}</div>
            )}

            {onUnpin && (
                <button 
                    className="rf-pinned-item__close" 
                    aria-label="Unpin"
                    onClick={(e) => {
                        e.stopPropagation();
                        onUnpin();
                    }}
                >
                    ×
                </button>
            )}
        </article>
    );
};
