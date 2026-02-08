import React, { useMemo } from 'react';
import { CanvasState, CanvasNode } from '../../../canvas/CanvasTypes';
import { Chip } from '../../chip/Chip';
import './timeline-view.scss';

export interface TimelineViewProps {
    state: CanvasState;
    onSelectNode: (id: string | null) => void;
}

interface MilestoneBucket {
    key: string;
    period: string;
    nodes: CanvasNode[];
}

/* Group nodes into half-year buckets sorted chronologically */
function bucketByHalfYear(nodes: CanvasNode[]): MilestoneBucket[] {
    const buckets = new Map<string, CanvasNode[]>();

    for (const node of nodes) {
        let dateStr: string | null = null;
        if (node.type === 'article') dateStr = node.data.publishedAt;
        else if (node.type === 'note') dateStr = node.data.createdAt;
        else continue;

        const d = new Date(dateStr);
        if (isNaN(d.getTime())) continue;
        const year = d.getFullYear();
        const half = d.getMonth() < 6 ? 'H1' : 'H2';
        const k = `${year}-${half}`;
        if (!buckets.has(k)) buckets.set(k, []);
        buckets.get(k)!.push(node);
    }

    return Array.from(buckets.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, nodes]) => {
            const [year, half] = key.split('-');
            return { key, period: `${half === 'H1' ? 'Jan – Jun' : 'Jul – Dec'} ${year}`, nodes };
        });
}

export const TimelineView: React.FC<TimelineViewProps> = ({ state, onSelectNode }) => {
    const milestones = useMemo(() => bucketByHalfYear(state.nodes), [state.nodes]);
    const selectedNode = state.nodes.find(n => n.id === state.selectedNodeId);

    const relatedIds = useMemo(() => {
        if (!state.selectedNodeId) return [] as string[];
        return state.edges
            .filter(e => e.source === state.selectedNodeId || e.target === state.selectedNodeId)
            .map(e => (e.source === state.selectedNodeId ? e.target : e.source));
    }, [state.selectedNodeId, state.edges]);

    const relatedNodes = state.nodes.filter(n => relatedIds.includes(n.id));

    const nodeTitle = (n: CanvasNode) =>
        n.type === 'topic' ? n.data.label : n.type === 'entity' ? n.data.name : (n.data as any).title;

    const nodeIcon = (n: CanvasNode) =>
        n.type === 'article' ? '📰' : n.type === 'note' ? '📝' : '💬';

    return (
        <div className="rf-timeline">
            {/* ── Horizontal rail ── */}
            <div className="rf-timeline__rail-container">
                <div className="rf-timeline__rail">
                    <div className="rf-timeline__axis" />

                    <div className="rf-timeline__milestones">
                        {milestones.map(ms => {
                            const isActive = selectedNode && ms.nodes.some(n => n.id === selectedNode.id);
                            return (
                                <div
                                    key={ms.key}
                                    className={`rf-timeline__milestone${isActive ? ' rf-timeline__milestone--active' : ''}`}
                                >
                                    <div className="rf-timeline__milestone-period">{ms.period}</div>
                                    <div className="rf-timeline__milestone-count">
                                        {ms.nodes.length} item{ms.nodes.length !== 1 ? 's' : ''}
                                    </div>
                                    <div className="rf-timeline__milestone-items">
                                        {ms.nodes.slice(0, 5).map(n => (
                                            <div
                                                key={n.id}
                                                className="rf-timeline__milestone-item"
                                                onClick={() => onSelectNode(n.id)}
                                            >
                                                <span className="rf-timeline__milestone-item-icon">{nodeIcon(n)}</span>
                                                <h4 className="rf-timeline__milestone-item-title">{nodeTitle(n)}</h4>
                                            </div>
                                        ))}
                                        {ms.nodes.length > 5 && (
                                            <span className="rf-timeline__more">
                                                +{ms.nodes.length - 5} more
                                            </span>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* ── Relational context pane ── */}
            <div className="rf-timeline__context-pane">
                <div className="rf-timeline__context-pane-header">
                    {selectedNode ? `Context: ${nodeTitle(selectedNode)}` : 'Select a node'}
                </div>
                <div className="rf-timeline__context-pane-content">
                    {!selectedNode && (
                        <p className="rf-timeline__context-pane-empty">
                            Click an item on the timeline to see its connections.
                        </p>
                    )}

                    {selectedNode && relatedNodes.length === 0 && (
                        <p className="rf-timeline__context-pane-empty">No linked items.</p>
                    )}

                    {relatedNodes.map(rn => (
                        <div
                            key={rn.id}
                            className="rf-timeline__milestone-item"
                            onClick={() => onSelectNode(rn.id)}
                        >
                            <span className="rf-timeline__milestone-item-icon">{nodeIcon(rn)}</span>
                            <h4 className="rf-timeline__milestone-item-title">{nodeTitle(rn)}</h4>
                        </div>
                    ))}

                    {selectedNode?.type === 'article' && selectedNode.data.tags && (
                        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 8 }}>
                            {selectedNode.data.tags.map((t, i) => (
                                <Chip key={`${t}-${i}`} label={t} variant="entity" />
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
