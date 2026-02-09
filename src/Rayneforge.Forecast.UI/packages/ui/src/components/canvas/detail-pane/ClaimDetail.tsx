import React from 'react';
import {
    ClaimNode, CanvasNode, CanvasEdge,
} from '../../../canvas/CanvasTypes';

interface Props {
    node: ClaimNode;
    edges: CanvasEdge[];
    nodes: CanvasNode[];
    onSelectNode: (id: string) => void;
    onOpenLink: (url: string) => void;
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

export const ClaimDetail: React.FC<Props> = ({
    node, edges, nodes, onSelectNode, onOpenLink,
}) => {
    const { data } = node;

    // Find the source article via edges or articleId
    const articleNode = nodes.find(n =>
        n.type === 'article' && n.id === data.articleId,
    ) ?? nodes.find(n => {
        if (n.type !== 'article') return false;
        return edges.some(e =>
            (e.source === node.id && e.target === n.id) ||
            (e.target === node.id && e.source === n.id),
        );
    });

    // Find related narratives via edges
    const narratives = (() => {
        const ids = new Set<string>();
        for (const e of edges) {
            if (e.source === node.id) ids.add(e.target);
            if (e.target === node.id) ids.add(e.source);
        }
        return nodes.filter(n => ids.has(n.id) && n.type === 'narrative');
    })();

    return (
        <>
            {/* ── Claim quote ────────────────────── */}
            <div className="rf-detail-pane__quote">
                <div className="rf-detail-pane__quote-mark">&ldquo;</div>
                <div className="rf-detail-pane__quote-text">
                    {data.normalizedText}
                </div>
            </div>

            {/* ── Source Article ──────────────────── */}
            {(articleNode || data.articleTitle) && (
                <div className="rf-detail-pane__section">
                    <div className="rf-detail-pane__section-label">Source Article</div>
                    <div
                        className="rf-detail-pane__relation"
                        onClick={() => {
                            if (articleNode) onSelectNode(articleNode.id);
                        }}
                        style={{ cursor: articleNode ? 'pointer' : 'default' }}
                    >
                        <div
                            className="rf-detail-pane__relation__dot"
                            style={{ background: '#00D2FF' }}
                        />
                        <div className="rf-detail-pane__relation__content">
                            <div className="rf-detail-pane__relation__name">
                                {articleNode?.type === 'article'
                                    ? articleNode.data.title
                                    : data.articleTitle ?? 'Unknown Article'}
                            </div>
                            {articleNode?.type === 'article' && (
                                <div className="rf-detail-pane__relation__sub">
                                    {articleNode.data.source.name}
                                </div>
                            )}
                        </div>
                    </div>

                    {articleNode?.type === 'article' && articleNode.data.url && (
                        <button
                            className="rf-detail-pane__link"
                            onClick={() => onOpenLink(articleNode.data.url)}
                        >
                            <span className="rf-detail-pane__link__icon">🌐</span>
                            View Source
                        </button>
                    )}
                </div>
            )}

            {/* ── Related Narratives ─────────────── */}
            {narratives.length > 0 && (
                <div className="rf-detail-pane__section">
                    <div className="rf-detail-pane__section-label">
                        Narratives ({narratives.length})
                    </div>
                    {narratives.map(n => {
                        const cat = n.type === 'narrative' ? n.data.category : '';
                        const color = CATEGORY_COLORS[cat] ?? '#8B949E';
                        return (
                            <div
                                key={n.id}
                                className="rf-detail-pane__relation"
                                onClick={() => onSelectNode(n.id)}
                            >
                                <div
                                    className="rf-detail-pane__relation__dot"
                                    style={{ background: color }}
                                />
                                <div className="rf-detail-pane__relation__content">
                                    <div className="rf-detail-pane__relation__name">
                                        {n.type === 'narrative' ? n.data.label : n.id}
                                    </div>
                                    <div className="rf-detail-pane__relation__sub">{cat}</div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </>
    );
};
