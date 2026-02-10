import React, { useCallback } from 'react';
import type { EmbeddedRef } from '../news-feed-center/NewsFeedCenter';
import './ref-preview-pane.scss';

// ─── Ref Preview Pane ───────────────────────────────────────────
// Lightweight side-panel that opens when a user clicks a reference
// pill in the chat thread.  Displays cached detail for the item and
// lets the user pin it to the workspace.

export interface RefPreviewPaneProps {
    /** The ref to display — null means pane is closed */
    activeRef: EmbeddedRef | null;
    /** Whether this item is already pinned in the workspace */
    isPinned?: boolean;
    onPin?: (ref: EmbeddedRef) => void;
    onClose?: () => void;
}

/** Colour map matching the ref pill colours */
const COLOR_MAP: Record<string, string> = {
    article:   '#58a6ff',
    narrative: '#f0883e',
    claim:     '#E06C75',
    entity:    '#7ee787',
};

const TYPE_LABELS: Record<string, string> = {
    article:   'Article',
    narrative: 'Narrative',
    claim:     'Claim',
    entity:    'Entity',
};

// Demo detail blurbs — in production these come from the search cache.
function getDetailText(ref: EmbeddedRef): string {
    switch (ref.type) {
        case 'narrative':
            return 'A narrative thread linking multiple claims and entities together across reported events. Tracking influence operations, diplomatic shifts, or conflict escalation patterns.';
        case 'entity':
            return 'A named entity referenced across multiple articles and claims. Includes mentions, co-occurrences, and relationship strength to other entities in the workspace.';
        case 'claim':
            return 'An extracted claim found in one or more articles. Includes source attribution, confidence score, and links to supporting or contradicting evidence.';
        case 'article':
            return 'A news article from the intelligence feed. Contains full text, metadata, and extracted entities, claims, and narrative connections.';
        default:
            return 'Details retrieved from the search cache.';
    }
}

export const RefPreviewPane: React.FC<RefPreviewPaneProps> = ({
    activeRef,
    isPinned,
    onPin,
    onClose,
}) => {
    const handlePin = useCallback(() => {
        if (activeRef) onPin?.(activeRef);
    }, [activeRef, onPin]);

    const isOpen = !!activeRef;
    const accent = activeRef ? (COLOR_MAP[activeRef.type] ?? '#58a6ff') : '#58a6ff';

    return (
        <aside className={`rf-ref-preview${isOpen ? ' rf-ref-preview--open' : ''}`}>
            {activeRef && (
                <>
                    {/* ── Header ── */}
                    <div className="rf-ref-preview__header">
                        <div className="rf-ref-preview__type-row">
                            <span className="rf-ref-preview__icon">{activeRef.icon}</span>
                            <span className="rf-ref-preview__type" style={{ color: accent }}>
                                {TYPE_LABELS[activeRef.type] ?? activeRef.type}
                            </span>
                        </div>
                        <button className="rf-ref-preview__close" onClick={onClose} title="Close">✕</button>
                    </div>

                    {/* ── Body ── */}
                    <div className="rf-ref-preview__body">
                        <h3 className="rf-ref-preview__title">{activeRef.label}</h3>
                        <p className="rf-ref-preview__desc">{getDetailText(activeRef)}</p>

                        {/* ── Metadata placeholder ── */}
                        <div className="rf-ref-preview__meta">
                            <div className="rf-ref-preview__meta-row">
                                <span className="rf-ref-preview__meta-key">ID</span>
                                <span className="rf-ref-preview__meta-val">{activeRef.id}</span>
                            </div>
                            <div className="rf-ref-preview__meta-row">
                                <span className="rf-ref-preview__meta-key">Source</span>
                                <span className="rf-ref-preview__meta-val">Search cache</span>
                            </div>
                        </div>
                    </div>

                    {/* ── Pin action ── */}
                    <div className="rf-ref-preview__actions">
                        <button
                            className={`rf-ref-preview__pin${isPinned ? ' rf-ref-preview__pin--done' : ''}`}
                            onClick={handlePin}
                            disabled={isPinned}
                            style={{ '--accent': accent } as React.CSSProperties}
                        >
                            {isPinned ? '✓ Pinned' : '📌 Pin to Workspace'}
                        </button>
                    </div>
                </>
            )}
        </aside>
    );
};
