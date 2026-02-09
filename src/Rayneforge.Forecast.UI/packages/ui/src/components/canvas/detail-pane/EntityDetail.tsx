import React from 'react';
import {
    EntityNode, CanvasNode, CanvasEdge, CanvasNodeType,
} from '../../../canvas/CanvasTypes';

interface Props {
    node: EntityNode;
    edges: CanvasEdge[];
    nodes: CanvasNode[];
    onSelectNode: (id: string) => void;
}

const TYPE_COLORS: Record<CanvasNodeType, string> = {
    article:   '#00D2FF',
    claim:     '#F0883E',
    entity:    '#8A2BE2',
    narrative: '#58A6FF',
    note:      '#8B949E',
};

const TYPE_LABELS: Record<CanvasNodeType, string> = {
    article:   'Articles',
    claim:     'Claims',
    entity:    'Entities',
    narrative: 'Narratives',
    note:      'Notes',
};

function nodeDisplayName(n: CanvasNode): string {
    switch (n.type) {
        case 'article':   return n.data.title;
        case 'claim':     return n.data.normalizedText;
        case 'entity':    return n.data.name;
        case 'narrative': return n.data.label;
        case 'note':      return n.data.title;
    }
}

export const EntityDetail: React.FC<Props> = ({
    node, edges, nodes, onSelectNode,
}) => {
    const { data } = node;

    // All connected nodes grouped by type
    const connectedIds = new Set<string>();
    for (const e of edges) {
        if (e.source === node.id) connectedIds.add(e.target);
        if (e.target === node.id) connectedIds.add(e.source);
    }
    const grouped = new Map<CanvasNodeType, CanvasNode[]>();
    for (const n of nodes) {
        if (!connectedIds.has(n.id)) continue;
        const list = grouped.get(n.type) ?? [];
        list.push(n);
        grouped.set(n.type, list);
    }

    return (
        <>
            <span className="rf-detail-pane__entity-type">{data.type}</span>

            <h3 className="rf-detail-pane__title">{data.name}</h3>

            {data.description && (
                <p className="rf-detail-pane__description">{data.description}</p>
            )}

            {/* ── Connected nodes ─────────────────── */}
            {Array.from(grouped.entries()).map(([type, list]) => (
                <div key={type} className="rf-detail-pane__section">
                    <div className="rf-detail-pane__section-label">
                        {TYPE_LABELS[type]} ({list.length})
                    </div>
                    {list.map(n => (
                        <div
                            key={n.id}
                            className="rf-detail-pane__relation"
                            onClick={() => onSelectNode(n.id)}
                        >
                            <div
                                className="rf-detail-pane__relation__dot"
                                style={{ background: TYPE_COLORS[n.type] }}
                            />
                            <div className="rf-detail-pane__relation__content">
                                <div className="rf-detail-pane__relation__name">
                                    {nodeDisplayName(n)}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            ))}
        </>
    );
};
