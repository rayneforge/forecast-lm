import React, { useState, useCallback } from 'react';
import {
    CanvasState,
    CanvasViewMode,
    CanvasRenderMode,
    CanvasNode,
    CanvasEdge,
    ChainGroup,
    Camera3D,
    Vector3,
    vec3,
} from '../canvas/CanvasTypes';
import { useCanvasState } from '../canvas/useCanvasState';
import { FreeCanvasView } from '../components/canvas/free-canvas-view/FreeCanvasView';
import { TimelineView } from '../components/canvas/timeline-view/TimelineView';
import { LinearView } from '../components/canvas/linear-view/LinearView';
import { ThreeCanvasView } from '../components/three-canvas/views/ThreeCanvasView';
import { NarrativePane, NarrativeData, NarrativeClaim } from '../components/canvas/narrative-pane/NarrativePane';
import { FloatingSearchBar } from '../components/floating-search/FloatingSearchBar';
import './canvas-page.scss';

export interface CanvasPageProps {
    /** Pre-populated nodes (e.g. from a search / import) */
    initialNodes?: CanvasNode[];
    /** Pre-populated edges */
    initialEdges?: CanvasEdge[];
    /** Pre-populated chain groups */
    initialGroups?: ChainGroup[];
    /** Starting view mode */
    initialView?: CanvasViewMode;
    /** Starting camera */
    initialCamera?: Camera3D;
    /** Narrative data for the side pane */
    narratives?: NarrativeData[];
    /** Claims backing the narratives */
    claims?: NarrativeClaim[];
    /** Search callback */
    onSearch?: (query: string) => void;
}

const VIEW_LABELS: Record<CanvasViewMode, { icon: string; label: string }> = {
    free: { icon: '🕸', label: 'Canvas' },
    timeline: { icon: '⏤', label: 'Timeline' },
    linear: { icon: '☰', label: 'Linear' },
};

