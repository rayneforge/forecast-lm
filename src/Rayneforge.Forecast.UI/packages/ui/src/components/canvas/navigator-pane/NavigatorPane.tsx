import React, { useMemo } from 'react';
import { CanvasState, CanvasNode } from '../../../canvas/CanvasTypes';
import type { LayoutGroup } from '../../../canvas/useLayout';
import { getDepthLabel } from '../../../canvas/useLayout';
import type { LayoutMode } from '../../../canvas/useLayout';
import './navigator-pane.scss';

// ─── NavigatorPane ──────────────────────────────────────────────
// Right-side pane showing all workspace elements. When a layout
// grouping is active the nodes are shown under those groups;
// otherwise by node type. Each node shows connection count.

export interface NavigatorPaneProps {
    state: CanvasState;
    open: boolean;
    onToggle: () => void;
    onSelectNode: (nodeId: string) => void;
    /** Cycle-drill organize: each click drills deeper, clears at end */
    onOrganize?: (mode: LayoutMode) => void;
    onClearLayout?: () => void;
}

// ── Type group definitions ──────────────────────────────────────

interface TypeGroup {
    key: string;
    icon: string;
    label: string;
    color: string;
}

const TYPE_GROUPS: TypeGroup[] = [
    { key: 'article',   icon: '📄', label: 'Articles',   color: '#58a6ff' },
    { key: 'note',      icon: '📝', label: 'Notes',      color: '#d2a8ff' },
    { key: 'entity',    icon: '👤', label: 'Entities',   color: '#7ee787' },
    { key: 'narrative', icon: '📖', label: 'Narratives', color: '#f0883e' },
    { key: 'claim',     icon: '💬', label: 'Claims',     color: '#f778ba' },
];

const TYPE_ICON: Record<string, string> = {
    article: '📄', note: '📝', entity: '👤', narrative: '📖', claim: '💬',
};

function nodeLabel(n: CanvasNode): string {
    switch (n.type) {
        case 'article':   return n.data.title;
        case 'note':      return n.data.title;
        case 'entity':    return n.data.name;
        case 'narrative': return n.data.label;
        case 'claim':     return n.data.normalizedText.slice(0, 60) + (n.data.normalizedText.length > 60 ? '…' : '');
    }
}

function nodeSubtitle(n: CanvasNode): string | null {
    switch (n.type) {
        case 'article': {
            const parts: string[] = [];
            if (n.data.source?.name) parts.push(n.data.source.name);
            if (n.data.publishedAt) {
                try {
                    parts.push(new Date(n.data.publishedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }));
                } catch { /* ignore */ }
            }
            return parts.length > 0 ? parts.join(' · ') : null;
        }
        case 'note':
            return n.data.body ? n.data.body.slice(0, 60) + (n.data.body.length > 60 ? '…' : '') : null;
        case 'entity':
            return n.data.type ?? null;
        case 'narrative':
            return n.data.category ?? null;
        default:
            return null;
    }
}

// ── Navigator sub-view ──────────────────────────────────────────
type NavView = 'type' | 'group';

