// ─── Canvas Data Model ──────────────────────────────────────────
// All positions use Vector3 to support future XR / Three.js mode.
// In 2D mode z drives z-index layering; in XR it becomes true depth.

import { NewsArticle } from '@rayneforge/logic';

// ─── Spatial Primitives ─────────────────────────────────────────

/** 3-component vector — z is layer in 2D, depth in XR */
export interface Vector3 {
    x: number;
    y: number;
    z: number;
}

export const vec3 = (x: number, y: number, z = 0): Vector3 => ({ x, y, z });

/** Add two vectors */
export const addVec3 = (a: Vector3, b: Vector3): Vector3 => ({
    x: a.x + b.x,
    y: a.y + b.y,
    z: a.z + b.z,
});

/** Scale a vector by a scalar */
export const scaleVec3 = (v: Vector3, s: number): Vector3 => ({
    x: v.x * s,
    y: v.y * s,
    z: v.z * s,
});

/** Euclidean distance (uses all 3 axes so XR "just works") */
export const distVec3 = (a: Vector3, b: Vector3): number =>
    Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2 + (a.z - b.z) ** 2);

// ─── Node Types ─────────────────────────────────────────────────

export type CanvasNodeType = 'article' | 'note' | 'topic' | 'entity';

interface BaseNode {
    id: string;
    type: CanvasNodeType;
    position: Vector3;
    /** Rotation (Euler angles) — unused in 2D, ready for XR */
    rotation?: Vector3;
    /** Locked nodes cannot be dragged */
    locked?: boolean;
    /** Visual scale factor (default 1) */
    scale?: number;
}

export interface ArticleNode extends BaseNode {
    type: 'article';
    data: NewsArticle;
}

export interface NoteNode extends BaseNode {
    type: 'note';
    data: {
        title: string;
        body: string;
        createdAt: string;
        color?: string;
    };
}

export interface EntityNode extends BaseNode {
    type: 'entity';
    data: {
        type: string;
        name: string;
        description: string;
    };
}

export interface TopicBubble extends BaseNode {
    type: 'topic';
    data: {
        label: string;
        weight: number; // 0‑1, controls visual size
    };
}

export type CanvasNode = ArticleNode | NoteNode | TopicBubble | EntityNode;

// ─── Edges ──────────────────────────────────────────────────────

export type EdgeType = 'link' | 'group-bridge' | 'relation';

export interface CanvasEdge {
    id: string;
    source: string; // node or group id
    target: string;
    type: EdgeType;
    label?: string;
}

// ─── Groups (Chains) ────────────────────────────────────────────

export interface ChainGroup {
    id: string;
    label: string;
    nodeIds: string[];
    position: Vector3;
    color?: string;
}

// ─── View Modes ─────────────────────────────────────────────────

export type CanvasViewMode = 'free' | 'timeline' | 'linear';

// ─── Rendering & Presentation (3-Layer Model) ───────────────────
//
//  Layer 1 — Render target: what paints the pixels
//    '2d'  = CSS-transform canvas (current impl)
//    '3d'  = Three.js WebGLRenderer (scene + camera always exist)
//
//  Layer 2 — Presentation mode: who controls the camera
//    'flat' = mouse / touch / trackpad (desktop & mobile)
//    'vr'   = headset pose drives camera (Quest, PCVR)
//    'ar'   = device camera + world anchoring (Quest MR, Android)
//
//  Layer 3 — Input source: how the user interacts
//    'pointer'    = mouse / touch → Raycaster from camera
//    'controller' = XR controller rays + trigger
//    'hand'       = hand-tracking joints (Quest)
//    'gaze'       = head-gaze fallback (cardboard, accessibility)
//
//  Key insight: scene graph & UI meshes are SHARED across all
//  three layers. Only camera ownership and input routing change.
// ─────────────────────────────────────────────────────────────────

/** Layer 1 — what renders the pixels */
export type CanvasRenderMode = '2d' | '3d';

/** Layer 2 — who owns the camera */
export type PresentationMode = 'flat' | 'vr' | 'ar';

/** Layer 3 — how the user interacts (resolved at runtime) */
export type InputSource = 'pointer' | 'controller' | 'hand' | 'gaze';

/** XR session type requested via WebXR API */
export type XRSessionType = 'immersive-vr' | 'immersive-ar' | 'inline';

/** Snapshot of what the device actually supports — computed once on mount */
export interface DeviceCapabilities {
    /** Can we get a WebGL context at all? */
    webgl: boolean;
    /** navigator.xr?.isSessionSupported('immersive-vr') */
    immersiveVR: boolean;
    /** navigator.xr?.isSessionSupported('immersive-ar') */
    immersiveAR: boolean;
    /** Available input sources detected from the XR system */
    inputSources: InputSource[];
}

