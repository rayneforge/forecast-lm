import { useReducer, useCallback, useEffect } from 'react';
import {
    CanvasState, CanvasAction, CanvasNode, CanvasEdge,
    ChainGroup, CanvasViewMode, CanvasRenderMode, PresentationMode,
    DeviceCapabilities, Vector3, Camera3D, vec3, addVec3,
    WorkspaceGroup, DockPanelId,
    detectCapabilities,
} from './CanvasTypes';
import { LayoutMode, applyLayout, hasOverlap, autoSpreadNodes } from './useLayout';

const defaultCamera: Camera3D = { position: vec3(0, 0, 0), zoom: 1 };

const initialState: CanvasState = {
    nodes: [],
    edges: [],
    groups: [],
    workspaceGroups: [],
    activeView: 'free',
    selectedNodeId: null,
    selectedGroupId: null,
    camera: defaultCamera,
    renderMode: '2d',
    presentationMode: 'flat',
    deviceCapabilities: null,
    layoutTargets: null,
    activeLayoutMode: null,
    layoutDepth: 1,
    layoutGroups: [],
    activeDockPanel: null,
};

function canvasReducer(state: CanvasState, action: CanvasAction): CanvasState {
    switch (action.type) {
        case 'SET_VIEW':
            return { ...state, activeView: action.view };

        case 'ADD_NODE': {
            const next = { ...state, nodes: [...state.nodes, action.node] };
            // Auto-add to default workspace group
            if (next.workspaceGroups.length > 0) {
                next.workspaceGroups = next.workspaceGroups.map((g, i) =>
                    i === 0 && !g.nodeIds.includes(action.node.id)
                        ? { ...g, nodeIds: [...g.nodeIds, action.node.id] }
                        : g
                );
            }
            return next;
        }

        case 'REMOVE_NODE': {
            const id = action.id;
            return {
                ...state,
                nodes: state.nodes.filter(n => n.id !== id),
                edges: state.edges.filter(e => e.source !== id && e.target !== id),
                groups: state.groups.map(g => ({
                    ...g,
                    nodeIds: g.nodeIds.filter(nid => nid !== id),
                })),
                workspaceGroups: state.workspaceGroups.map(g => ({
                    ...g,
                    nodeIds: g.nodeIds.filter(nid => nid !== id),
                })),
                selectedNodeId: state.selectedNodeId === id ? null : state.selectedNodeId,
            };
        }

        case 'MOVE_NODE':
            return {
                ...state,
                nodes: state.nodes.map(n =>
                    n.id === action.id ? { ...n, position: action.position } : n
                ),
            };

        case 'SELECT_NODE':
            return { ...state, selectedNodeId: action.id, selectedGroupId: null };

        case 'ADD_EDGE':
            return { ...state, edges: [...state.edges, action.edge] };

        case 'REMOVE_EDGE':
            return { ...state, edges: state.edges.filter(e => e.id !== action.id) };

        case 'ADD_GROUP':
            return { ...state, groups: [...state.groups, action.group] };

        case 'REMOVE_GROUP': {
            const gid = action.id;
            return {
                ...state,
                groups: state.groups.filter(g => g.id !== gid),
                edges: state.edges.filter(e => e.source !== gid && e.target !== gid),
                selectedGroupId: state.selectedGroupId === gid ? null : state.selectedGroupId,
            };
        }

        case 'ADD_NODE_TO_GROUP':
            return {
                ...state,
                groups: state.groups.map(g =>
                    g.id === action.groupId && !g.nodeIds.includes(action.nodeId)
                        ? { ...g, nodeIds: [...g.nodeIds, action.nodeId] }
                        : g
                ),
            };

        case 'REMOVE_NODE_FROM_GROUP':
            return {
                ...state,
                groups: state.groups.map(g =>
                    g.id === action.groupId
                        ? { ...g, nodeIds: g.nodeIds.filter(nid => nid !== action.nodeId) }
                        : g
                ),
            };

        case 'SELECT_GROUP':
            return { ...state, selectedGroupId: action.id, selectedNodeId: null };

        case 'MOVE_GROUP':
            return {
                ...state,
                groups: state.groups.map(g =>
                    g.id === action.id ? { ...g, position: action.position } : g
                ),
            };

        case 'SET_CAMERA':
            return { ...state, camera: { ...state.camera, ...action.camera } };

        case 'PAN_CAMERA':
            return {
                ...state,
                camera: {
                    ...state.camera,
                    position: addVec3(state.camera.position, action.delta),
                },
            };

        // ── Layout ──
        case 'APPLY_LAYOUT': {
            const posMap = action.positions;
            return {
                ...state,
                nodes: state.nodes.map(n => {
                    const p = posMap.get(n.id);
                    return p ? { ...n, position: p } : n;
                }),
                activeLayoutMode: action.mode,
                layoutDepth: action.depth,
                layoutGroups: action.groups,
            };
        }

        case 'SET_LAYOUT_DEPTH':
            return { ...state, layoutDepth: action.depth };

        case 'CLEAR_LAYOUT_GROUPS':
            return { ...state, activeLayoutMode: null, layoutGroups: [], layoutDepth: 1 };

        // ── Workspace groups ──
        case 'ADD_WORKSPACE_GROUP':
            return { ...state, workspaceGroups: [...state.workspaceGroups, action.group] };

        case 'REMOVE_WORKSPACE_GROUP':
            return {
                ...state,
                workspaceGroups: state.workspaceGroups.filter(g => g.id !== action.id),
            };

        case 'ADD_NODE_TO_WORKSPACE':
            return {
                ...state,
                workspaceGroups: state.workspaceGroups.map(g =>
                    g.id === action.workspaceId && !g.nodeIds.includes(action.nodeId)
                        ? { ...g, nodeIds: [...g.nodeIds, action.nodeId] }
                        : g
                ),
            };

        case 'REMOVE_NODE_FROM_WORKSPACE':
            return {
                ...state,
                workspaceGroups: state.workspaceGroups.map(g =>
                    g.id === action.workspaceId
                        ? { ...g, nodeIds: g.nodeIds.filter(nid => nid !== action.nodeId) }
                        : g
                ),
            };

        case 'MOVE_WORKSPACE_GROUP':
            return {
                ...state,
                workspaceGroups: state.workspaceGroups.map(g =>
                    g.id === action.id ? { ...g, position: action.position } : g
                ),
            };

        // ── Dock ──
        case 'SET_DOCK_PANEL':
            return { ...state, activeDockPanel: action.panel };

        // ── Layer 1 + 2 switching ──
        case 'SET_RENDER_MODE':
            return { ...state, renderMode: action.mode };

        case 'SET_PRESENTATION_MODE':
            return { ...state, presentationMode: action.mode };

        case 'SET_DEVICE_CAPABILITIES':
            return { ...state, deviceCapabilities: action.capabilities };

        case 'SET_LAYOUT_TARGETS':
            return { ...state, layoutTargets: action.targets };

        default:
            return state;
    }
}

