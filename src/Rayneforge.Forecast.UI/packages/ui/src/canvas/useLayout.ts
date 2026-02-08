// ─── Canvas Layout Algorithms ───────────────────────────────────
//
// Two spatial layout strategies that work in both 2D and 3D:
//
//   1. Center-Out (Radial) — highest-ranked / most-connected nodes
//      at the center, radiating outward in concentric rings (2D)
//      or shells (3D).
//
//   2. Hierarchy (Left → Right) — tree layout flowing L→R.
//      Root = most-connected node. In 3D the depth axis (z) adds
//      a slight spread so layers don't stack flat.
//
// IMPORTANT — positions are ALWAYS in pixel-space.  The 3D
// rendering components apply toWorld() (×0.01) on their own.
// The only 3D-specific difference is z-depth variation so that
// the scene has parallax / dome depth when viewed in 3D.
//
// Both accept the full graph and return a position map.
// The caller dispatches APPLY_LAYOUT for each entry.

import {
    CanvasNode, CanvasEdge, CanvasRenderMode, Vector3, vec3,
} from './CanvasTypes';

// ─── Public types ───────────────────────────────────────────────

export type LayoutMode = 'center' | 'hierarchy';

export interface LayoutOptions {
    /** Active render mode — 3D layouts use the z-axis for depth */
    renderMode: CanvasRenderMode;
    /** Viewport centre in pixel-space (default 400,300) */
    origin?: Vector3;
    /** Base spacing between nodes in pixels (default 280) */
    spacing?: number;
}

export interface LayoutResult {
    positions: Map<string, Vector3>;
}

// ─── Graph helpers ──────────────────────────────────────────────

/** Count edges per node and return sorted descending by degree */
function rankByDegree(nodes: CanvasNode[], edges: CanvasEdge[]): { id: string; degree: number }[] {
    const deg = new Map<string, number>();
    for (const n of nodes) deg.set(n.id, 0);
    for (const e of edges) {
        deg.set(e.source, (deg.get(e.source) ?? 0) + 1);
        deg.set(e.target, (deg.get(e.target) ?? 0) + 1);
    }
    return [...deg.entries()]
        .map(([id, degree]) => ({ id, degree }))
        .sort((a, b) => b.degree - a.degree);
}

/** Build adjacency list */
function adjacency(nodes: CanvasNode[], edges: CanvasEdge[]): Map<string, Set<string>> {
    const adj = new Map<string, Set<string>>();
    for (const n of nodes) adj.set(n.id, new Set());
    for (const e of edges) {
        adj.get(e.source)?.add(e.target);
        adj.get(e.target)?.add(e.source);
    }
    return adj;
}

// ─── 1. Center-Out (Radial) ─────────────────────────────────────
//
// Concentric circles — ring 0 = top-ranked node at origin,
// ring 1 = its direct neighbours, ring 2 = next tier, etc.
//
// 3D addition: each outer ring gets progressive z-depth so the
// layout reads as a dome / amphitheatre when viewed in 3D.

function layoutCenterOut(
    nodes: CanvasNode[],
    edges: CanvasEdge[],
    opts: Required<LayoutOptions>,
): LayoutResult {
    const ranked = rankByDegree(nodes, edges);
    const adj = adjacency(nodes, edges);
    const positions = new Map<string, Vector3>();
    if (ranked.length === 0) return { positions };

    const { origin, spacing, renderMode } = opts;
    const is3D = renderMode === '3d';

    // BFS outward from the top-ranked node
    const visited = new Set<string>();
    const rings: string[][] = [];
    const queue: { id: string; ring: number }[] = [{ id: ranked[0].id, ring: 0 }];
    visited.add(ranked[0].id);

    while (queue.length > 0) {
        const { id, ring } = queue.shift()!;
        if (!rings[ring]) rings[ring] = [];
        rings[ring].push(id);

        const neighbours = adj.get(id);
        if (neighbours) {
            for (const nId of neighbours) {
                if (!visited.has(nId)) {
                    visited.add(nId);
                    queue.push({ id: nId, ring: ring + 1 });
                }
            }
        }
    }

    // Any disconnected nodes get appended as a final ring
    const orphans = nodes.filter(n => !visited.has(n.id)).map(n => n.id);
    if (orphans.length > 0) rings.push(orphans);

    // Place each ring — all coords in pixel-space
    for (let r = 0; r < rings.length; r++) {
        const ring = rings[r];
        const radius = r * spacing;

        for (let i = 0; i < ring.length; i++) {
            const angle = (2 * Math.PI * i) / ring.length;

            if (r === 0) {
                // Centre node — z=0 for both modes
                positions.set(ring[i], vec3(origin.x, origin.y, 0));
            } else {
                const x = origin.x + Math.cos(angle) * radius;
                const y = origin.y + Math.sin(angle) * radius;
                // 3D: outer rings pushed backward on z for dome feel
                // (z in px — toWorld will convert to world units)
                const z = is3D
                    ? -r * (spacing * 0.6) + Math.sin(angle) * 30
                    : r;
                positions.set(ring[i], vec3(x, y, z));
            }
        }
    }

    return { positions };
}

