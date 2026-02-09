import React, { useMemo } from 'react';
import { CanvasState, CanvasNode, WorkspaceGroup } from '../../../canvas/CanvasTypes';
import './navigator-pane.scss';

// ─── NavigatorPane ──────────────────────────────────────────────
// Right-side pane showing all workspace elements grouped by node
// type. Clicking a node selects it and opens its detail in the
// left-side DetailPane.

export interface NavigatorPaneProps {
    state: CanvasState;
    open: boolean;
    onToggle: () => void;
    /** Fired when user clicks a node — should select + open detail */
    onSelectNode: (nodeId: string) => void;
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

export const NavigatorPane: React.FC<NavigatorPaneProps> = ({
    state,
    open,
    onToggle,
    onSelectNode,
}) => {
    // Group nodes by type
    const grouped = useMemo(() => {
        const map = new Map<string, CanvasNode[]>();
        for (const g of TYPE_GROUPS) map.set(g.key, []);
        for (const n of state.nodes) {
            const list = map.get(n.type);
            if (list) list.push(n);
        }
        return map;
    }, [state.nodes]);

    return (
        <aside className={`rf-navigator-pane${open ? ' rf-navigator-pane--open' : ''}`}>
            {/* Collapse handle */}
            <button className="rf-navigator-pane__toggle" onClick={onToggle} title="Toggle navigator">
                {open ? '›' : '‹'}
            </button>

            {open && (
                <>
                    <header className="rf-navigator-pane__header">
                        <h3 className="rf-navigator-pane__title">Navigator</h3>
                        <span className="rf-navigator-pane__count">
                            {state.nodes.length}
                        </span>
                    </header>

                    <div className="rf-navigator-pane__list">
                        {state.nodes.length === 0 && (
                            <div className="rf-navigator-pane__empty">
                                No nodes on canvas
                            </div>
                        )}

                        {TYPE_GROUPS.map(tg => {
                            const nodes = grouped.get(tg.key);
                            if (!nodes || nodes.length === 0) return null;
                            return (
                                <TypeSection
                                    key={tg.key}
                                    group={tg}
                                    nodes={nodes}
                                    selectedNodeId={state.selectedNodeId}
                                    onSelectNode={onSelectNode}
                                />
                            );
                        })}
                    </div>
                </>
            )}
        </aside>
    );
};

// ─── Type-group section ─────────────────────────────────────────

const TypeSection: React.FC<{
    group: TypeGroup;
    nodes: CanvasNode[];
    selectedNodeId: string | null;
    onSelectNode: (id: string) => void;
}> = ({ group, nodes, selectedNodeId, onSelectNode }) => (
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
}> = ({ node, icon, selected, onSelect }) => {
    const sub = nodeSubtitle(node);
    return (
        <button
            className={`rf-navigator-pane__node${selected ? ' rf-navigator-pane__node--selected' : ''}`}
            onClick={() => onSelect(node.id)}
        >
            <span className="rf-navigator-pane__node-icon">{icon}</span>
            <span className="rf-navigator-pane__node-text">
                <span className="rf-navigator-pane__node-label">{nodeLabel(node)}</span>
                {sub && <span className="rf-navigator-pane__node-sub">{sub}</span>}
            </span>
        </button>
    );
};
