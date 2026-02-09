import React from 'react';
import type { LinkableItemType } from '@rayneforge/logic';
import './pinned-item.scss';

export interface PinnedItemProps {
    /** Unique link ID */
    id: string;
    /** Display title of the linked item */
    title: string;
    /** Secondary info (source, entity type, etc.) */
    subtitle?: string;
    /** Discriminator for icon/color */
    itemType: LinkableItemType;
    /** Optional user note */
    note?: string;
    /** Nested Items (e.g. claims under an article) */
    subItems?: PinnedItemProps[];
    onUnpin?: (id: string) => void;
    onClick?: (id: string) => void;
}

const typeIcons: Record<LinkableItemType, string> = {
    Article: '📰',
    Entity: '🏷️',
    Claim: '💬',
    Narrative: '📊',
    Note: '📝',
    Topic: '🔮',
};

export const PinnedItem: React.FC<PinnedItemProps> = ({
    id,
    title,
    subtitle,
    itemType,
    note,
    subItems,
    onUnpin,
    onClick,
}) => {
    return (
        <article
            className={`rf-pinned-item rf-pinned-item--${itemType.toLowerCase()}`}
            onClick={() => onClick?.(id)}
        >
            <div className="rf-pinned-item__header">
                <span className="rf-pinned-item__icon">{typeIcons[itemType]}</span>
                <h4 className="rf-pinned-item__title">{title}</h4>
            </div>

            {subtitle && (
                <div className="rf-pinned-item__meta">{subtitle}</div>
            )}

            {note && (
                <div className="rf-pinned-item__note">{note}</div>
            )}

            {subItems && subItems.length > 0 && (
                <div className="rf-pinned-item__sub-items">
                    {subItems.map((sub) => (
                        <div
                            key={sub.id}
                            className="rf-pinned-item__sub-pill"
                            onClick={(e) => {
                                e.stopPropagation();
                                onClick?.(sub.id);
                            }}
                        >
                            <span className="rf-pinned-item__sub-icon">{typeIcons[sub.itemType]}</span>
                            <span className="rf-pinned-item__sub-title">{sub.title}</span>
                        </div>
                    ))}
                </div>
            )}

            {onUnpin && (
                <button
                    className="rf-pinned-item__close"
                    aria-label="Unpin"
                    onClick={(e) => {
                        e.stopPropagation();
                        onUnpin(id);
                    }}
                >
                    ×
                </button>
            )}
        </article>
    );
};
