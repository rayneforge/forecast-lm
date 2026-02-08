import React, { useMemo, Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Grid, Stars } from '@react-three/drei';
import {
    CanvasState, Vector3,
    ArticleNode as ArticleNodeData,
    NoteNode as NoteNodeData,
    EntityNode as EntityNodeData,
    TopicBubble as TopicBubbleData,
} from '../../../canvas/CanvasTypes';

import { ArticleNode3D } from '../components/ArticleNode3D';
import { NoteNode3D } from '../components/NoteNode3D';
import { EntityNode3D } from '../components/EntityNode3D';
import { TopicBubble3D } from '../components/TopicBubble3D';
import { GroupFrame3D } from '../components/GroupFrame3D';
import { EdgeLines3D } from '../components/EdgeLines3D';
import { Theme, toWorld } from '../components/theme3d';

import './three-canvas-view.scss';

// ─────────────────────────────────────────────────────────────────
// ThreeCanvasView — R3F Canvas rendering all canvas nodes in 3D.
//
// Architecture (mirrors the 3-layer model in CanvasTypes):
//
//   Layer 1 — Rendering
//     R3F <Canvas> wraps THREE.WebGLRenderer automatically.
//     Nodes are declarative JSX — ArticleNode3D, NoteNode3D, etc.
//
//   Layer 2 — Presentation
//     'flat' → OrbitControls (default)
//     'vr'   → <XR> provider (future)
//     'ar'   → <XR> + hit-test (future)
//
//   Layer 3 — Input
//     flat   → R3F onPointerDown/onClick events → raycaster
//     xr     → R3F XR controller events (future)
//
//   UI meshes are the SAME objects regardless of layer.
//   Only their anchor position changes (see DEFAULT_UI_ANCHORS).
// ─────────────────────────────────────────────────────────────────

export interface ThreeCanvasViewProps {
    state: CanvasState;
    onMoveNode: (id: string, pos: Vector3) => void;
    onSelectNode: (id: string | null) => void;
}

/** Convert the integer Theme bg colour to a CSS hex string for Canvas gl.clearColor */
const BG_COLOR = `#${Theme.canvasDefault.toString(16).padStart(6, '0')}`;

export const ThreeCanvasView: React.FC<ThreeCanvasViewProps> = ({
    state, onMoveNode, onSelectNode,
}) => {
    // Partition nodes by type for specialised components
    const { articles, notes, entities, topics } = useMemo(() => {
        const articles: ArticleNodeData[] = [];
        const notes: NoteNodeData[] = [];
        const entities: EntityNodeData[] = [];
        const topics: TopicBubbleData[] = [];

        for (const n of state.nodes) {
            switch (n.type) {
                case 'article': articles.push(n as ArticleNodeData); break;
                case 'note':    notes.push(n as NoteNodeData); break;
                case 'entity':  entities.push(n as EntityNodeData); break;
                case 'topic':   topics.push(n as TopicBubbleData); break;
            }
        }
        return { articles, notes, entities, topics };
    }, [state.nodes]);

    // Camera initial position based on node spread
    const camPos = useMemo<[number, number, number]>(() => {
        if (state.nodes.length === 0) return [0, 2, 8];
        const avgX = state.nodes.reduce((s, n) => s + toWorld(n.position.x), 0) / state.nodes.length;
        const avgY = state.nodes.reduce((s, n) => s + -toWorld(n.position.y), 0) / state.nodes.length;
        return [avgX, avgY + 2, 10];
    }, [state.nodes]);

    const handleBgClick = () => onSelectNode(null);

    return (
        <div className="rf-three-canvas">
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
                    {/* Edges (render behind nodes) */}
                    <EdgeLines3D edges={state.edges} nodes={state.nodes} />

                    {/* Groups */}
                    {state.groups.map(g => (
                        <GroupFrame3D key={g.id} group={g} nodes={state.nodes} />
                    ))}

                    {/* Article nodes */}
                    {articles.map(n => (
                        <ArticleNode3D
                            key={n.id}
                            node={n}
                            selected={state.selectedNodeId === n.id}
                            onSelect={onSelectNode}
                            onMove={onMoveNode}
                        />
                    ))}

                    {/* Note nodes */}
                    {notes.map(n => (
                        <NoteNode3D
                            key={n.id}
                            node={n}
                            selected={state.selectedNodeId === n.id}
                            onSelect={onSelectNode}
                            onMove={onMoveNode}
                        />
                    ))}

                    {/* Entity nodes */}
                    {entities.map(n => (
                        <EntityNode3D
                            key={n.id}
                            node={n}
                            selected={state.selectedNodeId === n.id}
                            onSelect={onSelectNode}
                            onMove={onMoveNode}
                        />
                    ))}

                    {/* Topic bubbles */}
                    {topics.map(n => (
                        <TopicBubble3D
                            key={n.id}
                            node={n}
                            selected={state.selectedNodeId === n.id}
                            onSelect={onSelectNode}
                            onMove={onMoveNode}
                        />
                    ))}
                </Suspense>
            </Canvas>
        </div>
    );
};