export const NavigatorPane: React.FC<NavigatorPaneProps> = ({
    state,
    open,
    onToggle,
    onSelectNode,
    onOrganize,
    onClearLayout,
}) => {
    // Connection count per node
    const connectionMap = useMemo(() => {
        const m = new Map<string, number>();
        for (const e of state.edges) {
            m.set(e.source, (m.get(e.source) ?? 0) + 1);
            m.set(e.target, (m.get(e.target) ?? 0) + 1);
        }
        return m;
    }, [state.edges]);

    const hasLayoutGroups = !!state.activeLayoutMode && state.layoutGroups.length > 0;
    const navView: NavView = hasLayoutGroups ? 'group' : 'type';

    // ── Group nodes by type ──
    const typeGrouped = useMemo(() => {
        const map = new Map<string, CanvasNode[]>();
        for (const g of TYPE_GROUPS) map.set(g.key, []);
        for (const n of state.nodes) {
            const list = map.get(n.type);
            if (list) list.push(n);
        }
        return map;
    }, [state.nodes]);

    // ── Group nodes by layout groups ──
    const layoutGrouped = useMemo(() => {
        if (!hasLayoutGroups) return [];
        const nodeMap = new Map(state.nodes.map(n => [n.id, n]));
        return state.layoutGroups.map((lg: LayoutGroup) => {
            const nodes = lg.nodeIds.map(id => nodeMap.get(id)).filter((n): n is CanvasNode => !!n);
            return { ...lg, nodes };
        });
    }, [state.nodes, state.layoutGroups, hasLayoutGroups]);

    // Group-by mode label
    const groupModeLabel = state.activeLayoutMode?.replace('group-', '') ?? 'group';

    // ── Entity nesting: map articles to their linked child nodes ──
    const articleChildMap = useMemo(() => {
        const map = new Map<string, CanvasNode[]>();
        const nodeById = new Map(state.nodes.map(n => [n.id, n]));
        for (const edge of state.edges) {
            const source = nodeById.get(edge.source);
            const target = nodeById.get(edge.target);
            if (source?.type === 'article' && target && target.type !== 'article') {
                const list = map.get(source.id) ?? [];
                list.push(target);
                map.set(source.id, list);
            } else if (target?.type === 'article' && source && source.type !== 'article') {
                const list = map.get(target.id) ?? [];
                list.push(source);
                map.set(target.id, list);
            }
        }
        return map;
    }, [state.nodes, state.edges]);

    const nestedNodeIds = useMemo(() => {
        const set = new Set<string>();
        for (const children of articleChildMap.values()) {
            for (const child of children) set.add(child.id);
        }
        return set;
    }, [articleChildMap]);

    return (
        <aside className={`rf-navigator-pane${open ? ' rf-navigator-pane--open' : ''}`}>
            {/* Collapse handle */}
            <button className="rf-navigator-pane__toggle" onClick={onToggle} title="Toggle navigator">
                {open ? '›' : '‹'}
            </button>

            {open && (
                <>
                    <header className="rf-navigator-pane__header">
                        <h3 className="rf-navigator-pane__title">Pinned</h3>
                        <span className="rf-navigator-pane__count">
                            {state.nodes.length}
                        </span>
                    </header>

                    {/* ── Stats strip ── */}
                    <div className="rf-navigator-pane__stats">
                        <span className="rf-navigator-pane__stat" title="Articles">📄 {typeGrouped.get('article')?.length ?? 0}</span>
                        <span className="rf-navigator-pane__stat" title="Entities">👤 {typeGrouped.get('entity')?.length ?? 0}</span>
                        <span className="rf-navigator-pane__stat" title="Narratives">📖 {typeGrouped.get('narrative')?.length ?? 0}</span>
                        <span className="rf-navigator-pane__stat" title="Claims">💬 {typeGrouped.get('claim')?.length ?? 0}</span>
                        <span className="rf-navigator-pane__stat" title="Connections">🔗 {state.edges.length}</span>
                    </div>

                    {/* ── Organize controls ── */}
                    <div className="rf-navigator-pane__organize">
                        <span className="rf-navigator-pane__organize-label">Organize</span>
                        <div className="rf-navigator-pane__organize-btns">
                            <button
                                className={`rf-navigator-pane__org-btn${!state.activeLayoutMode ? ' rf-navigator-pane__org-btn--active' : ''}`}
                                onClick={onClearLayout}
                            >📋 Type</button>
                            <button
                                className={`rf-navigator-pane__org-btn${state.activeLayoutMode === 'group-date' ? ' rf-navigator-pane__org-btn--active' : ''}`}
                                onClick={() => onOrganize?.('group-date')}
                            >
                                📅 Date
                                {state.activeLayoutMode === 'group-date' && (
                                    <span className="rf-navigator-pane__depth-badge">
                                        {getDepthLabel('group-date', state.layoutDepth)}
                                    </span>
                                )}
                            </button>
                            <button
                                className={`rf-navigator-pane__org-btn${state.activeLayoutMode === 'group-location' ? ' rf-navigator-pane__org-btn--active' : ''}`}
                                onClick={() => onOrganize?.('group-location')}
                            >
                                📍 Location
                                {state.activeLayoutMode === 'group-location' && (
                                    <span className="rf-navigator-pane__depth-badge">
                                        {getDepthLabel('group-location', state.layoutDepth)}
                                    </span>
                                )}
                            </button>
                            <button
                                className={`rf-navigator-pane__org-btn${state.activeLayoutMode === 'group-entity' ? ' rf-navigator-pane__org-btn--active' : ''}`}
                                onClick={() => onOrganize?.('group-entity')}
                            >🏷 Entity</button>
                        </div>
                    </div>

                    <div className="rf-navigator-pane__list">
                        {state.nodes.length === 0 && (
                            <div className="rf-navigator-pane__empty">
                                Pin articles from the Feed to get started.
                            </div>
                        )}

                        {/* ── Layout-group view (entities nested under articles) ── */}
                        {navView === 'group' && hasLayoutGroups && layoutGrouped.map(lg => (
                            <LayoutSection
                                key={lg.id}
                                group={lg}
                                nodes={lg.nodes}
                                selectedNodeId={state.selectedNodeId}
                                onSelectNode={onSelectNode}
                                connectionMap={connectionMap}
                                articleChildMap={articleChildMap}
                                nestedNodeIds={nestedNodeIds}
                            />
                        ))}

                        {/* ── Type view (default) ── */}
                        {navView === 'type' && TYPE_GROUPS.map(tg => {
                            const nodes = typeGrouped.get(tg.key);
                            if (!nodes || nodes.length === 0) return null;
                            return (
                                <TypeSection
                                    key={tg.key}
                                    group={tg}
                                    nodes={nodes}
                                    selectedNodeId={state.selectedNodeId}
                                    onSelectNode={onSelectNode}
                                    connectionMap={connectionMap}
                                />
                            );
                        })}
                    </div>
                </>
            )}
        </aside>
    );
};