export const CanvasPage: React.FC<CanvasPageProps> = ({
    initialNodes = [],
    initialEdges = [],
    initialGroups = [],
    initialView = 'free',
    initialCamera,
    narratives = [],
    claims = [],
    onSearch,
}) => {
    const { state, dispatch, moveNode, selectNode, setView, setRenderMode, reflow } = useCanvasState({
        nodes: initialNodes,
        edges: initialEdges,
        groups: initialGroups,
        activeView: initialView,
        selectedNodeId: null,
        selectedGroupId: null,
        camera: initialCamera ?? { position: vec3(0, 0, 0), zoom: 1 },
    });

    const [narrativePaneOpen, setNarrativePaneOpen] = useState(narratives.length > 0);

    const handlePan = (delta: Vector3) => {
        dispatch({ type: 'PAN_CAMERA', delta });
    };

    const handleZoom = (zoom: number) => {
        dispatch({ type: 'SET_CAMERA', camera: { zoom } });
    };

    const handleSelectGroup = (id: string | null) => {
        dispatch({ type: 'SELECT_GROUP', id });
    };

    const handleRemoveGroup = (id: string) => {
        dispatch({ type: 'REMOVE_GROUP', id });
    };

    /** When clicking an article link inside the narrative pane, select it on canvas */
    const handleNarrativeArticleSelect = useCallback((articleId: string) => {
        selectNode(articleId);
    }, [selectNode]);

    return (
        <div className="rf-canvas-page">
            {/* ── Toolbar ─────────────────────────────────── */}
            <div className="rf-canvas-page__toolbar">
                <h2 className="rf-canvas-page__title">Workspace</h2>

                <div className="rf-canvas-page__view-switch">
                    {(Object.keys(VIEW_LABELS) as CanvasViewMode[]).map(mode => (
                        <button
                            key={mode}
                            className={`rf-canvas-page__view-btn ${
                                state.activeView === mode ? 'rf-canvas-page__view-btn--active' : ''
                            }`}
                            onClick={() => setView(mode)}
                        >
                            {VIEW_LABELS[mode].icon} {VIEW_LABELS[mode].label}
                        </button>
                    ))}
                </div>

                <button
                    className="rf-canvas-page__add-btn"
                    onClick={() =>
                        dispatch({
                            type: 'ADD_NODE',
                            node: {
                                id: `note-${Date.now()}`,
                                type: 'note',
                                position: vec3(
                                    -state.camera.position.x + 200,
                                    -state.camera.position.y + 200,
                                    state.nodes.length,
                                ),
                                data: {
                                    title: 'New note',
                                    body: '',
                                    createdAt: new Date().toISOString(),
                                },
                            },
                        })
                    }
                >
                    ＋ Note
                </button>

                {/* ── Layout Reflow ── */}
                <div className="rf-canvas-page__layout-group">
                    <button
                        className="rf-canvas-page__view-btn"
                        onClick={() => reflow('center')}
                        title="Center-out: most-connected nodes at centre"
                    >
                        ◎ Center
                    </button>
                    <button
                        className="rf-canvas-page__view-btn"
                        onClick={() => reflow('hierarchy')}
                        title="Hierarchy: tree layout left → right"
                    >
                        ≡ Hierarchy
                    </button>
                </div>

                {narratives.length > 0 && (
                    <button
                        className={`rf-canvas-page__view-btn ${narrativePaneOpen ? 'rf-canvas-page__view-btn--active' : ''}`}
                        onClick={() => setNarrativePaneOpen(o => !o)}
                        title="Toggle narrative pane"
                    >
                        📖 Narratives
                    </button>
                )}

                {/* ── Render mode toggle (only if WebGL available) ── */}
                {state.deviceCapabilities?.webgl && (
                    <div className="rf-canvas-page__render-toggle">
                        <button
                            className={`rf-canvas-page__view-btn ${state.renderMode === '2d' ? 'rf-canvas-page__view-btn--active' : ''}`}
                            onClick={() => setRenderMode('2d')}
                        >
                            2D
                        </button>
                        <button
                            className={`rf-canvas-page__view-btn ${state.renderMode === '3d' ? 'rf-canvas-page__view-btn--active' : ''}`}
                            onClick={() => setRenderMode('3d')}
                        >
                            3D
                        </button>
                        {state.deviceCapabilities?.immersiveVR && (
                            <span className="rf-canvas-page__xr-badge" title="VR headset detected">🥽 VR</span>
                        )}
                        {state.deviceCapabilities?.immersiveAR && (
                            <span className="rf-canvas-page__xr-badge" title="AR supported">📱 AR</span>
                        )}
                    </div>
                )}
            </div>

            {/* ── Active View ─────────────────────────────── */}
            <div className="rf-canvas-page__canvas-area">
                {state.renderMode === '3d' ? (
                    /* Layer 1 = Three.js — takes over the entire canvas area */
                    <ThreeCanvasView
                        state={state}
                        onMoveNode={moveNode}
                        onSelectNode={selectNode}
                    />
                ) : (
                    /* Layer 1 = 2D CSS transforms */
                    <>
                        {state.activeView === 'free' && (
                            <FreeCanvasView
                                state={state}
                                onMoveNode={moveNode}
                                onSelectNode={selectNode}
                                onSelectGroup={handleSelectGroup}
                                onRemoveGroup={handleRemoveGroup}
                                onPanCamera={handlePan}
                                onZoom={handleZoom}
                            />
                        )}

                        {state.activeView === 'timeline' && (
                            <TimelineView state={state} onSelectNode={selectNode} />
                        )}

                        {state.activeView === 'linear' && (
                            <LinearView state={state} onSelectNode={selectNode} />
                        )}
                    </>
                )}

                {/* ── Narrative Side Pane ─────────────────────── */}
                {narratives.length > 0 && (
                    <NarrativePane
                        narratives={narratives}
                        claims={claims}
                        open={narrativePaneOpen}
                        onToggle={() => setNarrativePaneOpen(o => !o)}
                        onSelectArticle={handleNarrativeArticleSelect}
                    />
                )}
            </div>

            {/* ── Floating Search ─────────────────────────── */}
            <FloatingSearchBar onSearch={onSearch ?? (() => {})} />
        </div>
    );
};
