import React, { useMemo, useRef, useState, useCallback, Suspense } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Grid, Stars } from '@react-three/drei';
import * as THREE from 'three';
import {
    CanvasState, Vector3,
    ArticleNode as ArticleNodeData,
    NoteNode as NoteNodeData,
    EntityNode as EntityNodeData,
    NarrativeNode as NarrativeNodeData,
    ClaimNode as ClaimNodeData,
} from '../../../canvas/CanvasTypes';
import { useCanvasPhysics } from '../../../canvas/physics/useCanvasPhysics';
import { PhysicsBody } from '../../../canvas/physics/PhysicsEngine';
import {
    ScenePhysicsProvider,
    ScenePhysicsContextValue,
    useScenePhysics,
} from '../components/ScenePhysicsContext';

import { ArticleNode3D } from '../components/ArticleNode3D';
import { NoteNode3D } from '../components/NoteNode3D';
import { EntityNode3D } from '../components/EntityNode3D';
import { NarrativeNode3D } from '../components/NarrativeNode3D';
import { ClaimNode3D } from '../components/ClaimNode3D';
import { GroupFrame3D } from '../components/GroupFrame3D';
import { EdgeLines3D } from '../components/EdgeLines3D';
import { DetailView3D } from '../components/DetailView3D';
import { Theme, toWorld } from '../components/theme3d';

import { DailyFeed3D, DailyFeed3DProps } from '../components/DailyFeed3D';
import { SearchPane3D, SearchPane3DProps } from '../components/SearchPane3D';

import './three-canvas-view.scss';

// ─────────────────────────────────────────────────────────────────
// ThreeCanvasView — R3F Canvas rendering all canvas nodes in 3D.
//
// IMPERATIVE STORE ARCHITECTURE:
//   Node positions are NOT driven by React props/state. Instead:
//
//   1. useCanvasPhysics runs the simulation, storing bodies in a
//      mutable Map (bodiesRef) — no React re-renders per frame.
//
//   2. Each 3D node component registers its THREE.Group ref via
//      the ScenePhysicsContext (nodeRefs map).
//
//   3. A single <PhysicsTicker> component inside the Canvas calls
//      useFrame to: (a) tick the engine, (b) imperatively set
//      group.position.set() for every node — zero reconciliation.
//
//   This means nodes render ONCE (on mount/data change), and all
//   60fps position updates happen in the Three.js loop, not React.
// ─────────────────────────────────────────────────────────────────

export interface ThreeCanvasViewProps {
    state: CanvasState;
    onMoveNode: (id: string, pos: Vector3) => void;
    onSelectNode: (id: string | null) => void;
    /** Trigger propagate layout from a specific node (detail-pane Visualize) */
    onVisualize?: (nodeId: string) => void;
    /** Daily feed side pane props — optional */
    dailyFeedProps?: Omit<DailyFeed3DProps, 'position'>;
    /** Search side pane props — optional */
    searchPaneProps?: Omit<SearchPane3DProps, 'position'>;
}

/** Convert the integer Theme bg colour to a CSS hex string for Canvas gl.clearColor */
const BG_COLOR = `#${Theme.canvasDefault.toString(16).padStart(6, '0')}`;

// ─── PhysicsTicker ──────────────────────────────────────────────
// Runs inside the R3F Canvas. Each frame:
//   1. Ticks the physics engine (mutates bodies in-place)
//   2. Reads bodiesRef positions → sets THREE.Group positions
// No React state changes — purely imperative.

const PhysicsTicker: React.FC = () => {
    const { bodiesRef, nodeRefs, api } = useScenePhysics();

    useFrame((_, delta) => {
        // Advance simulation
        api.tick(delta);

        // Imperatively sync every registered node's Three.js group position
        for (const [id, body] of bodiesRef.current) {
            const group = nodeRefs.current.get(id);
            if (group) {
                group.position.set(
                    toWorld(body.position.x),
                    -toWorld(body.position.y),
                    toWorld(body.position.z),
                );
            }
        }
    });

    return null;
};

// ─── Main Component ─────────────────────────────────────────────