export function useCanvasState(initial?: Partial<CanvasState>) {
    const [state, dispatch] = useReducer(
        canvasReducer,
        (() => {
            const merged = { ...initialState, ...initial };
            // Auto-create a default workspace group if none exist
            if (merged.workspaceGroups.length === 0) {
                merged.workspaceGroups = [{
                    id: 'ws-default',
                    label: 'Workspace',
                    nodeIds: merged.nodes.map(n => n.id),
                    position: vec3(0, 0, 0),
                    color: '#00d2ff',
                }];
            }
            return merged;
        })()
    );

    const moveNode = useCallback((id: string, position: Vector3) => {
        dispatch({ type: 'MOVE_NODE', id, position });
    }, []);

    const selectNode = useCallback((id: string | null) => {
        dispatch({ type: 'SELECT_NODE', id });
    }, []);

    const addEdge = useCallback((edge: CanvasEdge) => {
        dispatch({ type: 'ADD_EDGE', edge });
    }, []);

    const setView = useCallback((view: CanvasViewMode) => {
        dispatch({ type: 'SET_VIEW', view });
    }, []);

    const setRenderMode = useCallback((mode: CanvasRenderMode) => {
        dispatch({ type: 'SET_RENDER_MODE', mode });
    }, []);

    const setPresentationMode = useCallback((mode: PresentationMode) => {
        dispatch({ type: 'SET_PRESENTATION_MODE', mode });
    }, []);

    /** Recompute layout and move all nodes at once (instant) */
    const reflow = useCallback((layoutMode: LayoutMode, rootNodeId?: string, depth?: number) => {
        const d = depth ?? state.layoutDepth;
        const result = applyLayout(layoutMode, state.nodes, state.edges, {
            renderMode: state.renderMode,
            rootNodeId,
            depth: d,
        });
        dispatch({ type: 'APPLY_LAYOUT', positions: result.positions, groups: result.groups, mode: layoutMode, depth: d });
    }, [state.nodes, state.edges, state.renderMode, state.layoutDepth]);

    /**
     * Recompute layout and animate nodes to new positions via the physics engine.
     * Stores targets in state so the physics hook can call api.setTargets().
     */
    const reflowAnimated = useCallback((layoutMode: LayoutMode, rootNodeId?: string, depth?: number) => {
        const d = depth ?? state.layoutDepth;
        const result = applyLayout(layoutMode, state.nodes, state.edges, {
            renderMode: state.renderMode,
            rootNodeId,
            depth: d,
        });
        dispatch({ type: 'APPLY_LAYOUT', positions: result.positions, groups: result.groups, mode: layoutMode, depth: d });
        dispatch({ type: 'SET_LAYOUT_TARGETS', targets: result.positions });
    }, [state.nodes, state.edges, state.renderMode, state.layoutDepth]);

    /** Drill in (increase depth) — only meaningful for group-date / group-location */
    const drillIn = useCallback(() => {
        const mode = state.activeLayoutMode;
        if (!mode || (mode !== 'group-date' && mode !== 'group-location')) return;
        const maxDepth = mode === 'group-date' ? 2 : 5;
        const next = Math.min(state.layoutDepth + 1, maxDepth);
        if (next === state.layoutDepth) return;
        const result = applyLayout(mode, state.nodes, state.edges, {
            renderMode: state.renderMode,
            depth: next,
        });
        dispatch({ type: 'APPLY_LAYOUT', positions: result.positions, groups: result.groups, mode, depth: next });
    }, [state.activeLayoutMode, state.layoutDepth, state.nodes, state.edges, state.renderMode]);

    /** Drill out (decrease depth) */
    const drillOut = useCallback(() => {
        const mode = state.activeLayoutMode;
        if (!mode || (mode !== 'group-date' && mode !== 'group-location')) return;
        const next = Math.max(state.layoutDepth - 1, 0);
        if (next === state.layoutDepth) return;
        const result = applyLayout(mode, state.nodes, state.edges, {
            renderMode: state.renderMode,
            depth: next,
        });
        dispatch({ type: 'APPLY_LAYOUT', positions: result.positions, groups: result.groups, mode, depth: next });
    }, [state.activeLayoutMode, state.layoutDepth, state.nodes, state.edges, state.renderMode]);

    /** Clear layout groups (return to freeform) */
    const clearLayout = useCallback(() => {
        dispatch({ type: 'CLEAR_LAYOUT_GROUPS' });
    }, []);

    // Auto-detect device capabilities once on mount
    useEffect(() => {
        detectCapabilities().then(caps => {
            dispatch({ type: 'SET_DEVICE_CAPABILITIES', capabilities: caps });
        });
    }, []);

    // Auto-spread overlapping nodes on initial mount
    useEffect(() => {
        if (state.nodes.length > 1 && hasOverlap(state.nodes)) {
            const positions = autoSpreadNodes(state.nodes);
            dispatch({ type: 'APPLY_LAYOUT', positions, groups: [], mode: null as unknown as LayoutMode, depth: state.layoutDepth });
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // only on mount

    return {
        state, dispatch,
        moveNode, selectNode, addEdge, setView,
        setRenderMode, setPresentationMode,
        reflow, reflowAnimated, drillIn, drillOut, clearLayout,
    };
}
