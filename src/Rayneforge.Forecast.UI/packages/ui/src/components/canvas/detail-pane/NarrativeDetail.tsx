import React from 'react';
import {
    NarrativeNode, CanvasNode, CanvasEdge, CanvasNodeType,
} from '../../../canvas/CanvasTypes';
import { Chip } from '../../chip/Chip';

interface Props {
    node: NarrativeNode;
    edges: CanvasEdge[];
    nodes: CanvasNode[];
    onSelectNode: (id: string) => void;
}

const CATEGORY_COLORS: Record<string, string> = {
    OptimisticProgress: '#00D2FF',
    RiskSafety:         '#F85149',
    LaborDisplacement:  '#D29922',
    NationalSecurity:   '#F0883E',
    MarketFinance:      '#58A6FF',
    RightsEthics:       '#BC8CFF',
    TechnicalRealism:   '#8B949E',
    MoralPanic:         '#FF7B72',
};

const TYPE_COLORS: Record<CanvasNodeType, string> = {
    article:   '#00D2FF',
    claim:     '#F0883E',
    entity:    '#8A2BE2',
    narrative: '#58A6FF',
    note:      '#8B949E',
};

function relatedGrouped(
    nodeId: string,
    edges: CanvasEdge[],
    nodes: CanvasNode[],
): Map<CanvasNodeType, CanvasNode[]> {
    const ids = new Set<string>();
    for (const e of edges) {
        if (e.source === nodeId) ids.add(e.target);
        if (e.target === nodeId) ids.add(e.source);
    }

    const grouped = new Map<CanvasNodeType, CanvasNode[]>();
    for (const n of nodes) {
        if (!ids.has(n.id)) continue;
        const list = grouped.get(n.type) ?? [];
        list.push(n);
        grouped.set(n.type, list);
    }
    return grouped;
}

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

function nodeSubtext(n: CanvasNode): string {
    switch (n.type) {
        case 'article':   return n.data.source.name;
        case 'claim':     return n.data.articleTitle ?? '';
        case 'entity':    return n.data.type;
        case 'narrative': return n.data.category;
        case 'note':      return '';
    }
}

export const NarrativeDetail: React.FC<Props> = ({
    node, edges, nodes, onSelectNode,
}) => {
    const { data } = node;
    const accent = CATEGORY_COLORS[data.category] ?? '#8B949E';
    const grouped = relatedGrouped(node.id, edges, nodes);

    return (
        <>
            {/* Accent bar */}
            <div
                className="rf-detail-pane__category-bar"
                style={{ background: accent }}
            />

            <span
                className="rf-detail-pane__category-label"
                style={{
                    color: accent,
                    background: `${accent}20`,
                }}
            >
                {data.category}
            </span>

            <h3 className="rf-detail-pane__title">{data.label}</h3>

            {data.justification && (
                <p className="rf-detail-pane__description">{data.justification}</p>
            )}

            <div className="rf-detail-pane__chips">
                <Chip label={data.evidencePosture} variant="neutral" />
                <Chip label={data.temporalFocus} variant="neutral" />
            </div>

            {/* ── All relations grouped by type ── */}
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
                                {nodeSubtext(n) && (
                                    <div className="rf-detail-pane__relation__sub">
                                        {nodeSubtext(n)}
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            ))}
        </>
    );
};
