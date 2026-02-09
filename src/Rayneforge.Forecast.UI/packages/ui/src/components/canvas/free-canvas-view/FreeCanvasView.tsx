import React, { useRef, useCallback, useEffect, useState, WheelEvent, PointerEvent as RPointerEvent } from 'react';
import { CanvasState, CanvasNode, Vector3, vec3, WorkspaceGroup } from '../../../canvas/CanvasTypes';
import { useCanvasPhysics } from '../../../canvas/physics/useCanvasPhysics';
import { ArticleNodeComponent } from '../article-node/ArticleNode';
import { NoteNodeComponent } from '../note-node/NoteNode';
import { EntityNodeComponent } from '../entity-node/EntityNode';
import { NarrativeNodeComponent } from '../narrative-node/NarrativeNodeComponent';
import { ClaimNodeComponent } from '../claim-node/ClaimNodeComponent';
import { GroupFrame } from '../group-frame/GroupFrame';
import { CanvasEdges } from '../canvas-edges/CanvasEdges';
import { DetailPane } from '../detail-pane';
import { WorkspaceOverlay } from '../workspace-overlay';
import { getNodeBounds } from '../../../canvas/physics/nodeBounds';
import { CanvasEdge } from '../../../canvas/CanvasTypes';
import type { LayoutMode } from '../../../canvas/useLayout';
import './free-canvas-view.scss';

export interface FreeCanvasViewProps {
    state: CanvasState;
    onMoveNode: (id: string, pos: Vector3) => void;
    onSelectNode: (id: string | null) => void;
    onSelectGroup: (id: string | null) => void;
    onRemoveGroup: (id: string) => void;
    /** Move all member nodes of a chain group by delta (independent group drag) */
    onMoveGroup?: (groupId: string, delta: Vector3) => void;
    /** Move all member nodes of a workspace group by delta */
    onMoveWorkspaceGroup?: (groupId: string, delta: Vector3) => void;
    onPanCamera: (delta: Vector3) => void;
    onZoom: (zoom: number) => void;
    /** Create a new edge between two nodes */
    onAddEdge?: (edge: CanvasEdge) => void;
    /** Trigger propagate layout from a specific node (detail-pane Visualize) */
    onVisualize?: (nodeId: string) => void;

    /* ── Layout controls (passed to workspace GroupFrames) ── */
    onReflow?: (mode: LayoutMode, rootNodeId?: string) => void;
    onDrillIn?: () => void;
    onDrillOut?: () => void;
    onClearLayout?: () => void;
    depthLabel?: string;

    /* ── Add note (workspace-level) ── */
    onAddNote?: () => void;

    /* ── External detail pane control ── */
    /** Force-open detail pane for a specific node (e.g. from article click in side pane) */
    externalDetailNodeId?: string | null;
    onExternalDetailConsumed?: () => void;

    /* ── Article preview (no canvas node needed) ── */
    previewArticle?: import('@rayneforge/logic').NewsArticle | null;
    onPreviewArticleClear?: () => void;

    /* ── Group-by actions from detail pane ── */
    onGroupByDate?: () => void;
    onGroupByLocation?: () => void;
}

// ─── Pan inertia constants ──────────────────────────────────────
const PAN_DECAY = 0.93;
const PAN_MIN = 0.5;
const PAN_SAMPLE_COUNT = 4;

interface PanSample { x: number; y: number; time: number }