export const ThreeCanvasView: React.FC<ThreeCanvasViewProps> = ({
    state, onMoveNode, onSelectNode, onVisualize, dailyFeedProps, searchPaneProps,
}) => {
    // Node group ref store — mutable Map<string, THREE.Group>
    const nodeRefs = useRef<Map<string, THREE.Group>>(new Map());

    // ── Ephemeral state for 3D detail panels ────────────────
    // Multiple can coexist — not tracked in workspace data model.
    const [expandedDetails, setExpandedDetails] = useState<Set<string>>(new Set());

    // Double-click timing for detail toggle
    const lastClick3DRef = useRef<{ id: string; time: number } | null>(null);

    const handleToggleDetail = useCallback((id: string) => {
        setExpandedDetails(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id); else next.add(id);
            return next;
        });
    }, []);

    const handleCloseDetail = useCallback((id: string) => {
        setExpandedDetails(prev => {
            const next = new Set(prev);
            next.delete(id);
            return next;
        });
    }, []);

    /** Open link in new browser tab (iframe embedding blocked by most news sites) */
    const handleOpenLink = useCallback((url: string) => {
        window.open(url, '_blank', 'noopener,noreferrer');
    }, []);

    /** Single-click selects; double-click toggles detail panel */
    const handleSelectNode3D = useCallback((id: string | null) => {
        onSelectNode(id);
        if (id) {
            const now = Date.now();
            if (lastClick3DRef.current?.id === id && now - lastClick3DRef.current.time < 400) {
                handleToggleDetail(id);
                lastClick3DRef.current = null;
            } else {
                lastClick3DRef.current = { id, time: now };
            }
        }
    }, [onSelectNode, handleToggleDetail]);

    // Physics hook — external mode (ticked via useFrame inside Canvas)
    const { api, bodiesRef } = useCanvasPhysics(state, { external: true });

    // Build the context value
    const scenePhysicsValue = useMemo<ScenePhysicsContextValue>(() => ({
        bodiesRef,
        nodeRefs,
        api,
    }), [bodiesRef, api]);

    // Physics-aware drag callbacks
    const handleDragStart = (id: string) => api.startDrag(id);
    const handleMove = (id: string, pos: Vector3) => {
        api.drag(id, pos);
        onMoveNode(id, pos);
    };
    const handleDragEnd = (id: string, pos: Vector3, velocity: Vector3) => {
        api.endDrag(id, velocity);
        onMoveNode(id, pos);
    };

    // Partition nodes by type for specialised components
    const { articles, notes, entities, narratives, claims } = useMemo(() => {
        const articles: ArticleNodeData[] = [];
        const notes: NoteNodeData[] = [];
        const entities: EntityNodeData[] = [];
        const narratives: NarrativeNodeData[] = [];
        const claims: ClaimNodeData[] = [];

        for (const n of state.nodes) {
            switch (n.type) {
                case 'article': articles.push(n as ArticleNodeData); break;
                case 'note':    notes.push(n as NoteNodeData); break;
                case 'entity':  entities.push(n as EntityNodeData); break;
                case 'narrative': narratives.push(n as NarrativeNodeData); break;
                case 'claim':   claims.push(n as ClaimNodeData); break;
            }
        }
        return { articles, notes, entities, narratives, claims };
    }, [state.nodes]);

    // Camera initial position based on node spread
    const camPos = useMemo<[number, number, number]>(() => {
        if (state.nodes.length === 0) return [0, 2, 8];
        const avgX = state.nodes.reduce((s, n) => s + toWorld(n.position.x), 0) / state.nodes.length;
        const avgY = state.nodes.reduce((s, n) => s + -toWorld(n.position.y), 0) / state.nodes.length;
        return [avgX, avgY + 2, 10];
    }, [state.nodes]);

    const handleBgClick = () => onSelectNode(null);

    // Resolve which nodes have open detail views
    const detailNodes = useMemo(
        () => state.nodes.filter(n => expandedDetails.has(n.id)),
        [state.nodes, expandedDetails],
    );

    return (
        <div className="rf-three-canvas">
            <ScenePhysicsProvider value={scenePhysicsValue}>
                <Canvas
                    camera={{ position: camPos, fov: 55, near: 0.1, far: 200 }}
                    gl={{ antialias: true, alpha: false }}
                    style={{ background: BG_COLOR }}
                    onPointerMissed={handleBgClick}
                >
                    {/* Lighting */}
                    <ambientLight intensity={0.5} />
                    <directionalLight position={[5, 8, 5]} intensity={0.7} />
                    <pointLight position={[-4, 3, -3]} intensity={0.3} color={Theme.accentPrimary} />

                    {/* Camera controls (Layer 2 — flat presentation) */}
                    <OrbitControls
                        enableDamping
                        dampingFactor={0.12}
                        minDistance={2}
                        maxDistance={50}
                        makeDefault
                    />

                    {/* Ambient background stars */}
                    <Stars radius={80} depth={40} count={1500} factor={2} fade speed={0.5} />

                    {/* Ground grid for spatial reference */}
                    <Grid
                        position={[3, -3, 0]}
                        args={[60, 60]}
                        cellSize={1}
                        cellColor="#1A1F2B"
                        sectionSize={5}
                        sectionColor="#242A36"
                        fadeDistance={30}
                        infiniteGrid
                    />

                    <Suspense fallback={null}>
                        {/* Physics ticker — drives simulation + imperatively positions nodes */}
                        <PhysicsTicker />

                        {/* Edges (render behind nodes) — reads bodiesRef in useFrame */}
                        <EdgeLines3D edges={state.edges} />

                        {/* User-created chain groups */}
                        {state.groups.map(g => (
                            <GroupFrame3D key={g.id} group={g} />
                        ))}

                        {/* Layout-generated group frames (ephemeral, from group-by layouts) */}
                        {state.layoutGroups.map(lg => (
                            <GroupFrame3D
                                key={lg.id}
                                group={{
                                    id: lg.id,
                                    label: lg.label,
                                    nodeIds: lg.nodeIds,
                                    position: { x: 0, y: 0, z: 0 },
                                    color: lg.color,
                                }}
                            />
                        ))}

                        {/* Article nodes */}
                        {articles.map(n => (
                            <ArticleNode3D
                                key={n.id}
                                node={n}
                                selected={state.selectedNodeId === n.id}
                                onSelect={handleSelectNode3D}
                                onMove={handleMove}
                                onDragStart={handleDragStart}
                                onDragEnd={handleDragEnd}
                            />
                        ))}

                        {/* Note nodes */}
                        {notes.map(n => (
                            <NoteNode3D
                                key={n.id}
                                node={n}
                                selected={state.selectedNodeId === n.id}
                                onSelect={handleSelectNode3D}
                                onMove={handleMove}
                                onDragStart={handleDragStart}
                                onDragEnd={handleDragEnd}
                            />
                        ))}

                        {/* Entity nodes */}
                        {entities.map(n => (
                            <EntityNode3D
                                key={n.id}
                                node={n}
                                selected={state.selectedNodeId === n.id}
                                onSelect={handleSelectNode3D}
                                onMove={handleMove}
                                onDragStart={handleDragStart}
                                onDragEnd={handleDragEnd}
                            />
                        ))}

                        {/* Narrative nodes */}
                        {narratives.map(n => (
                            <NarrativeNode3D
                                key={n.id}
                                node={n}
                                selected={state.selectedNodeId === n.id}
                                onSelect={handleSelectNode3D}
                                onMove={handleMove}
                                onDragStart={handleDragStart}
                                onDragEnd={handleDragEnd}
                            />
                        ))}

                        {/* Claim nodes */}
                        {claims.map(n => (
                            <ClaimNode3D
                                key={n.id}
                                node={n}
                                selected={state.selectedNodeId === n.id}
                                onSelect={handleSelectNode3D}
                                onMove={handleMove}
                                onDragStart={handleDragStart}
                                onDragEnd={handleDragEnd}
                            />
                        ))}

                        {/* ── 3D Detail Panels (multiple, ephemeral, double-click) ── */}
                        {detailNodes.map(n => (
                            <DetailView3D
                                key={`detail-${n.id}`}
                                node={n}
                                edges={state.edges}
                                nodes={state.nodes}
                                onClose={handleCloseDetail}
                                onSelectNode={(id) => handleSelectNode3D(id)}
                                onOpenLink={handleOpenLink}
                                onVisualize={onVisualize}
                            />
                        ))}

                        {/* ── 3D Side panes (daily feed + search) ── */}
                        {dailyFeedProps && <DailyFeed3D {...dailyFeedProps} />}
                        {searchPaneProps && <SearchPane3D {...searchPaneProps} />}
                    </Suspense>
                </Canvas>
            </ScenePhysicsProvider>
        </div>
    );
};
