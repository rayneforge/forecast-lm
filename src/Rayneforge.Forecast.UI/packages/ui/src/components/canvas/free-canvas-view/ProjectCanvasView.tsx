import React, { useMemo, useRef, useCallback, useState } from 'react';
import { CanvasState, CanvasNode, CanvasEdge } from '../../../canvas/CanvasTypes';
import type { LayoutGroup } from '../../../canvas/useLayout';
import { ArticleNodeComponent } from '../article-node/ArticleNode';
import { NoteNodeComponent } from '../note-node/NoteNode';
import { EntityNodeComponent } from '../entity-node/EntityNode';
import { NarrativeNodeComponent } from '../narrative-node/NarrativeNodeComponent';
import { ClaimNodeComponent } from '../claim-node/ClaimNodeComponent';
import { CanvasEdges } from '../canvas-edges/CanvasEdges';
import { getNodeBounds } from '../../../canvas/physics/nodeBounds';
import './project-canvas-view.scss';

// ─── Props ──────────────────────────────────────────────────────

export interface ProjectCanvasViewProps {
    state: CanvasState;
    onSelectNode: (id: string | null) => void;
    onVisualize?: (nodeId: string) => void;
    externalDetailNodeId?: string | null;
    onExternalDetailConsumed?: () => void;
    previewArticle?: any;
    onPreviewArticleClear?: () => void;
    onGroupByDate?: () => void;
    onGroupByLocation?: () => void;
}

// ─── Helpers ────────────────────────────────────────────────────

const CANVAS_PAD = 120;

function computeBounds(nodes: CanvasNode[]) {
    if (nodes.length === 0) return { minX: 0, minY: 0, w: 600, h: 400 };
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const n of nodes) {
        const { width, height } = getNodeBounds(n.type);
        minX = Math.min(minX, n.position.x);
        minY = Math.min(minY, n.position.y);
        maxX = Math.max(maxX, n.position.x + width);
        maxY = Math.max(maxY, n.position.y + height);
    }
    return {
        minX: minX - CANVAS_PAD,
        minY: minY - CANVAS_PAD,
        w: maxX - minX + CANVAS_PAD * 2,
        h: maxY - minY + CANVAS_PAD * 2,
    };
}

/** Compute the center of a cluster of nodes → for group label placement */
function clusterCenter(nodes: CanvasNode[], offsetX: number, offsetY: number) {
    if (nodes.length === 0) return { x: 0, y: 0 };
    let sx = 0, sy = 0;
    for (const n of nodes) {
        sx += n.position.x + offsetX;
        sy += n.position.y + offsetY;
    }
    return { x: sx / nodes.length, y: (sy / nodes.length) - 30 };
}

// ─── Component ──────────────────────────────────────────────────

const NOOP_MOVE = () => {};

