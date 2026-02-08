import React, { useState, useMemo } from 'react';
import './narrative-pane.scss';

// ─── Public data shapes (mirrors C# domain, frontend-friendly) ──

export interface NarrativeClaim {
    id: string;
    text: string;
    articleId: string;
    articleTitle: string;
}

export interface NarrativeData {
    id: string;
    label: string;
    category: string;        // matches NarrativeCategory enum
    confidence: number;       // 0–1
    claimIds: string[];       // references into NarrativeClaim[]
}

// ─── Component Props ────────────────────────────────────────────

export interface NarrativePaneProps {
    narratives: NarrativeData[];
    claims: NarrativeClaim[];
    /** Called when user clicks an article link in the claim tree */
    onSelectArticle?: (articleId: string) => void;
    /** Controls whether the pane is open */
    open?: boolean;
    /** Toggle callback */
    onToggle?: () => void;
}

// ─── Category colour map (matches dark theme) ───────────────────

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

const categoryColor = (cat: string) => CATEGORY_COLORS[cat] ?? '#8B949E';

// ─── NarrativePane ──────────────────────────────────────────────

export const NarrativePane: React.FC<NarrativePaneProps> = ({
    narratives,
    claims,
    onSelectArticle,
    open = true,
    onToggle,
}) => {
    const [expandedId, setExpandedId] = useState<string | null>(null);

    // Index claims by id for O(1) lookup
    const claimMap = useMemo(() => {
        const m = new Map<string, NarrativeClaim>();
        claims.forEach(c => m.set(c.id, c));
        return m;
    }, [claims]);

    // Deduplicate articles across a narrative's claims
    const articlesByNarrative = useMemo(() => {
        const out = new Map<string, { articleId: string; title: string; claimTexts: string[] }[]>();

        narratives.forEach(n => {
            const byArticle = new Map<string, { articleId: string; title: string; claimTexts: string[] }>();

            n.claimIds.forEach(cid => {
                const c = claimMap.get(cid);
                if (!c) return;
                const existing = byArticle.get(c.articleId);
                if (existing) {
                    existing.claimTexts.push(c.text);
                } else {
                    byArticle.set(c.articleId, {
                        articleId: c.articleId,
                        title: c.articleTitle,
                        claimTexts: [c.text],
                    });
                }
            });

            out.set(n.id, Array.from(byArticle.values()));
        });

        return out;
    }, [narratives, claimMap]);

    const toggle = (id: string) => setExpandedId(prev => (prev === id ? null : id));

    return (
        <aside className={`rf-narrative-pane${open ? ' rf-narrative-pane--open' : ''}`}>
            {/* Collapse handle */}
            <button className="rf-narrative-pane__toggle" onClick={onToggle} title="Toggle narratives">
                {open ? '›' : '‹'}
            </button>

            {open && (
                <>
                    <header className="rf-narrative-pane__header">
                        <h3 className="rf-narrative-pane__title">Narratives</h3>
                        <span className="rf-narrative-pane__count">{narratives.length}</span>
                    </header>

                    <div className="rf-narrative-pane__list">
                        {narratives.map(n => {
                            const isExpanded = expandedId === n.id;
                            const arts = articlesByNarrative.get(n.id) ?? [];
                            const accent = categoryColor(n.category);

                            return (
                                <div
                                    key={n.id}
                                    className={`rf-narrative-pane__item${isExpanded ? ' rf-narrative-pane__item--expanded' : ''}`}
                                >
                                    <button
                                        className="rf-narrative-pane__item-header"
                                        onClick={() => toggle(n.id)}
                                    >
                                        <span
                                            className="rf-narrative-pane__category-dot"
                                            style={{ background: accent }}
                                        />
                                        <span className="rf-narrative-pane__item-label">{n.label}</span>
                                        <span className="rf-narrative-pane__confidence">
                                            {Math.round(n.confidence * 100)}%
                                        </span>
                                        <span className={`rf-narrative-pane__chevron${isExpanded ? ' rf-narrative-pane__chevron--open' : ''}`}>
                                            ▸
                                        </span>
                                    </button>

                                    {isExpanded && (
                                        <div className="rf-narrative-pane__detail">
                                            <span className="rf-narrative-pane__category-tag" style={{ color: accent, borderColor: accent }}>
                                                {n.category}
                                            </span>

                                            {arts.map(a => (
                                                <div key={a.articleId} className="rf-narrative-pane__article">
                                                    <button
                                                        className="rf-narrative-pane__article-title"
                                                        onClick={() => onSelectArticle?.(a.articleId)}
                                                    >
                                                        📄 {a.title}
                                                    </button>

                                                    <ul className="rf-narrative-pane__claim-list">
                                                        {a.claimTexts.map((ct, i) => (
                                                            <li key={i} className="rf-narrative-pane__claim">
                                                                {ct}
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </>
            )}
        </aside>
    );
};