// ─── 2. Hierarchy (Left → Right) ────────────────────────────────
//
// BFS tree from the most-connected node.
// x = depth layer × spacing      (left → right)
// y = index within layer           (top → bottom, centred)
//
// 3D addition: z fans outward per layer + per-node spread so the
// tree has visual depth rather than looking like a flat board.

function layoutHierarchy(
    nodes: CanvasNode[],
    edges: CanvasEdge[],
    opts: Required<LayoutOptions>,
): LayoutResult {
    const ranked = rankByDegree(nodes, edges);
    const adj = adjacency(nodes, edges);
    const positions = new Map<string, Vector3>();
    if (ranked.length === 0) return { positions };

    const { origin, spacing, renderMode } = opts;
    const is3D = renderMode === '3d';

    // BFS layers
    const visited = new Set<string>();
    const layers: string[][] = [];
    const queue: { id: string; layer: number }[] = [{ id: ranked[0].id, layer: 0 }];
    visited.add(ranked[0].id);

    while (queue.length > 0) {
        const { id, layer } = queue.shift()!;
        if (!layers[layer]) layers[layer] = [];
        layers[layer].push(id);

        const neighbours = adj.get(id);
        if (neighbours) {
            for (const nId of neighbours) {
                if (!visited.has(nId)) {
                    visited.add(nId);
                    queue.push({ id: nId, layer: layer + 1 });
                }
            }
        }
    }

    // Orphans become a final layer
    const orphans = nodes.filter(n => !visited.has(n.id)).map(n => n.id);
    if (orphans.length > 0) layers.push(orphans);

    // Place layers left → right — all coords in pixel-space
    for (let l = 0; l < layers.length; l++) {
        const layer = layers[l];
        const layerHeight = layer.length * spacing;

        for (let i = 0; i < layer.length; i++) {
            const x = origin.x + l * spacing;
            const y = origin.y - layerHeight / 2 + i * spacing;
            // 3D: z fans outward per layer + per-node spread
            const z = is3D
                ? l * (spacing * 0.5) + (i - layer.length / 2) * 40
                : l;
            positions.set(layer[i], vec3(x, y, z));
        }
    }

    return { positions };
}

// ─── Public API ─────────────────────────────────────────────────

const DEFAULT_ORIGIN = vec3(400, 300, 0);
const DEFAULT_SPACING = 280; // px — enough to clear node cards

export function applyLayout(
    mode: LayoutMode,
    nodes: CanvasNode[],
    edges: CanvasEdge[],
    options: LayoutOptions,
): LayoutResult {
    const resolved: Required<LayoutOptions> = {
        renderMode: options.renderMode,
        origin: options.origin ?? DEFAULT_ORIGIN,
        spacing: options.spacing ?? DEFAULT_SPACING,
    };

    switch (mode) {
        case 'center':    return layoutCenterOut(nodes, edges, resolved);
        case 'hierarchy': return layoutHierarchy(nodes, edges, resolved);
        default:          return { positions: new Map() };
    }
}
