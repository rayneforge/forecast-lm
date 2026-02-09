import React from 'react';
import {
    ArticleNode, CanvasNode, CanvasEdge, CanvasNodeType,
} from '../../../canvas/CanvasTypes';
import { Chip } from '../../chip/Chip';

interface Props {
    node: ArticleNode;
    edges: CanvasEdge[];
    nodes: CanvasNode[];
    onSelectNode: (id: string) => void;
    onOpenLink: (url: string) => void;
    onSelectTopic?: (topicId: string) => void;
    /** Trigger group-by-date layout from this article's publish date */
    onGroupByDate?: () => void;
    /** Trigger group-by-location layout */
    onGroupByLocation?: () => void;
}

/** Resolve related nodes of a given type via edges */
function relatedByType(
    nodeId: string,
    type: CanvasNodeType,
    edges: CanvasEdge[],
    nodes: CanvasNode[],
): CanvasNode[] {
    const ids = new Set<string>();
    for (const e of edges) {
        if (e.source === nodeId) ids.add(e.target);
        if (e.target === nodeId) ids.add(e.source);
    }
    return nodes.filter(n => ids.has(n.id) && n.type === type);
}

const renderDate = (d: string) => {
    try {
        return new Date(d).toLocaleDateString(undefined, {
            month: 'long', day: 'numeric', year: 'numeric',
        });
    } catch { return d; }
};

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

export const ArticleDetail: React.FC<Props> = ({
    node, edges, nodes, onSelectNode, onOpenLink, onSelectTopic,
    onGroupByDate, onGroupByLocation,
}) => {
    const { data } = node;
    const claims     = relatedByType(node.id, 'claim',     edges, nodes);
    const entities   = relatedByType(node.id, 'entity',    edges, nodes);
    const narratives = relatedByType(node.id, 'narrative', edges, nodes);

    return (
        <>
            {data.imageUrl && (
                <div
                    className="rf-detail-pane__image"
                    style={{ backgroundImage: `url(${data.imageUrl})` }}
                />
            )}

            <h3 className="rf-detail-pane__title">{data.title}</h3>

            <div className="rf-detail-pane__meta">
                <span>{data.source.name}</span>
                <span>·</span>
                {onGroupByDate ? (
                    <button
                        className="rf-detail-pane__meta-link"
                        onClick={onGroupByDate}
                        title="Group canvas by date"
                    >
                        📅 {renderDate(data.publishedAt)}
                    </button>
                ) : (
                    <span>{renderDate(data.publishedAt)}</span>
                )}
            </div>

            {data.description && (
                <p className="rf-detail-pane__description">{data.description}</p>
            )}

            {/* ── Content snippet ────────────────── */}
            {data.content && (
                <div className="rf-detail-pane__section">
                    <div className="rf-detail-pane__section-label">Content</div>
                    <p className="rf-detail-pane__content-snippet">{data.content}</p>
                </div>
            )}

            {data.tags && data.tags.length > 0 && (
                <div className="rf-detail-pane__chips">
                    {data.tags.map((tag, i) => (
                        <Chip key={`${tag}-${i}`} label={tag} variant="entity" />
                    ))}
                </div>
            )}

            {/* ── Topics ────────────────────────── */}
            {data.topics && data.topics.length > 0 && (
                <div className="rf-detail-pane__section">
                    <div className="rf-detail-pane__section-label">
                        Topics ({data.topics.length})
                    </div>
                    <div className="rf-detail-pane__chips">
                        {data.topics.map(t => (
                            <Chip
                                key={t.id}
                                label={t.label}
                                variant="topic"
                                onClick={onSelectTopic ? () => onSelectTopic(t.id) : undefined}
                            />
                        ))}
                    </div>
                </div>
            )}

            {/* ── Locations ─────────────────────── */}
            {data.locations && data.locations.length > 0 && (
                <div className="rf-detail-pane__section">
                    <div className="rf-detail-pane__section-label">
                        {onGroupByLocation ? (
                            <button
                                className="rf-detail-pane__section-label-link"
                                onClick={onGroupByLocation}
                                title="Group canvas by location"
                            >
                                🌍 Locations ({data.locations.length})
                            </button>
                        ) : (
                            <>Locations ({data.locations.length})</>
                        )}
                    </div>
                    {data.locations.map((loc, i) => {
                        // Show friendly label from path (last segment)
                        const segments = loc.path.split('/').filter(Boolean);
                        const label = segments.map(s =>
                            s.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
                        ).join(' › ');
                        return (
                            <div key={`${loc.path}-${i}`} className="rf-detail-pane__relation">
                                <div className="rf-detail-pane__relation__dot" style={{ background: '#7ee787' }} />
                                <div className="rf-detail-pane__relation__content">
                                    <div className="rf-detail-pane__relation__name">{label}</div>
                                    {loc.reference && (
                                        <div className="rf-detail-pane__relation__sub">"{loc.reference}"</div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {data.url && (
                <button
                    className="rf-detail-pane__link"
                    onClick={() => onOpenLink(data.url)}
                >
                    <span className="rf-detail-pane__link__icon">🌐</span>
                    View Source
                </button>
            )}

            {/* ── Related Claims ─────────────────── */}
            {claims.length > 0 && (
                <div className="rf-detail-pane__section">
                    <div className="rf-detail-pane__section-label">
                        Claims ({claims.length})
                    </div>
                    {claims.map(c => (
                        <div
                            key={c.id}
                            className="rf-detail-pane__relation"
                            onClick={() => onSelectNode(c.id)}
                        >
                            <div
                                className="rf-detail-pane__relation__dot"
                                style={{ background: '#F0883E' }}
                            />
                            <div className="rf-detail-pane__relation__content">
                                <div className="rf-detail-pane__relation__name">
                                    {c.type === 'claim' ? c.data.normalizedText : c.id}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* ── Related Entities ────────────────── */}
            {entities.length > 0 && (
                <div className="rf-detail-pane__section">
                    <div className="rf-detail-pane__section-label">
                        Entities ({entities.length})
                    </div>
                    {entities.map(e => (
                        <div
                            key={e.id}
                            className="rf-detail-pane__relation"
                            onClick={() => onSelectNode(e.id)}
                        >
                            <div
                                className="rf-detail-pane__relation__dot"
                                style={{ background: '#8A2BE2' }}
                            />
                            <div className="rf-detail-pane__relation__content">
                                <div className="rf-detail-pane__relation__name">
                                    {e.type === 'entity' ? e.data.name : e.id}
                                </div>
                                <div className="rf-detail-pane__relation__sub">
                                    {e.type === 'entity' ? e.data.type : ''}
                                </div>
                            </div>
                        </div>
                    ))}
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