export const ProjectCanvasView: React.FC<ProjectCanvasViewProps> = ({
    state,
    onSelectNode,
    externalDetailNodeId,
    onExternalDetailConsumed,
    onVisualize,
    previewArticle,
    onPreviewArticleClear,
    onGroupByDate,
    onGroupByLocation,
}) => {
    const viewportRef = useRef<HTMLDivElement>(null);

    // ── Pan state ────────────────────────────────────────
    const [pan, setPan] = useState({ x: 0, y: 0 });
    const panStart = useRef<{ x: number; y: number; panX: number; panY: number } | null>(null);

    // ── Zoom state ───────────────────────────────────────
    const [zoom, setZoom] = useState(1);
    const MIN_ZOOM = 0.2;
    const MAX_ZOOM = 3;

    const handleWheel = useCallback((e: React.WheelEvent) => {
        e.preventDefault();
        const rect = viewportRef.current?.getBoundingClientRect();
        if (!rect) return;

        // Cursor position relative to the viewport
        const cx = e.clientX - rect.left;
        const cy = e.clientY - rect.top;

        const delta = e.deltaY > 0 ? 0.9 : 1.1;
        setZoom(prev => {
            const next = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, prev * delta));
            // Adjust pan so zoom targets the cursor position
            const scale = next / prev;
            setPan(p => ({
                x: cx - scale * (cx - p.x),
                y: cy - scale * (cy - p.y),
            }));
            return next;
        });
    }, []);

    const handlePointerDown = useCallback((e: React.PointerEvent) => {
        // Only pan on middle-click or when clicking the canvas background
        if (e.button === 1 || (e.target as HTMLElement).closest('.rf-graph__surface')) {
            if (!(e.target as HTMLElement).closest('[data-node-id]')) {
                panStart.current = { x: e.clientX, y: e.clientY, panX: pan.x, panY: pan.y };
                (e.target as HTMLElement).setPointerCapture(e.pointerId);
            }
        }
    }, [pan]);

    const handlePointerMove = useCallback((e: React.PointerEvent) => {
        if (!panStart.current) return;
        setPan({
            x: panStart.current.panX + (e.clientX - panStart.current.x),
            y: panStart.current.panY + (e.clientY - panStart.current.y),
        });
    }, []);

    const handlePointerUp = useCallback(() => {
        panStart.current = null;
    }, []);

    // ── Scroll-to-node (for navigator clicks) ───────────
    const scrollToNode = useCallback((nodeId: string) => {
        const el = viewportRef.current?.querySelector(`[data-node-id="${nodeId}"]`);
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
    }, []);

    React.useEffect(() => {
        (window as any).__rfScrollToNode = scrollToNode;
        return () => { delete (window as any).__rfScrollToNode; };
    }, [scrollToNode]);

    React.useEffect(() => {
        if (externalDetailNodeId) {
            requestAnimationFrame(() => scrollToNode(externalDetailNodeId));
        }
    }, [externalDetailNodeId, scrollToNode]);

    const activeNodeId = externalDetailNodeId || state.selectedNodeId;

    // ── Compute bounds + offsets for the whole graph ─────
    const bounds = useMemo(() => computeBounds(state.nodes), [state.nodes]);
    const offsetX = -bounds.minX;
    const offsetY = -bounds.minY;

    // ── Offset-adjusted nodes (for edge rendering) ──────
    const adjNodes = useMemo(() =>
        state.nodes.map(n => ({
            ...n,
            position: { x: n.position.x + offsetX, y: n.position.y + offsetY, z: n.position.z },
        })),
    [state.nodes, offsetX, offsetY]);

    // ── Group labels (floating on the canvas) ───────────
    const groupLabels = useMemo(() => {
        if (!state.activeLayoutMode || state.layoutGroups.length === 0) return [];
        const nodeMap = new Map(state.nodes.map(n => [n.id, n]));
        return state.layoutGroups.map((lg: LayoutGroup) => {
            const nodes = lg.nodeIds.map(id => nodeMap.get(id)).filter((n): n is CanvasNode => !!n);
            const center = clusterCenter(nodes, offsetX, offsetY);
            return { id: lg.id, label: lg.label, color: lg.color, ...center };
        });
    }, [state.layoutGroups, state.activeLayoutMode, state.nodes, offsetX, offsetY]);

    // ── Render a single node ────────────────────────────
    const renderNode = (node: CanvasNode) => {
        const selected = node.id === activeNodeId;
        const pos = { x: node.position.x + offsetX, y: node.position.y + offsetY, z: node.position.z };
        const common = { layoutMode: 'absolute' as const, selected, onMove: NOOP_MOVE, onSelect: onSelectNode };

        switch (node.type) {
            case 'article':
                return <div key={node.id} data-node-id={node.id}><ArticleNodeComponent node={{ ...node, position: pos }} {...common} /></div>;
            case 'note':
                return <div key={node.id} data-node-id={node.id}><NoteNodeComponent node={{ ...node, position: pos }} {...common} /></div>;
            case 'entity':
                return <div key={node.id} data-node-id={node.id}><EntityNodeComponent node={{ ...node, position: pos }} {...common} /></div>;
            case 'narrative':
                return <div key={node.id} data-node-id={node.id}><NarrativeNodeComponent node={{ ...node, position: pos }} {...common} /></div>;
            case 'claim':
                return <div key={node.id} data-node-id={node.id}><ClaimNodeComponent node={{ ...node, position: pos }} {...common} /></div>;
        }
    };

    return (
        <div className="rf-graph">
            {/* ── Pannable viewport ─────────────────────── */}
            <div
                className="rf-graph__viewport"
                ref={viewportRef}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onWheel={handleWheel}
            >
                <div
                    className="rf-graph__surface"
                    style={{
                        width: bounds.w,
                        height: bounds.h,
                        transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                        transformOrigin: '0 0',
                    }}
                >
                    {/* Group cluster labels */}
                    {groupLabels.map(gl => (
                        <div
                            key={gl.id}
                            className="rf-graph__group-label"
                            style={{
                                left: gl.x,
                                top: gl.y,
                                borderColor: gl.color || undefined,
                            }}
                        >
                            {gl.label}
                        </div>
                    ))}

                    {/* SVG edge layer — all edges on one surface */}
                    <CanvasEdges
                        edges={state.edges}
                        nodes={adjNodes}
                        groups={[]}
                    />

                    {/* All nodes */}
                    {state.nodes.map(n => renderNode(n))}
                </div>
            </div>

            {state.nodes.length === 0 && (
                <div className="rf-graph__empty">
                    No nodes yet. Pin articles from the Feed to build your graph.
                </div>
            )}

            {/* ── Zoom indicator ── */}
            <div className="rf-graph__zoom-badge">
                {Math.round(zoom * 100)}%
            </div>

        </div>
    );
};
