import React, { useMemo } from 'react';
import { NoteNode, CanvasEdge, CanvasNode } from '../../../canvas/CanvasTypes';

export interface NoteDetailProps {
    node: NoteNode;
    edges: CanvasEdge[];
    nodes: CanvasNode[];
    onSelectNode: (id: string) => void;
}

const TYPE_ICONS: Record<string, string> = {
    article:   '📰',
    entity:    '👤',
    claim:     '💬',
    narrative: '📖',
    topic:     '🏷️',
    note:      '📝',
};

export const NoteDetail: React.FC<NoteDetailProps> = ({
    node, edges, nodes, onSelectNode,
}) => {
    // Resolve linked nodes via edges in both directions
    const linked = useMemo(() => {
        const connectedIds = new Set<string>();
        for (const e of edges) {
            if (e.source === node.id) connectedIds.add(e.target);
            if (e.target === node.id) connectedIds.add(e.source);
        }
        return nodes.filter(n => connectedIds.has(n.id));
    }, [node.id, edges, nodes]);

    // Group linked nodes by type
    const byType = useMemo(() => {
        const map = new Map<string, CanvasNode[]>();
        for (const n of linked) {
            const arr = map.get(n.type) ?? [];
            arr.push(n);
            map.set(n.type, arr);
        }
        return map;
    }, [linked]);

    const formatDate = (d: string) => {
        try {
            return new Date(d).toLocaleDateString(undefined, {
                year: 'numeric', month: 'short', day: 'numeric',
                hour: '2-digit', minute: '2-digit',
            });
        } catch { return d; }
    };

    const getNodeLabel = (n: CanvasNode): string => {
        switch (n.type) {
            case 'article':   return n.data.title;
            case 'entity':    return n.data.name;
            case 'claim':     return n.data.normalizedText;
            case 'narrative': return n.data.label;
            case 'note':      return n.data.title;
        }
    };

    return (
        <>
            <h3 className="rf-detail-pane__title">{node.data.title}</h3>
            {node.data.body && (
                <p className="rf-detail-pane__description">{node.data.body}</p>
            )}
            {node.data.color && (
                <div style={{
                    width: 16, height: 16, borderRadius: 4,
                    background: node.data.color, display: 'inline-block',
                    marginRight: 8, verticalAlign: 'middle',
                }} />
            )}
            <div className="rf-detail-pane__meta">
                <span>Created {formatDate(node.data.createdAt)}</span>
            </div>

            {/* Linked nodes */}
            {linked.length > 0 && (
                <div className="rf-detail-pane__section">
                    <h4 className="rf-detail-pane__section-title">
                        Linked ({linked.length})
                    </h4>
                    {Array.from(byType.entries()).map(([type, items]) => (
                        <div key={type} style={{ marginBottom: 8 }}>
                            <div className="rf-detail-pane__section-subtitle" style={{ marginBottom: 4, fontSize: 11, color: 'var(--color-text-muted, #8b949e)' }}>
                                {TYPE_ICONS[type] ?? ''} {type.charAt(0).toUpperCase() + type.slice(1)}s
                            </div>
                            {items.map(n => (
                                <button
                                    key={n.id}
                                    className="rf-detail-pane__relation-link"
                                    onClick={() => onSelectNode(n.id)}
                                >
                                    {getNodeLabel(n)}
                                </button>
                            ))}
                        </div>
                    ))}
                </div>
            )}

            {linked.length === 0 && (
                <div className="rf-detail-pane__section">
                    <p className="rf-detail-pane__hint" style={{ color: 'var(--color-text-muted, #8b949e)', fontSize: 12 }}>
                        Drag from an anchor point to another node to create a link.
                    </p>
                </div>
            )}
        </>
    );
};
