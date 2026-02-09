// ─── Scene Physics Context ──────────────────────────────────────
// Bridges the physics engine (which lives outside the R3F Canvas)
// with the imperative Three.js scene graph (inside the Canvas).
//
// Three concerns:
//   1. bodiesRef  — mutable Map of physics bodies (positions/velocities)
//   2. nodeRefs   — mutable Map of THREE.Group refs registered by nodes
//   3. api        — physics control surface (drag, layout, tick)
//
// The PhysicsTicker (inside Canvas) reads bodiesRef + nodeRefs each
// frame and calls group.position.set() — zero React re-renders for
// node position changes.

import { createContext, useContext, useCallback, MutableRefObject } from 'react';
import * as THREE from 'three';
import { PhysicsBody } from '../../../canvas/physics/PhysicsEngine';
import { PhysicsAPI } from '../../../canvas/physics/useCanvasPhysics';

// ─── Context Value ──────────────────────────────────────────────

export interface ScenePhysicsContextValue {
    /** Mutable Map of physics bodies — read in useFrame for positions */
    bodiesRef: MutableRefObject<Map<string, PhysicsBody>>;
    /** Mutable Map of THREE.Group refs registered by 3D node components */
    nodeRefs: MutableRefObject<Map<string, THREE.Group>>;
    /** Physics control surface */
    api: PhysicsAPI;
}

const ScenePhysicsContext = createContext<ScenePhysicsContextValue | null>(null);

export const ScenePhysicsProvider = ScenePhysicsContext.Provider;

// ─── Consumer Hooks ─────────────────────────────────────────────

/** Access the full scene-physics context. Throws if outside provider. */
export function useScenePhysics(): ScenePhysicsContextValue {
    const ctx = useContext(ScenePhysicsContext);
    if (!ctx) throw new Error('useScenePhysics must be used within <ScenePhysicsProvider>');
    return ctx;
}

/**
 * Register a THREE.Group ref for a node id.
 * Returns a callback-ref to attach to the <group> element.
 * Automatically unregisters when the component unmounts (ref called with null).
 */
export function useNodeRef(id: string): (node: THREE.Group | null) => void {
    const { nodeRefs } = useScenePhysics();

    const setRef = useCallback((node: THREE.Group | null) => {
        if (node) {
            nodeRefs.current.set(id, node);
        } else {
            nodeRefs.current.delete(id);
        }
    }, [id, nodeRefs]);

    return setRef;
}