// ─── Layout-group section (date / location / entity) ────────────

const LayoutSection: React.FC<{
    group: LayoutGroup;
    nodes: CanvasNode[];
    selectedNodeId: string | null;
    onSelectNode: (id: string) => void;
    connectionMap: Map<string, number>;
    articleChildMap: Map<string, CanvasNode[]>;
    nestedNodeIds: Set<string>;
}> = ({ group, nodes, selectedNodeId, onSelectNode, connectionMap, articleChildMap, nestedNodeIds }) => {
    const articles = nodes.filter(n => n.type === 'article');
    const standalone = nodes.filter(n => n.type !== 'article' && !nestedNodeIds.has(n.id));

    return (
        <div className="rf-navigator-pane__section">
            <div
                className="rf-navigator-pane__section-label"
                style={{ borderLeftColor: group.color || '#58a6ff' }}
            >
                {group.label}
                <span className="rf-navigator-pane__section-count">{nodes.length}</span>
            </div>
            {articles.map(article => (
                <React.Fragment key={article.id}>
                    <NodeRow
                        node={article}
                        icon={TYPE_ICON[article.type] || '📄'}
                        selected={selectedNodeId === article.id}
                        onSelect={onSelectNode}
                        connections={connectionMap.get(article.id) ?? 0}
                    />
                    {(articleChildMap.get(article.id) ?? []).map(child => (
                        <NodeRow
                            key={child.id}
                            node={child}
                            icon={TYPE_ICON[child.type] || '📄'}
                            selected={selectedNodeId === child.id}
                            onSelect={onSelectNode}
                            connections={connectionMap.get(child.id) ?? 0}
                            nested
                        />
                    ))}
                </React.Fragment>
            ))}
            {standalone.map(n => (
                <NodeRow
                    key={n.id}
                    node={n}
                    icon={TYPE_ICON[n.type] || '📄'}
                    selected={selectedNodeId === n.id}
                    onSelect={onSelectNode}
                    connections={connectionMap.get(n.id) ?? 0}
                />
            ))}
        </div>
    );
};

// ─── Type-group section ─────────────────────────────────────────

const TypeSection: React.FC<{
    group: TypeGroup;
    nodes: CanvasNode[];
    selectedNodeId: string | null;
    onSelectNode: (id: string) => void;
    connectionMap: Map<string, number>;
}> = ({ group, nodes, selectedNodeId, onSelectNode, connectionMap }) => (
    <div className="rf-navigator-pane__section">
        <div
            className="rf-navigator-pane__section-label"
            style={{ borderLeftColor: group.color }}
        >
            {group.icon} {group.label}
            <span className="rf-navigator-pane__section-count">{nodes.length}</span>
        </div>
        {nodes.map(n => (
            <NodeRow
                key={n.id}
                node={n}
                icon={group.icon}
                selected={selectedNodeId === n.id}
                onSelect={onSelectNode}
                connections={connectionMap.get(n.id) ?? 0}
            />
        ))}
    </div>
);

// ─── Single node row ────────────────────────────────────────────

const NodeRow: React.FC<{
    node: CanvasNode;
    icon: string;
    selected: boolean;
    onSelect: (id: string) => void;
    connections: number;
    nested?: boolean;
}> = ({ node, icon, selected, onSelect, connections, nested }) => {
    const sub = nodeSubtitle(node);
    return (
        <button
            className={`rf-navigator-pane__node${selected ? ' rf-navigator-pane__node--selected' : ''}${nested ? ' rf-navigator-pane__node--nested' : ''}`}
            onClick={() => onSelect(node.id)}
        >
            <span className="rf-navigator-pane__node-icon">{icon}</span>
            <span className="rf-navigator-pane__node-text">
                <span className="rf-navigator-pane__node-label">{nodeLabel(node)}</span>
                {sub && <span className="rf-navigator-pane__node-sub">{sub}</span>}
            </span>
            {connections > 0 && (
                <span className="rf-navigator-pane__node-badge" title={`${connections} connection${connections !== 1 ? 's' : ''}`}>
                    {connections}
                </span>
            )}
        </button>
    );
};