/** Detect device rendering & XR capabilities (async — call once on mount) */
export async function detectCapabilities(): Promise<DeviceCapabilities> {
    const webgl = detectWebGL();
    let immersiveVR = false;
    let immersiveAR = false;

    if ('xr' in navigator && navigator.xr) {
        const xr = navigator.xr as { isSessionSupported(mode: string): Promise<boolean> };
        try {
            immersiveVR = await xr.isSessionSupported('immersive-vr');
        } catch { /* not supported */ }
        try {
            immersiveAR = await xr.isSessionSupported('immersive-ar');
        } catch { /* not supported */ }
    }

    // Input sources are only known once a session starts;
    // default to pointer for now — upgraded on 'inputsourceschange'
    const inputSources: InputSource[] = ['pointer'];

    return { webgl, immersiveVR, immersiveAR, inputSources };
}

/** Synchronous WebGL check (for the fast "can we even show the toggle?" path) */
export function detectWebGL(): boolean {
    try {
        const c = document.createElement('canvas');
        return !!(
            window.WebGLRenderingContext &&
            (c.getContext('webgl2') || c.getContext('webgl') || c.getContext('experimental-webgl'))
        );
    } catch {
        return false;
    }
}

/**
 * Describes where the UI group should be anchored based on presentation mode.
 * Same meshes, different placement — this is the unlock.
 */
export interface UIAnchor {
    /** World-space position of the UI group root */
    position: Vector3;
    /** Whether the UI should billboard (face camera) */
    billboard: boolean;
    /** If true, UI follows camera; if false, stays world-fixed */
    cameraRelative: boolean;
}

/** Default UI anchor per presentation mode */
export const DEFAULT_UI_ANCHORS: Record<PresentationMode, UIAnchor> = {
    flat: { position: vec3(0, 0, -5), billboard: false, cameraRelative: true },
    vr:   { position: vec3(0, 1.4, -1.5), billboard: true, cameraRelative: false },
    ar:   { position: vec3(0, 0, 0), billboard: false, cameraRelative: false },  // placed at hit-test
};
// ─── Camera ─────────────────────────────────────────────────────

export interface Camera3D {
    position: Vector3;
    /** Zoom in 2D; FOV in XR */
    zoom: number;
    /** Camera target (look-at) — XR mode only */
    target?: Vector3;
}

// ─── Aggregate State ────────────────────────────────────────────

export interface CanvasState {
    nodes: CanvasNode[];
    edges: CanvasEdge[];
    groups: ChainGroup[];
    activeView: CanvasViewMode;
    selectedNodeId: string | null;
    selectedGroupId: string | null;
    camera: Camera3D;
    /** Layer 1 — current rendering backend */
    renderMode: CanvasRenderMode;
    /** Layer 2 — current presentation / camera ownership */
    presentationMode: PresentationMode;
    /** Detected once on mount, never changes */
    deviceCapabilities: DeviceCapabilities | null;
}

// ─── Action Types ───────────────────────────────────────────────

export type CanvasAction =
    | { type: 'SET_VIEW'; view: CanvasViewMode }
    | { type: 'ADD_NODE'; node: CanvasNode }
    | { type: 'REMOVE_NODE'; id: string }
    | { type: 'MOVE_NODE'; id: string; position: Vector3 }
    | { type: 'SELECT_NODE'; id: string | null }
    | { type: 'ADD_EDGE'; edge: CanvasEdge }
    | { type: 'REMOVE_EDGE'; id: string }
    | { type: 'ADD_GROUP'; group: ChainGroup }
    | { type: 'REMOVE_GROUP'; id: string }
    | { type: 'ADD_NODE_TO_GROUP'; nodeId: string; groupId: string }
    | { type: 'REMOVE_NODE_FROM_GROUP'; nodeId: string; groupId: string }
    | { type: 'SELECT_GROUP'; id: string | null }
    | { type: 'SET_CAMERA'; camera: Partial<Camera3D> }
    | { type: 'PAN_CAMERA'; delta: Vector3 }
    // ── Layout ──
    | { type: 'APPLY_LAYOUT'; positions: Map<string, Vector3> }
    // ── Layer 1 + 2 switching ──
    | { type: 'SET_RENDER_MODE'; mode: CanvasRenderMode }
    | { type: 'SET_PRESENTATION_MODE'; mode: PresentationMode }
    | { type: 'SET_DEVICE_CAPABILITIES'; capabilities: DeviceCapabilities };
