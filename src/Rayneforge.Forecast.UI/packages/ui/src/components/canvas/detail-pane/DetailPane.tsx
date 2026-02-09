import React, { useCallback, useMemo, useState } from 'react';
import { CanvasState, CanvasNode, CanvasEdge } from '../../../canvas/CanvasTypes';
import { ArticleDetail } from './ArticleDetail';
import { ClaimDetail } from './ClaimDetail';
import { NarrativeDetail } from './NarrativeDetail';
import { EntityDetail } from './EntityDetail';
import { NoteDetail } from './NoteDetail';
import { TopicDetail } from './TopicDetail';
import './detail-pane.scss';

// ─── Type labels for the header badge ───────────────────────────
const TYPE_BADGES: Record<string, string> = {
    article:   'Article',
    claim:     'Claim',
    narrative: 'Narrative',
    entity:    'Entity',
    note:      'Note',
};

export interface DetailPaneProps {
    state: CanvasState;
    /** ID of node whose detail pane is open (driven by double-click) */
    detailNodeId: string | null;
    /** Callback to change or close the detail pane */
    onDetailNodeChange: (id: string | null) => void;
    /** Trigger propagate layout from the currently viewed node */
    onVisualize?: (nodeId: string) => void;
    /** Preview a news article without adding it to the canvas */
    previewArticle?: import('@rayneforge/logic').NewsArticle | null;
    /** Clear the preview article */
    onPreviewArticleClear?: () => void;
    /** Trigger group-by-date layout */
    onGroupByDate?: () => void;
    /** Trigger group-by-location layout */
    onGroupByLocation?: () => void;
}

export const DetailPane: React.FC<DetailPaneProps> = ({
    state, detailNodeId, onDetailNodeChange, onVisualize,
    previewArticle, onPreviewArticleClear,
    onGroupByDate, onGroupByLocation,
}) => {
    // Virtual topic detail state — shown as a separate view inside the pane
    const [topicId, setTopicId] = useState<string | null>(null);

    const selectedNode: CanvasNode | undefined = useMemo(
        () => state.nodes.find(n => n.id === detailNodeId),
        [state.nodes, detailNodeId],
    );

    // Synthetic node for article preview (not on canvas)
    const previewNode: CanvasNode | undefined = useMemo(() => {
        if (!previewArticle) return undefined;
        return {
            id: '__preview__',
            type: 'article' as const,
            position: { x: 0, y: 0, z: 0 },
            data: previewArticle,
        };
    }, [previewArticle]);

    // Effective node: real canvas node OR preview node
    const effectiveNode = selectedNode ?? previewNode;
    const isPreviewing = !selectedNode && !!previewNode;

    const isOpen = !!effectiveNode || !!topicId;

    // Close pane entirely
    const handleClose = useCallback(() => {
        setTopicId(null);
        onDetailNodeChange(null);
        onPreviewArticleClear?.();
    }, [onDetailNodeChange, onPreviewArticleClear]);

    // Navigate to a different node within the pane (keeps pane open, clears topic)
    const handleSelectInPane = useCallback((id: string) => {
        setTopicId(null);
        onDetailNodeChange(id);
    }, [onDetailNodeChange]);

    // Navigate to topic detail (virtual — no canvas node)
    const handleSelectTopic = useCallback((tid: string) => {
        setTopicId(tid);
    }, []);

    // Back from topic detail to previous article
    const handleBackFromTopic = useCallback(() => {
        setTopicId(null);
    }, []);

    // Open a URL in a new browser tab
    const handleOpenLink = useCallback((url: string) => {
        window.open(url, '_blank', 'noopener,noreferrer');
    }, []);

    const badge = topicId ? 'Topic'
        : isPreviewing ? 'Preview'
        : (effectiveNode ? (TYPE_BADGES[effectiveNode.type] ?? effectiveNode.type) : '');

    return (
        <div className={`rf-detail-pane${isOpen ? ' rf-detail-pane--open' : ''}`}>
            {isOpen && (
                <>
                    {/* ── Header ────────────────────── */}
                    <div className="rf-detail-pane__header">
                        {topicId && (
                            <button
                                className="rf-detail-pane__back"
                                onClick={handleBackFromTopic}
                                title="Back to article"
                            >
                                ←
                            </button>
                        )}
                        <span className="rf-detail-pane__type-badge">
                            {badge}
                        </span>
                        <div className="rf-detail-pane__header-actions">
                            {onVisualize && selectedNode && (
                                <button
                                    className="rf-detail-pane__visualize"
                                    onClick={() => onVisualize(selectedNode.id)}
                                    title="Visualize — fan out connections from this node"
                                >
                                    ⟐ Visualize
                                </button>
                            )}
                            <button
                                className="rf-detail-pane__close"
                                onClick={handleClose}
                                title="Close"
                            >
                                ×
                            </button>
                        </div>
                    </div>

                    {/* ── Body ──────────────────────── */}
                    <div className="rf-detail-pane__body">
                        {topicId ? (
                            <TopicDetail
                                topicId={topicId}
                                nodes={state.nodes}
                                onSelectNode={handleSelectInPane}
                            />
                        ) : effectiveNode ? (
                            <DetailContent
                                node={effectiveNode}
                                edges={state.edges}
                                nodes={state.nodes}
                                onSelectNode={isPreviewing ? () => {} : handleSelectInPane}
                                onOpenLink={handleOpenLink}
                                onSelectTopic={isPreviewing ? undefined : handleSelectTopic}
                                onGroupByDate={onGroupByDate}
                                onGroupByLocation={onGroupByLocation}
                            />
                        ) : null}
                    </div>
                </>
            )}
        </div>
    );
};

// ─── Route to per-type detail variant ───────────────────────────

interface ContentProps {
    node: CanvasNode;
    edges: CanvasEdge[];
    nodes: CanvasNode[];
    onSelectNode: (id: string) => void;
    onOpenLink: (url: string) => void;
    onSelectTopic?: (topicId: string) => void;
    onGroupByDate?: () => void;
    onGroupByLocation?: () => void;
}

const DetailContent: React.FC<ContentProps> = ({
    node, edges, nodes, onSelectNode, onOpenLink, onSelectTopic,
    onGroupByDate, onGroupByLocation,
}) => {
    switch (node.type) {
        case 'article':
            return (
                <ArticleDetail
                    node={node}
                    edges={edges}
                    nodes={nodes}
                    onSelectNode={onSelectNode}
                    onOpenLink={onOpenLink}
                    onSelectTopic={onSelectTopic}
                    onGroupByDate={onGroupByDate}
                    onGroupByLocation={onGroupByLocation}
                />
            );
        case 'claim':
            return (
                <ClaimDetail
                    node={node}
                    edges={edges}
                    nodes={nodes}
                    onSelectNode={onSelectNode}
                    onOpenLink={onOpenLink}
                />
            );
        case 'narrative':
            return (
                <NarrativeDetail
                    node={node}
                    edges={edges}
                    nodes={nodes}
                    onSelectNode={onSelectNode}
                />
            );
        case 'entity':
            return (
                <EntityDetail
                    node={node}
                    edges={edges}
                    nodes={nodes}
                    onSelectNode={onSelectNode}
                />
            );
        case 'note':
            return (
                <NoteDetail
                    node={node}
                    edges={edges}
                    nodes={nodes}
                    onSelectNode={onSelectNode}
                />
            );
    }
};
