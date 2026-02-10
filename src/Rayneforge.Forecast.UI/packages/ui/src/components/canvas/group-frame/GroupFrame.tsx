import React, { useRef, useCallback, useMemo, PointerEvent as RPointerEvent } from 'react';
import { ChainGroup, CanvasNode, Vector3 } from '../../../canvas/CanvasTypes';
import { getNodeBounds } from '../../../canvas/physics/nodeBounds';
import type { LayoutMode, LayoutGroup } from '../../../canvas/useLayout';
import './group-frame.scss';

export type GroupFrameVariant = 'chain' | 'layout' | 'workspace';

export interface GroupFrameProps {
    group: ChainGroup;
    nodes: CanvasNode[];
    /** Visual variant — chain (user-created), layout (group-by), workspace */
    variant?: GroupFrameVariant;
    /** Pre-computed bounds from the layout algorithm (bypasses getBounds) */
    layoutBounds?: { x: number; y: number; w: number; h: number };
    selected?: boolean;
    /** Current camera zoom — needed to scale screen→world deltas when dragging */
    zoom?: number;
    onSelect?: (groupId: string) => void;
    onRemove?: (groupId: string) => void;
    /** Move the group frame (independent drag) */
    onMoveGroup?: (groupId: string, delta: Vector3) => void;
    /** Fired when a node is dragged out of this frame */
    onDragOut?: (nodeId: string, groupId: string) => void;
    /** Workspace drill-down */
    onDrillInto?: (groupId: string) => void;

    /* ── Workspace-level layout controls (only for variant="workspace") ── */
    /** Currently active layout mode */
    activeLayoutMode?: LayoutMode | null;
    /** Current drill depth */
    layoutDepth?: number;
    /** Trigger a layout reflow within this workspace */
    onReflow?: (mode: LayoutMode) => void;
    /** Drill in */
    onDrillIn?: () => void;
    /** Drill out */
    onDrillOut?: () => void;
    /** Clear layout groups */
    onClearLayout?: () => void;
    /** Add a new note to this workspace */
    onAddNote?: () => void;
    /** Human-readable depth label */
    depthLabel?: string;
    /** Child layout groups (rendered inside workspace variant) */
    childLayoutGroups?: LayoutGroup[];
    layoutMode?: 'flow' | 'absolute';

    children?: React.ReactNode;
}

// ─── Node sizing (delegates to single source of truth) ──────────

export function getNodeWidth(type: string): number {
    return getNodeBounds(type as any).width;
}

export function getNodeHeight(type: string): number {
    return getNodeBounds(type as any).height;
}

/** Bounding box around member nodes (2D projection, z ignored) */
function getBounds(nodes: CanvasNode[], padding = 20, childGroupBounds?: { x: number; y: number; w: number; h: number }[]) {
    if (nodes.length === 0 && (!childGroupBounds || childGroupBounds.length === 0)) {
        return { x: 0, y: 0, w: 120, h: 80 };
    }

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const n of nodes) {
        minX = Math.min(minX, n.position.x);
        minY = Math.min(minY, n.position.y);
        const w = getNodeWidth(n.type);
        const h = getNodeHeight(n.type);
        maxX = Math.max(maxX, n.position.x + w);
        maxY = Math.max(maxY, n.position.y + h);
    }

    // Encompass child layout group bounds if present
    if (childGroupBounds) {
        for (const b of childGroupBounds) {
            minX = Math.min(minX, b.x);
            minY = Math.min(minY, b.y);
            maxX = Math.max(maxX, b.x + b.w);
            maxY = Math.max(maxY, b.y + b.h);
        }
    }

    return {
        x: minX - padding,
        y: minY - padding - 24, // extra room for label
        w: maxX - minX + padding * 2,
        h: maxY - minY + padding * 2 + 24,
    };
}

