import React, { useMemo, useRef, useCallback } from 'react';
import { CanvasState, CanvasNode, CanvasEdge } from '../../../canvas/CanvasTypes';
import type { LayoutGroup } from '../../../canvas/useLayout';
import { ConnectorBand } from '../../connector-band/ConnectorBand';
import { DetailPane } from '../detail-pane';
import './linear-view.scss';

export interface LinearViewProps {
    state: CanvasState;
    onSelectNode: (id: string | null) => void;
    onVisualize?: (nodeId: string) => void;
    externalDetailNodeId?: string | null;
    onExternalDetailConsumed?: () => void;
    previewArticle?: any;
    onPreviewArticleClear?: () => void;
    onGroupByDate?: () => void;
    onGroupByLocation?: () => void;
}

// ─── Helpers ────────────────────────────────────────────────────

const getSortDate = (node: CanvasNode): number => {
    try {
        if (node.type === 'article') return new Date(node.data.publishedAt).getTime();
        if (node.type === 'note') return new Date(node.data.createdAt).getTime();
        return Date.now();
    } catch { return 0; }
};

interface LinearGroup {
    id: string;
    label: string;
    color?: string;
    nodes: CanvasNode[];
    edges: CanvasEdge[];
}

// ─── Component ──────────────────────────────────────────────────

