import React, { useState, useCallback, KeyboardEvent } from 'react';
import { Html } from '@react-three/drei';
import { useThree } from '@react-three/fiber';
import type { DockPanelId } from '../../../canvas/CanvasTypes';
import type { NewsArticle } from '@rayneforge/logic';

// ─── Dock3D ─────────────────────────────────────────────────────
// 3D-scene equivalent of CanvasDock. Uses `<Html transform>` to
// render interactive DOM elements (search input, scrollable list)
// positioned at the bottom of the camera frustum.

export type SearchMode3D = 'simple' | 'semantic' | 'hybrid';

export interface Dock3DProps {
    activePanel: DockPanelId | null;
    onSetPanel: (panel: DockPanelId | null) => void;
    dailyArticles: NewsArticle[];
    dailyLoading?: boolean;
    searchResults: NewsArticle[];
    searchLoading?: boolean;
    onSearch: (query: string, mode: SearchMode3D) => void;
    onAddArticle?: (article: NewsArticle) => void;
    onArticleClick?: (article: NewsArticle) => void;
    /** Fixed world position of the dock (default: bottom of scene) */
    position?: [number, number, number];
}

const MODES: SearchMode3D[] = ['simple', 'semantic', 'hybrid'];

function fmtDate(iso: string): string {
    try {
        return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    } catch {
        return '';
    }
}