export const GroupFrame: React.FC<GroupFrameProps> = ({
    group, nodes, variant = 'chain', layoutBounds, selected, zoom = 1,
    onSelect, onRemove, onMoveGroup, onDragOut, onDrillInto,
    activeLayoutMode, layoutDepth, onReflow, onDrillIn, onDrillOut, onClearLayout, onAddNote, depthLabel,
    childLayoutGroups,
    children,
    layoutMode = 'absolute',
}) => {
    const memberNodes = useMemo(() => {
        const idSet = new Set(group.nodeIds);
        return nodes.filter(n => idSet.has(n.id));
    }, [nodes, group.nodeIds]);

    // Collect child layout group bounds for workspace auto-sizing
    const childBounds = useMemo(() => {
        if (!childLayoutGroups || childLayoutGroups.length === 0) return undefined;
        return childLayoutGroups
            .filter(lg => lg.bounds)
            .map(lg => lg.bounds!);
    }, [childLayoutGroups]);

    // Use pre-computed layout bounds if available, otherwise derive from node positions
    const bounds = useMemo(() => {
        if (layoutMode === 'flow') return { x: 0, y: 0, w: 0, h: 0 };
        return layoutBounds ?? getBounds(memberNodes, variant === 'workspace' ? 40 : 20, childBounds);
    }, [layoutMode, layoutBounds, memberNodes, variant, childBounds]);

    // ── Independent group drag ──────────────────────────────
    const dragging = useRef(false);
    const dragStart = useRef({ x: 0, y: 0 });

    const handlePointerDown = useCallback((e: RPointerEvent<HTMLSpanElement>) => {
        if (!onMoveGroup || layoutMode === 'flow') return;
        e.stopPropagation();
        e.preventDefault();
        dragging.current = true;
        dragStart.current = { x: e.clientX, y: e.clientY };
        (e.target as HTMLElement).setPointerCapture(e.pointerId);
    }, [onMoveGroup, layoutMode]);

    const handlePointerMove = useCallback((e: RPointerEvent<HTMLSpanElement>) => {
        if (!dragging.current || !onMoveGroup) return;
        e.stopPropagation();
        const dx = (e.clientX - dragStart.current.x) / zoom;
        const dy = (e.clientY - dragStart.current.y) / zoom;
        dragStart.current = { x: e.clientX, y: e.clientY };
        onMoveGroup(group.id, { x: dx, y: dy, z: 0 });
    }, [zoom, group.id, onMoveGroup]);

    const handlePointerUp = useCallback((e: RPointerEvent<HTMLSpanElement>) => {
        if (!dragging.current) return;
        dragging.current = false;
        try { (e.target as HTMLElement).releasePointerCapture(e.pointerId); } catch { /* ok */ }
    }, []);

    const handleLabelClick = useCallback(() => {
        if (variant === 'workspace' && onDrillInto) {
            onDrillInto(group.id);
        } else {
            onSelect?.(group.id);
        }
    }, [variant, group.id, onDrillInto, onSelect]);

    const cls = [
        'rf-group-frame',
        `rf-group-frame--${variant}`,
        layoutMode === 'flow' && 'rf-group-frame--flow',
        selected && 'rf-group-frame--selected',
    ].filter(Boolean).join(' ');

    const style: React.CSSProperties = layoutMode === 'flow'
        ? {
            position: 'relative',
            borderColor: group.color || undefined,
            width: '100%',
        }
        : {
            left: bounds.x,
            top: bounds.y,
            width: bounds.w,
            height: bounds.h,
            borderColor: group.color || undefined,
        };

    return (
        <div
            className={cls}
            style={style}
        >
            <span
                className="rf-group-frame__label"
                onClick={handleLabelClick}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
            >
                {variant === 'workspace' ? `📁 ${group.label}` : `${group.label} (${memberNodes.length})`}
            </span>
            <div className="rf-group-frame__toolbar">
                {variant === 'workspace' && onDrillInto && (
                    <button
                        className="rf-icon-btn"
                        onClick={() => onDrillInto(group.id)}
                        aria-label="Drill into workspace"
                        title="Drill into workspace"
                    >
                        ⤵
                    </button>
                )}
                {onRemove && (
                    <button
                        className="rf-icon-btn"
                        onClick={() => onRemove(group.id)}
                        aria-label="Remove group"
                    >
                        ×
                    </button>
                )}
            </div>

            {/* ── Workspace-level layout controls (in-canvas) ── */}
            {variant === 'workspace' && onReflow && (
                <div className="rf-group-frame__ws-controls" onClick={e => e.stopPropagation()}>
                    {onAddNote && (
                        <button className="rf-group-frame__ws-btn" onClick={onAddNote} title="Add note to workspace">
                            ＋ Note
                        </button>
                    )}
                    <span className="rf-group-frame__ws-sep" />
                    <button
                        className={`rf-group-frame__ws-btn${activeLayoutMode === 'center' ? ' rf-group-frame__ws-btn--active' : ''}`}
                        onClick={() => { onClearLayout?.(); onReflow('center'); }}
                        title="Center-out layout"
                    >
                        ◎
                    </button>
                    <button
                        className={`rf-group-frame__ws-btn${activeLayoutMode === 'group-date' ? ' rf-group-frame__ws-btn--active' : ''}`}
                        onClick={() => onReflow('group-date')}
                        title="Group by date"
                    >
                        📅
                    </button>
                    <button
                        className={`rf-group-frame__ws-btn${activeLayoutMode === 'group-location' ? ' rf-group-frame__ws-btn--active' : ''}`}
                        onClick={() => onReflow('group-location')}
                        title="Group by location"
                    >
                        🌍
                    </button>
                    <button
                        className={`rf-group-frame__ws-btn${activeLayoutMode === 'group-entity' ? ' rf-group-frame__ws-btn--active' : ''}`}
                        onClick={() => onReflow('group-entity')}
                        title="Group by entity"
                    >
                        👤
                    </button>
                    {(activeLayoutMode === 'group-date' || activeLayoutMode === 'group-location') && onDrillIn && onDrillOut && (
                        <>
                            <span className="rf-group-frame__ws-sep" />
                            <button className="rf-group-frame__ws-btn" onClick={onDrillOut} disabled={(layoutDepth ?? 0) <= 0} title="Drill out">⊖</button>
                            {depthLabel && <span className="rf-group-frame__ws-depth">{depthLabel}</span>}
                            <button className="rf-group-frame__ws-btn" onClick={onDrillIn} disabled={activeLayoutMode === 'group-date' ? (layoutDepth ?? 1) >= 2 : (layoutDepth ?? 1) >= 5} title="Drill in">⊕</button>
                        </>
                    )}
                </div>
            )}
            {children}
        </div>
    );
};