export const LinearView: React.FC<LinearViewProps> = ({
    state,
    onSelectNode,
    onVisualize,
    externalDetailNodeId,
    onExternalDetailConsumed,
    previewArticle,
    onPreviewArticleClear,
    onGroupByDate,
    onGroupByLocation,
}) => {
    const listRef = useRef<HTMLDivElement>(null);

    const scrollToNode = useCallback((nodeId: string) => {
        const el = listRef.current?.querySelector(`[data-node-id="${nodeId}"]`);
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, []);

    React.useEffect(() => {
        (window as any).__rfScrollToNode = scrollToNode;
        return () => { delete (window as any).__rfScrollToNode; };
    }, [scrollToNode]);

    React.useEffect(() => {
        if (externalDetailNodeId) {
            requestAnimationFrame(() => scrollToNode(externalDetailNodeId));
        }
    }, [externalDetailNodeId, scrollToNode]);

    const activeNodeId = externalDetailNodeId || state.selectedNodeId;

    // ── Group nodes (layout groups or chronological buckets) ────
    const groups = useMemo((): LinearGroup[] => {
        const nodeMap = new Map(state.nodes.map(n => [n.id, n]));
        const hasActiveLayout = state.activeLayoutMode && state.layoutGroups.length > 0;

        if (hasActiveLayout) {
            return state.layoutGroups.map((lg: LayoutGroup) => {
                const nodeIds = new Set(lg.nodeIds);
                const nodes = lg.nodeIds.map(id => nodeMap.get(id)).filter((n): n is CanvasNode => !!n);
                const edges = state.edges.filter(e => nodeIds.has(e.source) && nodeIds.has(e.target));
                return { id: lg.id, label: lg.label, color: lg.color, nodes, edges };
            });
        }

        // Default: chronological month buckets
        const buckets = new Map<string, CanvasNode[]>();
        for (const node of state.nodes) {
            const ts = getSortDate(node);
            const key = new Date(ts).toLocaleString('default', { month: 'long', year: 'numeric' });
            if (!buckets.has(key)) buckets.set(key, []);
            buckets.get(key)!.push(node);
        }

        return [...buckets.entries()]
            .sort((a, b) => getSortDate(b[1][0]) - getSortDate(a[1][0]))
            .map(([label, nodes]) => {
                const nodeIds = new Set(nodes.map(n => n.id));
                const edges = state.edges.filter(e => nodeIds.has(e.source) && nodeIds.has(e.target));
                return { id: `group-${label}`, label, nodes, edges };
            });
    }, [state.nodes, state.edges, state.activeLayoutMode, state.layoutGroups]);

    // ── Helper: find edge between two consecutive nodes ──
    const getEdgeBetween = (id1: string, id2: string, edges: CanvasEdge[]) =>
        edges.find(e =>
            (e.source === id1 && e.target === id2) ||
            (e.source === id2 && e.target === id1),
        );

    // ── Render a single node card ──
    const renderNodeCard = (node: CanvasNode) => {
        const selected = node.id === activeNodeId;

        switch (node.type) {
            case 'article': {
                const d = node.data;
                const source = d.source?.name || '';
                const dateStr = d.publishedAt ? new Date(d.publishedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '';
                return (
                    <div key={node.id} data-node-id={node.id}
                        className={`rf-linear-view__card rf-linear-view__card--article ${selected ? 'rf-linear-view__card--selected' : ''}`}
                        onClick={() => onSelectNode(node.id)}
                    >
                        <div className="rf-linear-view__card-header">
                            <span className="rf-linear-view__card-icon">📰</span>
                            <h4 className="rf-linear-view__card-title">{d.title}</h4>
                        </div>
                        {(source || dateStr) && (
                            <p className="rf-linear-view__card-body">{[source, dateStr].filter(Boolean).join(' · ')}</p>
                        )}
                    </div>
                );
            }
            case 'note':
                return (
                    <div key={node.id} data-node-id={node.id}
                        className={`rf-linear-view__card rf-linear-view__card--note ${selected ? 'rf-linear-view__card--selected' : ''}`}
                        onClick={() => onSelectNode(node.id)}
                    >
                        <div className="rf-linear-view__card-header">
                            <span className="rf-linear-view__card-icon">📝</span>
                            <h4 className="rf-linear-view__card-title">{node.data.title}</h4>
                        </div>
                        {node.data.body && <p className="rf-linear-view__card-body">{node.data.body}</p>}
                    </div>
                );
            case 'entity':
                return (
                    <div key={node.id} data-node-id={node.id}
                        className={`rf-linear-view__card rf-linear-view__card--entity ${selected ? 'rf-linear-view__card--selected' : ''}`}
                        onClick={() => onSelectNode(node.id)}
                    >
                        <div className="rf-linear-view__card-header">
                            <span className="rf-linear-view__card-icon">🏷</span>
                            <h4 className="rf-linear-view__card-title">{node.data.name}</h4>
                        </div>
                        {node.data.description && <p className="rf-linear-view__card-body">{node.data.description}</p>}
                    </div>
                );
            case 'narrative':
                return (
                    <div key={node.id} data-node-id={node.id}
                        className={`rf-linear-view__card rf-linear-view__card--narrative ${selected ? 'rf-linear-view__card--selected' : ''}`}
                        onClick={() => onSelectNode(node.id)}
                    >
                        <div className="rf-linear-view__card-header">
                            <span className="rf-linear-view__card-icon">📊</span>
                            <h4 className="rf-linear-view__card-title">{node.data.label}</h4>
                        </div>
                        {node.data.justification && <p className="rf-linear-view__card-body">{node.data.justification}</p>}
                    </div>
                );
            case 'claim':
                return (
                    <div key={node.id} data-node-id={node.id}
                        className={`rf-linear-view__card rf-linear-view__card--claim ${selected ? 'rf-linear-view__card--selected' : ''}`}
                        onClick={() => onSelectNode(node.id)}
                    >
                        <div className="rf-linear-view__card-header">
                            <span className="rf-linear-view__card-icon">💬</span>
                            <h4 className="rf-linear-view__card-title">{node.data.normalizedText}</h4>
                        </div>
                        {node.data.articleTitle && <p className="rf-linear-view__card-body">📄 {node.data.articleTitle}</p>}
                    </div>
                );
        }
    };

    return (
        <div className="rf-linear-view">
            <div className="rf-linear-view__stream" ref={listRef}>
                {groups.map(g => (
                    <section key={g.id} className="rf-linear-view__group">
                        <header className="rf-linear-view__group-header" style={g.color ? { borderLeftColor: g.color } : undefined}>
                            <span className="rf-linear-view__group-label">{g.label}</span>
                            <span className="rf-linear-view__group-count">{g.nodes.length} item{g.nodes.length !== 1 ? 's' : ''}</span>
                        </header>
                        <div className="rf-linear-view__group-list">
                            {g.nodes.map((node, idx) => {
                                const prev = idx > 0 ? g.nodes[idx - 1] : null;
                                const edge = prev ? getEdgeBetween(prev.id, node.id, g.edges) : null;
                                return (
                                    <React.Fragment key={node.id}>
                                        {edge && (
                                            <ConnectorBand
                                                label={edge.label || edge.type}
                                                variant={
                                                    edge.type === 'link' ? 'timeline-link'
                                                        : edge.type === 'group-bridge' ? 'shared-topics'
                                                        : 'semantic-neighbor'
                                                }
                                            />
                                        )}
                                        {renderNodeCard(node)}
                                    </React.Fragment>
                                );
                            })}
                        </div>
                    </section>
                ))}

                {groups.length === 0 && (
                    <div className="rf-linear-view__empty">
                        No nodes yet. Add articles from the News feed to get started.
                    </div>
                )}
            </div>

            {/* Detail Pane — absolute overlay from left */}
            <DetailPane
                state={state}
                detailNodeId={activeNodeId}
                onDetailNodeChange={(id) => {
                    onSelectNode(id);
                    if (!id && onExternalDetailConsumed) onExternalDetailConsumed();
                }}
                onVisualize={onVisualize}
                previewArticle={previewArticle}
                onPreviewArticleClear={onPreviewArticleClear}
                onGroupByDate={onGroupByDate}
                onGroupByLocation={onGroupByLocation}
            />
        </div>
    );
};
