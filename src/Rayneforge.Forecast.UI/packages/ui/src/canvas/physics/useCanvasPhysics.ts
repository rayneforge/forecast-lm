// ─── useCanvasPhysics ───────────────────────────────────────────
// React hook wrapping the pure PhysicsEngine.
//
// Maintains a mutable Map<string, PhysicsBody> in a ref to avoid
// per-frame re-renders. Exposes an API for drag / layout / config
// and a positions Map for the renderer to read.
//
// Two modes of ticking:
//   - Internal rAF loop (2D canvas) — auto-started
//   - External tick(dt) call (3D via useFrame) — set external=true

import React, { useRef, useEffect, useCallback, useState, useMemo } from 'react';
import { CanvasState, CanvasEdge, Vector3, vec3 } from '../CanvasTypes';
import {
    PhysicsBody, PhysicsConfig, DEFAULT_CONFIG, step,
} from './PhysicsEngine';
import { getNodeBounds } from './nodeBounds';

// ─── Public API ─────────────────────────────────────────────────

export interface PhysicsAPI {
    /** Mark a body as being dragged — zeros velocity */
    startDrag: (id: string) => void;
    /** Update position while dragging (1:1 tracking) */
    drag: (id: string, position: Vector3) => void;
    /** Release drag — applies fling velocity */
    endDrag: (id: string, velocity?: Vector3) => void;
    /** Animate all bodies to new target positions (layout transition) */
    setTargets: (targets: Map<string, Vector3>) => void;
    /** Reconfigure physics at runtime */
    setConfig: (partial: Partial<PhysicsConfig>) => void;
    /** Manual tick — call from useFrame in R3F (disables internal rAF) */
    tick: (dt: number) => void;
}

export interface UseCanvasPhysicsResult {
    /** Physics-interpolated positions — read each frame by the renderer */
    positions: Map<string, Vector3>;
    /** Imperative API for drag / layout / config */
    api: PhysicsAPI;
    /** Direct access to mutable body store — for imperative 3D updates */
    bodiesRef: React.RefObject<Map<string, PhysicsBody>>;
}

// ─── Hook ───────────────────────────────────────────────────────