export const FreeCanvasView: React.FC<FreeCanvasViewProps> = ({
    state, onMoveNode, onSelectNode, onSelectGroup, onRemoveGroup,
    onMoveGroup, onMoveWorkspaceGroup,
    onPanCamera, onZoom, onAddEdge, onVisualize,
    onReflow, onDrillIn, onDrillOut, onClearLayout, depthLabel, onAddNote,
    externalDetailNodeId, onExternalDetailConsumed,
    previewArticle, onPreviewArticleClear,
    onGroupByDate, onGroupByLocation,
}) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const isPanning = useRef(false);
    const panStart = useRef({ x: 0, y: 0 });

    // Pan velocity tracking
    const panSamples = useRef<PanSample[]>([]);
    const panSampleIdx = useRef(0);
    const panVelocity = useRef({ x: 0, y: 0 });
    const panRaf = useRef(0);

    // Zoom smoothing
    const targetZoom = useRef(state.camera.zoom);
    const zoomRaf = useRef(0);

    // ── Physics ─────────────────────────────────────────────
    const { positions, api } = useCanvasPhysics(state);

    // ── Detail pane (double-click driven, ephemeral) ────────
    const [detailNodeId, setDetailNodeId] = useState<string | null>(null);
    const lastClickRef = useRef<{ id: string; time: number } | null>(null);

    // ── Workspace overlay (drill-down) ──────────────────────
    const [drilledWorkspaceId, setDrilledWorkspaceId] = useState<string | null>(null);
    const drilledWorkspace = drilledWorkspaceId
        ? state.workspaceGroups.find(w => w.id === drilledWorkspaceId) ?? null
        : null;

    // Sync external detail node request (from side pane article click)
    useEffect(() => {
        if (externalDetailNodeId) {
            setDetailNodeId(externalDetailNodeId);
            onExternalDetailConsumed?.();
        }
    }, [externalDetailNodeId, onExternalDetailConsumed]);

    /** Move all member nodes of a group by a delta */
    const handleMoveChainGroup = useCallback((groupId: string, delta: Vector3) => {
        const g = state.groups.find(g => g.id === groupId);
        if (!g) return;
        for (const nid of g.nodeIds) {
            const body = positions.get(nid);
            if (body) {
                const newPos = { x: body.x + delta.x, y: body.y + delta.y, z: body.z };
                api.drag(nid, newPos);
                onMoveNode(nid, newPos);
            }
        }
        onMoveGroup?.(groupId, delta);
    }, [state.groups, positions, api, onMoveNode, onMoveGroup]);

    /** Move all member nodes of a workspace group by a delta */
    const handleMoveWSGroup = useCallback((groupId: string, delta: Vector3) => {
        const g = state.workspaceGroups.find(g => g.id === groupId);
        if (!g) return;
        for (const nid of g.nodeIds) {
            const body = positions.get(nid);
            if (body) {
                const newPos = { x: body.x + delta.x, y: body.y + delta.y, z: body.z };
                api.drag(nid, newPos);
                onMoveNode(nid, newPos);
            }
        }
        onMoveWorkspaceGroup?.(groupId, delta);
    }, [state.workspaceGroups, positions, api, onMoveNode, onMoveWorkspaceGroup]);

    /** Wraps onSelectNode — detects double-click to open detail pane */
    const handleSelectNode = useCallback((id: string | null) => {
        onSelectNode(id);
        if (id) {
            const now = Date.now();
            if (lastClickRef.current?.id === id && now - lastClickRef.current.time < 400) {
                setDetailNodeId(id);
                lastClickRef.current = null;
            } else {
                lastClickRef.current = { id, time: now };
            }
        }
    }, [onSelectNode]);

    // ── Physics-aware drag callbacks ────────────────────────
    const handleDragStart = useCallback((id: string) => {
        api.startDrag(id);
    }, [api]);

    const handlePhysicsMove = useCallback((id: string, pos: Vector3) => {
        api.drag(id, pos);
        onMoveNode(id, pos); // keep canonical state in sync
    }, [api, onMoveNode]);

    const handleDragEnd = useCallback((id: string, pos: Vector3, velocity: Vector3) => {
        api.endDrag(id, velocity);
        onMoveNode(id, pos);
    }, [api, onMoveNode]);

    // ── Edge linking (anchor drag → drop on target) ─────────
    const [linkSource, setLinkSource] = useState<{ nodeId: string; anchor: string } | null>(null);
    const [linkPreview, setLinkPreview] = useState<{ x: number; y: number } | null>(null);

    /** Fired from any node anchor — enters linking mode */
    const handleAnchorDragStart = useCallback((nodeId: string, anchor: string, pointerId: number) => {
        setLinkSource({ nodeId, anchor });
        // Capture pointer on container so move/up events fire reliably
        containerRef.current?.setPointerCapture(pointerId);
    }, []);

    /** During linking, track pointer for the preview line */
    const handleLinkPointerMove = useCallback((e: RPointerEvent<HTMLDivElement>) => {
        if (!linkSource || !containerRef.current) return;
        const rect = containerRef.current.getBoundingClientRect();
        const { position: cam, zoom } = state.camera;
        // Convert screen coords → world coords
        const wx = (e.clientX - rect.left - cam.x) / zoom;
        const wy = (e.clientY - rect.top - cam.y) / zoom;
        setLinkPreview({ x: wx, y: wy });
    }, [linkSource, state.camera]);

    /** On pointer up during linking, check if hovering a target node */
    const handleLinkPointerUp = useCallback((e: RPointerEvent<HTMLDivElement>) => {
        if (!linkSource) return;

        // Hit-test: find node under pointer
        const rect = containerRef.current?.getBoundingClientRect();
        if (rect) {
            const { position: cam, zoom } = state.camera;
            const wx = (e.clientX - rect.left - cam.x) / zoom;
            const wy = (e.clientY - rect.top - cam.y) / zoom;

            for (const n of state.nodes) {
                if (n.id === linkSource.nodeId) continue;
                const rp = positions.get(n.id) ?? n.position;
                const b = getNodeBounds(n.type);
                if (wx >= rp.x && wx <= rp.x + b.width && wy >= rp.y && wy <= rp.y + b.height) {
                    // Check for duplicate edge
                    const exists = state.edges.some(e =>
                        (e.source === linkSource.nodeId && e.target === n.id) ||
                        (e.source === n.id && e.target === linkSource.nodeId)
                    );
                    if (!exists) {
                        onAddEdge?.({
                            id: `edge-${Date.now()}`,
                            source: linkSource.nodeId,
                            target: n.id,
                            type: 'link',
                        });
                    }
                    break;
                }
            }
        }

        // Release pointer capture (also auto-released on pointerup, but be explicit)
        try { containerRef.current?.releasePointerCapture(e.pointerId); } catch { /* already released */ }
        setLinkSource(null);
        setLinkPreview(null);
    }, [linkSource, state.camera, state.nodes, state.edges, positions, onAddEdge]);

    /* ── Canvas pan (click on empty space) ── */
    const handleCanvasPointerDown = useCallback((e: RPointerEvent<HTMLDivElement>) => {
        const el = e.target as HTMLElement;
        const isCanvas = el.classList.contains('rf-free-canvas') || el.classList.contains('rf-free-canvas__world');
        if (!isCanvas) return;

        onSelectNode(null);
        setDetailNodeId(null);          // close detail pane on bg click
        lastClickRef.current = null;
        isPanning.current = true;
        panStart.current = { x: e.clientX, y: e.clientY };

        // Reset pan velocity samples
        panSamples.current = [];
        panSampleIdx.current = 0;
        panVelocity.current = { x: 0, y: 0 };
        cancelAnimationFrame(panRaf.current);

        el.setPointerCapture(e.pointerId);
    }, [onSelectNode]);

    const handleCanvasPointerMove = useCallback((e: RPointerEvent<HTMLDivElement>) => {
        if (!isPanning.current) return;
        const dx = e.clientX - panStart.current.x;
        const dy = e.clientY - panStart.current.y;
        panStart.current = { x: e.clientX, y: e.clientY };
        onPanCamera(vec3(dx, dy, 0));

        // Record sample
        const sample: PanSample = { x: dx, y: dy, time: performance.now() };
        if (panSamples.current.length < PAN_SAMPLE_COUNT) {
            panSamples.current.push(sample);
        } else {
            panSamples.current[panSampleIdx.current % PAN_SAMPLE_COUNT] = sample;
        }
        panSampleIdx.current++;
    }, [onPanCamera]);

    const handleCanvasPointerUp = useCallback((e: RPointerEvent<HTMLDivElement>) => {
        if (!isPanning.current) return;
        isPanning.current = false;
        try { (e.target as HTMLElement).releasePointerCapture(e.pointerId); } catch { /* ok */ }

        // Compute pan velocity from samples
        const buf = panSamples.current;
        if (buf.length >= 2) {
            let totalDx = 0, totalDy = 0;
            for (const s of buf) { totalDx += s.x; totalDy += s.y; }
            const avgDx = totalDx / buf.length;
            const avgDy = totalDy / buf.length;
            panVelocity.current = { x: avgDx * 8, y: avgDy * 8 }; // scale up for momentum feel
        }

        // Pan inertia loop
        const coast = () => {
            const { x, y } = panVelocity.current;
            if (Math.abs(x) < PAN_MIN && Math.abs(y) < PAN_MIN) return;
            onPanCamera(vec3(x, y, 0));
            panVelocity.current = { x: x * PAN_DECAY, y: y * PAN_DECAY };
            panRaf.current = requestAnimationFrame(coast);
        };
        panRaf.current = requestAnimationFrame(coast);
    }, [onPanCamera]);

    // Cleanup pan/zoom rafs
    useEffect(() => () => {
        cancelAnimationFrame(panRaf.current);
        cancelAnimationFrame(zoomRaf.current);
    }, []);

    /* ── Smooth zoom via scroll-wheel ── */
    const handleWheel = useCallback((e: WheelEvent) => {
        e.preventDefault();
        const factor = e.deltaY > 0 ? 0.95 : 1.05;
        const newTarget = Math.max(0.15, Math.min(4, (targetZoom.current ?? state.camera.zoom) * factor));
        targetZoom.current = newTarget;

        // Animate toward target
        cancelAnimationFrame(zoomRaf.current);
        const smoothZoom = () => {
            const current = state.camera.zoom;
            const target = targetZoom.current;
            const diff = target - current;
            if (Math.abs(diff) < 0.002) {
                onZoom(target);
                return;
            }
            onZoom(current + diff * 0.2);
            zoomRaf.current = requestAnimationFrame(smoothZoom);
        };
        zoomRaf.current = requestAnimationFrame(smoothZoom);
    }, [state.camera.zoom, onZoom]);

    const { position: cam, zoom } = state.camera;

    // ── Build a synthetic nodes array with physics positions for edges ──
    const physicsNodes = state.nodes.map(n => {
        const p = positions.get(n.id);
        return p ? { ...n, position: p } : n;
    });

    return (
        <div
            ref={containerRef}
            className={`rf-free-canvas${isPanning.current ? ' rf-free-canvas--panning' : ''}`}
            onPointerDown={handleCanvasPointerDown}
            onPointerMove={linkSource ? handleLinkPointerMove : handleCanvasPointerMove}
            onPointerUp={linkSource ? handleLinkPointerUp : handleCanvasPointerUp}
            onWheel={handleWheel}
        >
            <div
                className="rf-free-canvas__world"
                style={{ transform: `translate(${cam.x}px, ${cam.y}px) scale(${zoom})` }}
            >
                {/* SVG edge layer — uses physics positions */}
                <CanvasEdges edges={state.edges} nodes={physicsNodes} groups={state.groups} />

                {/* User-created chain groups */}
                {state.groups.map(g => (
                    <GroupFrame
                        key={g.id}
                        group={g}
                        nodes={physicsNodes}
                        variant="chain"
                        zoom={zoom}
                        selected={state.selectedGroupId === g.id}
                        onSelect={onSelectGroup}
                        onRemove={onRemoveGroup}
                        onMoveGroup={handleMoveChainGroup}
                    />
                ))}

                {/* Layout-generated group frames (ephemeral, from group-by layouts)
                     Rendered as standalone frames. The workspace GroupFrame below
                     receives them via childLayoutGroups for bounds calculation. */}
                {state.layoutGroups.map(lg => (
                    <GroupFrame
                        key={lg.id}
                        group={{
                            id: lg.id,
                            label: lg.label,
                            nodeIds: lg.nodeIds,
                            position: vec3(0, 0, 0),
                            color: lg.color,
                        }}
                        nodes={physicsNodes}
                        variant="layout"
                        layoutBounds={lg.bounds}
                    />
                ))}

                {/* Workspace groups (visual grouping, drillable) —
                     childLayoutGroups lets the frame auto-size to encompass
                     any layout groups whose nodes belong to the workspace. */}
                {state.workspaceGroups.map(wg => (
                    <GroupFrame
                        key={`ws-${wg.id}`}
                        group={{
                            id: wg.id,
                            label: wg.label,
                            nodeIds: wg.nodeIds,
                            position: wg.position,
                            color: wg.color,
                        }}
                        nodes={physicsNodes}
                        variant="workspace"
                        zoom={zoom}
                        onMoveGroup={handleMoveWSGroup}
                        onDrillInto={setDrilledWorkspaceId}
                        activeLayoutMode={state.activeLayoutMode}
                        layoutDepth={state.layoutDepth}
                        onReflow={onReflow}
                        onDrillIn={onDrillIn}
                        onDrillOut={onDrillOut}
                        onClearLayout={onClearLayout}
                        onAddNote={onAddNote}
                        depthLabel={depthLabel}
                        childLayoutGroups={state.layoutGroups}
                    />
                ))}

                {/* Nodes — physics-driven positions */}
                {state.nodes.map(node => {
                    const sel = state.selectedNodeId === node.id;
                    const rp = positions.get(node.id);
                    switch (node.type) {
                        case 'article':
                            return <ArticleNodeComponent key={node.id} node={node} selected={sel} zoom={zoom} renderPosition={rp} onMove={handlePhysicsMove} onSelect={handleSelectNode} onDragStart={handleDragStart} onDragEnd={handleDragEnd} onAnchorDragStart={handleAnchorDragStart} />;
                        case 'note':
                            return <NoteNodeComponent key={node.id} node={node} selected={sel} zoom={zoom} renderPosition={rp} onMove={handlePhysicsMove} onSelect={handleSelectNode} onDragStart={handleDragStart} onDragEnd={handleDragEnd} onAnchorDragStart={handleAnchorDragStart} />;
                        case 'entity':
                            return <EntityNodeComponent key={node.id} node={node} selected={sel} zoom={zoom} renderPosition={rp} onMove={handlePhysicsMove} onSelect={handleSelectNode} onDragStart={handleDragStart} onDragEnd={handleDragEnd} onAnchorDragStart={handleAnchorDragStart} />;
                        case 'narrative':
                            return <NarrativeNodeComponent key={node.id} node={node} selected={sel} zoom={zoom} renderPosition={rp} onMove={handlePhysicsMove} onSelect={handleSelectNode} onDragStart={handleDragStart} onDragEnd={handleDragEnd} onAnchorDragStart={handleAnchorDragStart} />;
                        case 'claim':
                            return <ClaimNodeComponent key={node.id} node={node} selected={sel} zoom={zoom} renderPosition={rp} onMove={handlePhysicsMove} onSelect={handleSelectNode} onDragStart={handleDragStart} onDragEnd={handleDragEnd} onAnchorDragStart={handleAnchorDragStart} />;
                    }
                })}

                {/* Edge-linking preview line */}
                {linkSource && linkPreview && (() => {
                    const srcNode = state.nodes.find(n => n.id === linkSource.nodeId);
                    if (!srcNode) return null;
                    const sp = positions.get(srcNode.id) ?? srcNode.position;
                    const b = getNodeBounds(srcNode.type);
                    const sx = sp.x + b.width / 2;
                    const sy = sp.y + b.height / 2;
                    return (
                        <svg className="rf-canvas-edges rf-canvas-edges--preview" style={{ pointerEvents: 'none' }}>
                            <line x1={sx} y1={sy} x2={linkPreview.x} y2={linkPreview.y}
                                stroke="#00d2ff" strokeWidth={2} strokeDasharray="6 4" opacity={0.7} />
                            <circle cx={linkPreview.x} cy={linkPreview.y} r={6}
                                fill="none" stroke="#00d2ff" strokeWidth={2} opacity={0.7} />
                        </svg>
                    );
                })()}
            </div>

            {/* ── Detail pane (slides in from left on double-click) ── */}
            <DetailPane state={state} detailNodeId={detailNodeId} onDetailNodeChange={setDetailNodeId} onVisualize={onVisualize} previewArticle={previewArticle} onPreviewArticleClear={onPreviewArticleClear} onGroupByDate={onGroupByDate} onGroupByLocation={onGroupByLocation} />

            {/* ── Workspace drill-down overlay ── */}
            {drilledWorkspace && (
                <WorkspaceOverlay
                    workspace={drilledWorkspace}
                    nodes={state.nodes}
                    onClose={() => setDrilledWorkspaceId(null)}
                    onSelectNode={(id) => {
                        setDrilledWorkspaceId(null);
                        onSelectNode(id);
                        setDetailNodeId(id);
                    }}
                />
            )}
        </div>
    );
};
