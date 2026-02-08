import React, { useRef, useCallback, WheelEvent, PointerEvent as RPointerEvent } from 'react';
import { CanvasState, Vector3, vec3 } from '../../../canvas/CanvasTypes';
import { ArticleNodeComponent } from '../article-node/ArticleNode';
import { NoteNodeComponent } from '../note-node/NoteNode';
import { EntityNodeComponent } from '../entity-node/EntityNode';
import { TopicBubbleComponent } from '../topic-bubble/TopicBubbleComponent';
import { GroupFrame } from '../group-frame/GroupFrame';
import { CanvasEdges } from '../canvas-edges/CanvasEdges';
import './free-canvas-view.scss';

export interface FreeCanvasViewProps {
    state: CanvasState;
    onMoveNode: (id: string, pos: Vector3) => void;
    onSelectNode: (id: string | null) => void;
    onSelectGroup: (id: string | null) => void;
    onRemoveGroup: (id: string) => void;
    onPanCamera: (delta: Vector3) => void;
    onZoom: (zoom: number) => void;
}

export const FreeCanvasView: React.FC<FreeCanvasViewProps> = ({
    state, onMoveNode, onSelectNode, onSelectGroup, onRemoveGroup, onPanCamera, onZoom,
}) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const isPanning = useRef(false);
    const panStart = useRef({ x: 0, y: 0 });

    /* ── Canvas pan (click on empty space) ── */
    const handleCanvasPointerDown = useCallback((e: RPointerEvent<HTMLDivElement>) => {
        const el = e.target as HTMLElement;
        const isCanvas = el.classList.contains('rf-free-canvas') || el.classList.contains('rf-free-canvas__world');
        if (!isCanvas) return;

        // Deselect on background click
        onSelectNode(null);

        isPanning.current = true;
        panStart.current = { x: e.clientX, y: e.clientY };
        el.setPointerCapture(e.pointerId);
    }, [onSelectNode]);

    const handleCanvasPointerMove = useCallback((e: RPointerEvent<HTMLDivElement>) => {
        if (!isPanning.current) return;
        const dx = e.clientX - panStart.current.x;
        const dy = e.clientY - panStart.current.y;
        panStart.current = { x: e.clientX, y: e.clientY };
        onPanCamera(vec3(dx, dy, 0));
    }, [onPanCamera]);

    const handleCanvasPointerUp = useCallback((e: RPointerEvent<HTMLDivElement>) => {
        if (!isPanning.current) return;
        isPanning.current = false;
        try { (e.target as HTMLElement).releasePointerCapture(e.pointerId); } catch { /* ok */ }
    }, []);

    /* ── Zoom via scroll-wheel ── */
    const handleWheel = useCallback((e: WheelEvent) => {
        e.preventDefault();
        const factor = e.deltaY > 0 ? 0.95 : 1.05;
        onZoom(Math.max(0.15, Math.min(4, state.camera.zoom * factor)));
    }, [state.camera.zoom, onZoom]);

    const { position: cam, zoom } = state.camera;

    return (
        <div
            ref={containerRef}
            className={`rf-free-canvas${isPanning.current ? ' rf-free-canvas--panning' : ''}`}
            onPointerDown={handleCanvasPointerDown}
            onPointerMove={handleCanvasPointerMove}
            onPointerUp={handleCanvasPointerUp}
            onWheel={handleWheel}
        >
            <div
                className="rf-free-canvas__world"
                style={{ transform: `translate(${cam.x}px, ${cam.y}px) scale(${zoom})` }}
            >
                {/* SVG edge layer */}
                <CanvasEdges edges={state.edges} nodes={state.nodes} groups={state.groups} />

                {/* Group frames (rendered below nodes) */}
                {state.groups.map(g => (
                    <GroupFrame
                        key={g.id}
                        group={g}
                        nodes={state.nodes}
                        selected={state.selectedGroupId === g.id}
                        onSelect={onSelectGroup}
                        onRemove={onRemoveGroup}
                    />
                ))}

                {/* Nodes */}
                {state.nodes.map(node => {
                    const sel = state.selectedNodeId === node.id;
                    switch (node.type) {
                        case 'article':
                            return <ArticleNodeComponent key={node.id} node={node} selected={sel} zoom={zoom} onMove={onMoveNode} onSelect={onSelectNode} />;
                        case 'note':
                            return <NoteNodeComponent key={node.id} node={node} selected={sel} zoom={zoom} onMove={onMoveNode} onSelect={onSelectNode} />;
                        case 'entity':
                            return <EntityNodeComponent key={node.id} node={node} selected={sel} zoom={zoom} onMove={onMoveNode} onSelect={onSelectNode} />;
                        case 'topic':
                            return <TopicBubbleComponent key={node.id} node={node} selected={sel} zoom={zoom} onMove={onMoveNode} onSelect={onSelectNode} />;
                    }
                })}
            </div>
        </div>
    );
};