export function useCanvasPhysics(
    state: CanvasState,
    options?: { external?: boolean; config?: Partial<PhysicsConfig> },
): UseCanvasPhysicsResult {
    const external = options?.external ?? false;

    // Mutable body store — never triggers React re-renders
    const bodiesRef = useRef<Map<string, PhysicsBody>>(new Map());
    const configRef = useRef<PhysicsConfig>({ ...DEFAULT_CONFIG, ...options?.config });
    const edgesRef = useRef<CanvasEdge[]>(state.edges);
    const awakeRef = useRef(false);
    const rafRef = useRef(0);
    const lastTimeRef = useRef(0);

    // This counter triggers a re-render when positions change visually
    // Bumped at most once per rAF frame via the loop
    const [tick, setTick] = useState(0);

    // ── Sync bodies with canvas state ───────────────────────
    useEffect(() => {
        const bodies = bodiesRef.current;
        const seen = new Set<string>();
        let newCount = 0;

        for (const node of state.nodes) {
            seen.add(node.id);
            const existing = bodies.get(node.id);
            const bounds = getNodeBounds(node.type);

            if (existing) {
                // Update bounds in case type changed
                existing.width = bounds.width;
                existing.height = bounds.height;
                existing.locked = node.locked ?? false;
                // If the canonical position moved (e.g. APPLY_LAYOUT or MOVE_NODE)
                // and we're not currently dragging, snap position + target
                if (!existing.dragging) {
                    const dx = Math.abs(existing.target.x - node.position.x);
                    const dy = Math.abs(existing.target.y - node.position.y);
                    existing.target = { ...node.position };
                    // Large jumps (>50px) = layout change — snap instantly
                    if (dx > 50 || dy > 50) {
                        existing.position = { ...node.position };
                        existing.velocity = vec3(0, 0, 0);
                    }
                }
            } else {
                // New body — start at the node's position
                bodies.set(node.id, {
                    position: { ...node.position },
                    velocity: vec3(0, 0, 0),
                    target: { ...node.position },
                    width: bounds.width,
                    height: bounds.height,
                    dragging: false,
                    locked: node.locked ?? false,
                });
                newCount++;
            }
        }

        // Remove bodies for deleted nodes
        for (const id of bodies.keys()) {
            if (!seen.has(id)) bodies.delete(id);
        }

        edgesRef.current = state.edges;

        // If new bodies were added, run a few warm-up steps to resolve
        // initial overlaps before the first render frame
        if (newCount > 0 && bodies.size > 1) {
            for (let i = 0; i < 8; i++) {
                step(0.016, bodies, state.edges, configRef.current);
            }
        }

        awakeRef.current = true; // re-evaluate
    }, [state.nodes, state.edges]);

    // ── Sync layout group membership → physics config ───────
    // Builds a node→groupId lookup so the engine can skip intra-group
    // collision and avoid fighting the layout placement.
    useEffect(() => {
        if (state.layoutGroups.length === 0) {
            // No active layout groups — remove override
            const { layoutGroupMap: _removed, ...rest } = configRef.current;
            configRef.current = rest as typeof configRef.current;
            return;
        }
        const lgMap = new Map<string, string>();
        for (const lg of state.layoutGroups) {
            for (const nid of lg.nodeIds) lgMap.set(nid, lg.id);
        }
        configRef.current = { ...configRef.current, layoutGroupMap: lgMap };
    }, [state.layoutGroups]);

    // ── Consume layoutTargets from state (animated transitions) ──
    useEffect(() => {
        if (!state.layoutTargets) return;
        const bodies = bodiesRef.current;
        for (const [id, target] of state.layoutTargets) {
            const body = bodies.get(id);
            if (body && !body.dragging) {
                body.target = { ...target };
                // Snap position close to target for faster settling
                body.position.x += (target.x - body.position.x) * 0.85;
                body.position.y += (target.y - body.position.y) * 0.85;
                body.velocity = vec3(0, 0, 0);
            }
        }
        // Temporarily boost stiffness for fast layout snap, then restore
        const origStiffness = configRef.current.springStiffness;
        configRef.current = { ...configRef.current, springStiffness: 80 };
        setTimeout(() => {
            configRef.current = { ...configRef.current, springStiffness: origStiffness };
        }, 600);
        awakeRef.current = true;
    }, [state.layoutTargets]);

    // ── Build positions snapshot (derived from tick counter) ──
    const positions = useMemo(() => {
        // Reading tick forces this to recompute when the rAF bumps it
        void tick;
        const map = new Map<string, Vector3>();
        for (const [id, body] of bodiesRef.current) {
            map.set(id, { ...body.position });
        }
        return map;
    }, [tick]);

    // ── Physics step implementation ─────────────────────────
    const doStep = useCallback((dt: number, silent = false) => {
        const moving = step(dt, bodiesRef.current, edgesRef.current, configRef.current);
        awakeRef.current = moving;
        // Trigger a React re-render so positions are picked up (2D mode)
        // In silent mode (3D), skip — positions are applied imperatively
        if (!silent) setTick(t => t + 1);
    }, []);

    // ── Internal rAF loop (for 2D canvas) ───────────────────
    useEffect(() => {
        if (external) return; // 3D mode — caller drives tick via api.tick

        const loop = (now: number) => {
            const dt = lastTimeRef.current ? (now - lastTimeRef.current) / 1000 : 0.016;
            lastTimeRef.current = now;

            if (awakeRef.current) {
                doStep(dt);
            }

            rafRef.current = requestAnimationFrame(loop);
        };

        rafRef.current = requestAnimationFrame(loop);
        return () => cancelAnimationFrame(rafRef.current);
    }, [external, doStep]);

    // ── API ─────────────────────────────────────────────────
    const api = useMemo<PhysicsAPI>(() => ({
        startDrag(id: string) {
            const body = bodiesRef.current.get(id);
            if (!body) return;
            body.dragging = true;
            body.velocity = vec3(0, 0, 0);
            awakeRef.current = true;
        },

        drag(id: string, position: Vector3) {
            const body = bodiesRef.current.get(id);
            if (!body) return;
            body.position = { ...position };
            body.target = { ...position };
            awakeRef.current = true;
        },

        endDrag(id: string, velocity?: Vector3) {
            const body = bodiesRef.current.get(id);
            if (!body) return;
            body.dragging = false;
            body.target = { ...body.position };
            if (velocity) {
                // Cap fling velocity to prevent nodes flying off-screen
                const MAX_FLING = 250;
                const mag = Math.sqrt(velocity.x * velocity.x + velocity.y * velocity.y);
                if (mag > MAX_FLING) {
                    const s = MAX_FLING / mag;
                    body.velocity = { x: velocity.x * s, y: velocity.y * s, z: 0 };
                } else {
                    body.velocity = { ...velocity };
                }
            }
            awakeRef.current = true;
        },

        setTargets(targets: Map<string, Vector3>) {
            for (const [id, target] of targets) {
                const body = bodiesRef.current.get(id);
                if (body && !body.dragging) {
                    body.target = { ...target };
                }
            }
            awakeRef.current = true;
        },

        setConfig(partial: Partial<PhysicsConfig>) {
            configRef.current = { ...configRef.current, ...partial };
        },

        tick(dt: number) {
            doStep(dt, true);
        },
    }), [doStep]);

    return { positions, api, bodiesRef };
}
