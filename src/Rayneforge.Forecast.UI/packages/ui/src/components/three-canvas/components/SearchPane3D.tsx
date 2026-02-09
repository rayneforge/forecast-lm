import React, { useState, useCallback, KeyboardEvent } from 'react';
import { Html } from '@react-three/drei';
import type { NewsArticle } from '@rayneforge/logic';

// ─── SearchPane3D ───────────────────────────────────────────────
// Independent 3D side pane for searching news articles.

export type SearchMode3D = 'simple' | 'semantic' | 'hybrid';

export interface SearchPane3DProps {
    open: boolean;
    onClose: () => void;
    results: NewsArticle[];
    loading?: boolean;
    onSearch: (query: string, mode: SearchMode3D) => void;
    onAddArticle?: (article: NewsArticle) => void;
    onArticleClick?: (article: NewsArticle) => void;
    /** World position (default right side of scene, below daily) */
    position?: [number, number, number];
}

const MODES: SearchMode3D[] = ['simple', 'semantic', 'hybrid'];

function fmtDate(iso: string): string {
    try { return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }); }
    catch { return ''; }
}

export const SearchPane3D: React.FC<SearchPane3DProps> = ({
    open,
    onClose,
    results,
    loading,
    onSearch,
    onAddArticle,
    onArticleClick,
    position = [5, -3, 0],
}) => {
    const [query, setQuery] = useState('');
    const [mode, setMode] = useState<SearchMode3D>('simple');

    const cycleMode = useCallback(() => {
        setMode(prev => MODES[(MODES.indexOf(prev) + 1) % MODES.length]);
    }, []);

    const handleKeyDown = useCallback(
        (e: KeyboardEvent<HTMLInputElement>) => {
            if (e.key === 'Enter' && query.trim()) onSearch(query.trim(), mode);
        },
        [query, mode, onSearch],
    );

    if (!open) return null;

    return (
        <group position={position}>
            <Html
                transform
                distanceFactor={6}
                style={{ width: '280px', pointerEvents: 'auto', userSelect: 'none' }}
                center
            >
                <div style={S.root}>
                    <div style={S.header}>
                        <span style={S.title}>🔍 Search</span>
                        <button style={S.close} onClick={onClose}>✕</button>
                    </div>

                    <div style={S.searchRow}>
                        <input
                            style={S.searchInput}
                            placeholder="Search news…"
                            value={query}
                            onChange={e => setQuery(e.target.value)}
                            onKeyDown={handleKeyDown}
                        />
                        <button style={S.modeBtn} onClick={cycleMode}>{mode}</button>
                    </div>

                    <div style={S.body}>
                        {loading ? (
                            <div style={S.empty}>Searching…</div>
                        ) : results.length === 0 ? (
                            <div style={S.empty}>
                                {query ? 'No results' : 'Type a query and press Enter'}
                            </div>
                        ) : (
                            results.map((a, i) => (
                                <SCard key={a.url + i} article={a} onAdd={onAddArticle} onClick={onArticleClick} />
                            ))
                        )}
                    </div>
                </div>
            </Html>
        </group>
    );
};

const SCard: React.FC<{
    article: NewsArticle;
    onAdd?: (a: NewsArticle) => void;
    onClick?: (a: NewsArticle) => void;
}> = ({ article, onAdd, onClick }) => {
    const handleClick = useCallback(() => onClick?.(article), [article, onClick]);
    const handleAdd = useCallback(
        (e: React.MouseEvent) => { e.stopPropagation(); onAdd?.(article); },
        [article, onAdd],
    );

    return (
        <div style={S.card} onClick={handleClick}>
            <div style={S.cardSource}>
                <span>{article.source.name}</span>
                {onAdd && <button style={S.addBtn} onClick={handleAdd}>＋</button>}
            </div>
            <div style={S.cardTitle}>{article.title}</div>
            <div style={S.cardDate}>{fmtDate(article.publishedAt)}</div>
        </div>
    );
};

const C = {
    bg: 'rgba(21,25,33,0.92)',
    surface: '#151921',
    border: 'rgba(240,246,252,0.2)',
    borderSubtle: 'rgba(240,246,252,0.1)',
    accent: '#00D2FF',
    text: '#E6EDF3',
    muted: '#484F58',
    secondary: '#8B949E',
};

const S: Record<string, React.CSSProperties> = {
    root: {
        display: 'flex', flexDirection: 'column',
        fontFamily: "'Inter', system-ui, sans-serif", fontSize: 13,
        background: C.bg, backdropFilter: 'blur(16px)',
        borderRadius: 12, border: `1px solid ${C.border}`,
        overflow: 'hidden', maxHeight: 500,
    },
    header: {
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '10px 14px', borderBottom: `1px solid ${C.borderSubtle}`,
    },
    title: { fontWeight: 700, color: C.text, fontSize: 14 },
    close: {
        background: 'transparent', border: 'none', color: C.muted,
        fontSize: 14, cursor: 'pointer', padding: '2px 6px', borderRadius: 4,
    },
    searchRow: {
        display: 'flex', alignItems: 'center', padding: '8px 14px', gap: 8,
        borderBottom: `1px solid ${C.borderSubtle}`,
    },
    searchInput: {
        flex: 1, background: 'transparent', border: 'none',
        color: C.text, fontSize: 13, outline: 'none',
    },
    modeBtn: {
        fontSize: 11, color: C.muted,
        background: 'rgba(240,246,252,0.08)',
        border: `1px solid ${C.borderSubtle}`,
        borderRadius: 4, padding: '2px 6px', cursor: 'pointer',
    },
    body: {
        flex: 1, overflowY: 'auto', padding: '10px 12px',
        display: 'flex', flexDirection: 'column', gap: 8,
    },
    card: {
        background: C.surface, border: `1px solid ${C.borderSubtle}`,
        borderRadius: 8, padding: 10, cursor: 'pointer',
        display: 'flex', flexDirection: 'column', gap: 3,
    },
    cardSource: {
        fontSize: 11, color: C.muted, textTransform: 'uppercase',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    },
    cardTitle: {
        fontSize: 13, fontWeight: 600, color: C.text, lineHeight: '1.3',
        display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
    },
    cardDate: { fontSize: 11, color: C.muted, marginTop: 'auto' },
    addBtn: {
        width: 18, height: 18,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        borderRadius: 4, border: `1px solid ${C.borderSubtle}`,
        background: 'transparent', color: C.muted, fontSize: 12, cursor: 'pointer',
    },
    empty: { padding: 20, textAlign: 'center', color: C.muted, fontSize: 13 },
};