export const Dock3D: React.FC<Dock3DProps> = ({
    activePanel,
    onSetPanel,
    dailyArticles,
    dailyLoading,
    searchResults,
    searchLoading,
    onSearch,
    onAddArticle,
    onArticleClick,
    position = [0, -3.5, 0],
}) => {
    const [query, setQuery] = useState('');
    const [mode, setMode] = useState<SearchMode3D>('simple');

    const toggle = useCallback(
        (p: DockPanelId) => onSetPanel(activePanel === p ? null : p),
        [activePanel, onSetPanel],
    );

    const cycleMode = useCallback(() => {
        setMode(prev => MODES[(MODES.indexOf(prev) + 1) % MODES.length]);
    }, []);

    const handleKeyDown = useCallback(
        (e: KeyboardEvent<HTMLInputElement>) => {
            if (e.key === 'Enter' && query.trim()) onSearch(query.trim(), mode);
        },
        [query, mode, onSearch],
    );

    const articles = activePanel === 'daily' ? dailyArticles : searchResults;
    const loading = activePanel === 'daily' ? dailyLoading : searchLoading;

    return (
        <group position={position}>
            <Html
                transform
                distanceFactor={6}
                style={{
                    width: '700px',
                    pointerEvents: 'auto',
                    userSelect: 'none',
                }}
                center
            >
                <div style={styles.root}>
                    {/* Tabs */}
                    <div style={styles.tabs}>
                        <button
                            style={{
                                ...styles.tab,
                                ...(activePanel === 'daily' ? styles.tabActive : {}),
                            }}
                            onClick={() => toggle('daily')}
                        >
                            📰 Daily
                        </button>
                        <button
                            style={{
                                ...styles.tab,
                                ...(activePanel === 'search' ? styles.tabActive : {}),
                            }}
                            onClick={() => toggle('search')}
                        >
                            🔍 Search
                        </button>
                    </div>

                    {/* Panel */}
                    {activePanel && (
                        <div style={styles.panel}>
                            {activePanel === 'search' && (
                                <div style={styles.searchRow}>
                                    <input
                                        style={styles.searchInput}
                                        placeholder="Search news…"
                                        value={query}
                                        onChange={e => setQuery(e.target.value)}
                                        onKeyDown={handleKeyDown}
                                    />
                                    <button style={styles.modeBtn} onClick={cycleMode}>
                                        {mode}
                                    </button>
                                </div>
                            )}

                            {loading ? (
                                <div style={styles.empty}>Loading…</div>
                            ) : articles.length === 0 ? (
                                <div style={styles.empty}>
                                    {activePanel === 'search' && !query
                                        ? 'Type a query and press Enter'
                                        : 'No articles'}
                                </div>
                            ) : (
                                <div style={styles.list}>
                                    {articles.map((a, i) => (
                                        <div
                                            key={a.url + i}
                                            style={styles.card}
                                            onClick={() => onArticleClick?.(a)}
                                        >
                                            <div style={styles.cardSource}>
                                                <span>{a.source.name}</span>
                                                {onAddArticle && (
                                                    <button
                                                        style={styles.addBtn}
                                                        onClick={e => {
                                                            e.stopPropagation();
                                                            onAddArticle(a);
                                                        }}
                                                    >
                                                        ＋
                                                    </button>
                                                )}
                                            </div>
                                            <div style={styles.cardTitle}>{a.title}</div>
                                            <div style={styles.cardDate}>{fmtDate(a.publishedAt)}</div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </Html>
        </group>
    );
};

/* ── Inline styles (avoids needing separate CSS in 3D Html) ─── */

const C = {
    bg: 'rgba(21,25,33,0.88)',
    surface: '#151921',
    border: 'rgba(240,246,252,0.2)',
    borderSubtle: 'rgba(240,246,252,0.1)',
    accent: '#00D2FF',
    text: '#E6EDF3',
    muted: '#484F58',
    secondary: '#8B949E',
};

const styles: Record<string, React.CSSProperties> = {
    root: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        fontFamily: "'Inter', system-ui, sans-serif",
        fontSize: 14,
    },
    tabs: {
        display: 'flex',
        gap: 4,
        marginBottom: 4,
    },
    tab: {
        padding: '6px 16px',
        fontSize: 14,
        fontWeight: 500,
        color: C.secondary,
        background: C.bg,
        border: `1px solid ${C.borderSubtle}`,
        borderRadius: 9999,
        cursor: 'pointer',
    },
    tabActive: {
        color: C.accent,
        borderColor: C.accent,
        boxShadow: `0 0 0 1px ${C.accent}, 0 0 12px rgba(0,210,255,0.15)`,
    },
    panel: {
        width: 700,
        maxHeight: 220,
        background: C.bg,
        backdropFilter: 'blur(14px)',
        border: `1px solid ${C.border}`,
        borderRadius: 14,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
    },
    searchRow: {
        display: 'flex',
        alignItems: 'center',
        padding: '10px 16px',
        gap: 10,
        borderBottom: `1px solid ${C.borderSubtle}`,
    },
    searchInput: {
        flex: 1,
        background: 'transparent',
        border: 'none',
        color: C.text,
        fontSize: 14,
        outline: 'none',
    },
    modeBtn: {
        fontSize: 12,
        color: C.muted,
        background: 'rgba(240,246,252,0.08)',
        border: `1px solid ${C.borderSubtle}`,
        borderRadius: 6,
        padding: '2px 8px',
        cursor: 'pointer',
    },
    list: {
        flex: 1,
        overflowX: 'auto',
        overflowY: 'hidden',
        display: 'flex',
        gap: 12,
        padding: '12px 16px',
    },
    card: {
        flex: '0 0 190px',
        background: C.surface,
        border: `1px solid ${C.borderSubtle}`,
        borderRadius: 10,
        padding: 10,
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
    },
    cardSource: {
        fontSize: 11,
        color: C.muted,
        textTransform: 'uppercase',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    cardTitle: {
        fontSize: 13,
        fontWeight: 600,
        color: C.text,
        lineHeight: '1.3',
        display: '-webkit-box',
        WebkitLineClamp: 2,
        WebkitBoxOrient: 'vertical',
        overflow: 'hidden',
    },
    cardDate: {
        fontSize: 11,
        color: C.muted,
        marginTop: 'auto',
    },
    addBtn: {
        width: 18,
        height: 18,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 4,
        border: `1px solid ${C.borderSubtle}`,
        background: 'transparent',
        color: C.muted,
        fontSize: 12,
        cursor: 'pointer',
    },
    empty: {
        padding: 24,
        textAlign: 'center',
        color: C.muted,
        fontSize: 14,
    },
};
