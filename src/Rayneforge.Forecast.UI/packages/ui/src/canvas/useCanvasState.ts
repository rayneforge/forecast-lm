import { useReducer, useCallback, useEffect } from 'react';
import {
    CanvasState, CanvasAction, CanvasNode, CanvasEdge,
    ChainGroup, CanvasViewMode, CanvasRenderMode, PresentationMode,
    DeviceCapabilities, Vector3, Camera3D, vec3, addVec3,
    detectCapabilities,
} from './CanvasTypes';
import { LayoutMode, applyLayout } from './useLayout';

const defaultCamera: Camera3D = { position: vec3(0, 0, 0), zoom: 1 };

const initialState: CanvasState = {
    nodes: [],
    edges: [],
    groups: [],
    activeView: 'free',
    selectedNodeId: null,
    selectedGroupId: null,
    camera: defaultCamera,
    renderMode: '2d',
    presentationMode: 'flat',
    deviceCapabilities: null,
};

function canvasReducer(state: CanvasState, action: CanvasAction): CanvasState {
    switch (action.type) {
        case 'SET_VIEW':
            return { ...state, activeView: action.view };

        case 'ADD_NODE':
            return { ...state, nodes: [...state.nodes, action.node] };

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
            };
        }

        // ── Layer 1 + 2 switching ──
        case 'SET_RENDER_MODE':
            return { ...state, renderMode: action.mode };

        case 'SET_PRESENTATION_MODE':
            return { ...state, presentationMode: action.mode };

        case 'SET_DEVICE_CAPABILITIES':
            return { ...state, deviceCapabilities: action.capabilities };

        default:
            return state;
    }
}

export function useCanvasState(initial?: Partial<CanvasState>) {
    const [state, dispatch] = useReducer(
        canvasReducer,
        { ...initialState, ...initial }
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

    /** Recompute layout and move all nodes at once */
    const reflow = useCallback((layoutMode: LayoutMode) => {
        const result = applyLayout(layoutMode, state.nodes, state.edges, {
            renderMode: state.renderMode,
        });
        dispatch({ type: 'APPLY_LAYOUT', positions: result.positions });
    }, [state.nodes, state.edges, state.renderMode]);

    // Auto-detect device capabilities once on mount
    useEffect(() => {
        detectCapabilities().then(caps => {
            dispatch({ type: 'SET_DEVICE_CAPABILITIES', capabilities: caps });
        });
    }, []);

    return {
        state, dispatch,
        moveNode, selectNode, addEdge, setView,
        setRenderMode, setPresentationMode, reflow,
    };
}
