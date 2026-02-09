// ─── Canvas Layout Algorithms ───────────────────────────────────
//
// Layout modes for the canvas:
//
//   1. Center-Out (Radial) — highest-ranked / most-connected nodes
//      at the center, radiating outward in concentric rings.
//
//   2. Propagate — BFS fan-out from a specific root node (triggered
//      from "Visualize" in the detail pane). Falls back to
//      highest-degree if no root is specified.
//
//   3. Group-by-Date — nodes grouped into month buckets, columns
//      flowing left → right chronologically.
//
//   4. Group-by-Location — articles grouped by their top-level
//      geographic location path (from narrative extraction).
//
//   5. Group-by-Entity — nodes clustered around the entity nodes
//      they connect to via edges.
//
// IMPORTANT — positions are ALWAYS in pixel-space.  The 3D
// rendering components apply toWorld() (×0.01) on their own.
//
// All accept the full graph and return a position map.
// The caller dispatches APPLY_LAYOUT for each entry.

import {
    CanvasNode, CanvasEdge, CanvasRenderMode, Vector3, vec3,
} from './CanvasTypes';
import { getNodeBounds } from './physics/nodeBounds';

// ─── Public types ───────────────────────────────────────────────

export type LayoutMode =
    | 'center'
    | 'propagate'
    | 'group-date'
    | 'group-location'
    | 'group-entity';

/** Ephemeral visual group produced by a group-by layout algorithm */
export interface LayoutGroup {
    id: string;
    label: string;
    nodeIds: string[];
    color?: string;
    /** Pre-computed bounding box (pixel-space). GroupFrame can use this directly. */
    bounds?: { x: number; y: number; w: number; h: number };
}

export interface LayoutOptions {
    /** Active render mode — 3D layouts use the z-axis for depth */
    renderMode: CanvasRenderMode;
    /** Viewport centre in pixel-space (default 400,300) */
    origin?: Vector3;
    /** Base spacing between nodes in pixels (default 280) */
    spacing?: number;
    /** Root node for propagate layout (detail-pane "Visualize") */
    rootNodeId?: string;
    /**
     * Drill depth for group-by-date and group-by-location.
     *   Date:     0 = year, 1 = month (default), 2 = day
     *   Location: 0 = top-level (/world), 1 = region (default), 2+ = deeper
     */
    depth?: number;
}

export interface LayoutResult {
    positions: Map<string, Vector3>;
    /** Visual groups to render as GroupFrames (only for group-by modes) */
    groups: LayoutGroup[];
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

/** BFS from a root, returning layers of node ids */
function bfsLayers(rootId: string, adj: Map<string, Set<string>>, allNodes: CanvasNode[]): string[][] {
    const visited = new Set<string>();
    const layers: string[][] = [];
    const queue: { id: string; layer: number }[] = [{ id: rootId, layer: 0 }];
    visited.add(rootId);

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

    // Disconnected nodes → final layer
    const orphans = allNodes.filter(n => !visited.has(n.id)).map(n => n.id);
    if (orphans.length > 0) layers.push(orphans);

    return layers;
}

/** Extract a sortable date from any node that carries one */
function getNodeDate(n: CanvasNode): Date | null {
    if (n.type === 'article') return new Date(n.data.publishedAt);
    if (n.type === 'note')    return new Date(n.data.createdAt);
    return null;
}

/**
 * Create a date bucket key at the given depth.
 *   depth 0 → "2025"
 *   depth 1 → "2025-06"
 *   depth 2 → "2025-06-15"
 */
function dateBucketKey(d: Date, depth: number): string {
    const y = String(d.getFullYear());
    if (depth === 0) return y;
    const m = `${y}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    if (depth <= 1) return m;
    return `${m}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Pretty label for a date bucket key */
function dateBucketLabel(key: string): string {
    if (key === '~undated') return 'Undated';
    return key;                       // "2025", "2025-06", "2025-06-15" are clear enough
}

/**
 * Get the location bucket for an article node at a given depth.
 *   depth 0 → "/world"
 *   depth 1 → "/world/europe"
 *   depth 2 → "/world/europe/western-europe"
 */
function getLocationBucket(n: CanvasNode, depth: number): string {
    if (n.type === 'article' && n.data.locations && n.data.locations.length > 0) {
        const segments = n.data.locations[0].path.split('/').filter(Boolean);
        const take = Math.min(depth + 1, segments.length);
        if (take > 0) return '/' + segments.slice(0, take).join('/');
        return n.data.locations[0].path;
    }
    return '_no-location';
}

/** Pretty label for a location bucket key */
function locationBucketLabel(key: string): string {
    if (key === '_no-location') return 'No Location';
    // Show just the last segment, capitalised
    const parts = key.split('/').filter(Boolean);
    const last = parts[parts.length - 1] ?? key;
    return last.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

// ─── Node sizing (delegates to single source of truth) ──────────

/** Card width per node type in pixels */
function nodeWidth(n: CanvasNode): number {
    return getNodeBounds(n.type).width;
}

/** Card height per node type in pixels */
function nodeHeight(n: CanvasNode): number {
    return getNodeBounds(n.type).height;
}

// ─── Layout: place grouped buckets in a grid ────────────────────

interface ResolvedOpts {
    renderMode: CanvasRenderMode;
    origin: Vector3;
    spacing: number;
    rootNodeId?: string;
    depth: number;
}

// Subtle palette for auto-generated group frames
const BUCKET_COLORS = [
    '#00d2ff', '#7b61ff', '#ff6b6b', '#ffa94d', '#51cf66',
    '#339af0', '#cc5de8', '#20c997', '#fcc419', '#ff8787',
];

/** Padding inside each GroupFrame (must match getBounds padding) */
const GROUP_PADDING = 32;
/** Extra top padding for the group label row */
const GROUP_LABEL_H = 36;
/** Gap between adjacent GroupFrame bounding boxes */
const INTER_GROUP_GAP = 80;
/** Horizontal gap between cards inside a group row */
const CELL_GAP_X = 24;
/** Vertical gap between rows inside a group */
const CELL_GAP_Y = 20;
/** Max items per row before wrapping to the next row (flex-wrap style) */
const MAX_COLS_PER_GROUP = 3;

/**
 * Place nodes inside groups using a wrapping flow layout (like CSS flex-wrap).
 * Groups tile in a grid pattern: groups wrap to new rows once they exceed
 * the viewport-fit budget (MAX_GROUPS_PER_ROW). Each group gets a
 * pre-computed bounding box so GroupFrame doesn't need to re-derive it.
 */

/** Max groups per row before wrapping to a new row of groups */
const MAX_GROUPS_PER_ROW = 3;

function placeGroupedBuckets(
    buckets: Map<string, CanvasNode[]>,
    sortedKeys: string[],
    labelFn: (key: string) => string,
    opts: ResolvedOpts,
): { positions: Map<string, Vector3>; groups: LayoutGroup[] } {
    const positions = new Map<string, Vector3>();
    const groups: LayoutGroup[] = [];
    const { origin, renderMode } = opts;
    const is3D = renderMode === '3d';

    // Pre-compute each group's inner size so we can lay them out in a grid
    interface GroupMeasure {
        key: string;
        items: CanvasNode[];
        flowCols: number;
        colWidths: number[];
        rowHeights: number[];
        innerW: number;
        innerH: number;
        groupW: number;
        groupH: number;
    }

    const measures: GroupMeasure[] = sortedKeys.map(key => {
        const items = buckets.get(key)!;
        const flowCols = Math.min(items.length, MAX_COLS_PER_GROUP);
        const sizes = items.map(n => ({ w: nodeWidth(n), h: nodeHeight(n) }));

        const colWidths: number[] = [];
        for (let c = 0; c < flowCols; c++) {
            let maxW = 0;
            for (let i = c; i < items.length; i += flowCols) {
                maxW = Math.max(maxW, sizes[i].w);
            }
            colWidths.push(maxW);
        }

        const rowCount = Math.ceil(items.length / flowCols);
        const rowHeights: number[] = [];
        for (let r = 0; r < rowCount; r++) {
            let maxH = 0;
            for (let c = 0; c < flowCols; c++) {
                const idx = r * flowCols + c;
                if (idx < items.length) maxH = Math.max(maxH, sizes[idx].h);
            }
            rowHeights.push(maxH);
        }

        const innerW = colWidths.reduce((s, w) => s + w, 0) + Math.max(0, flowCols - 1) * CELL_GAP_X;
        const innerH = rowHeights.reduce((s, h) => s + h, 0) + Math.max(0, rowCount - 1) * CELL_GAP_Y;
        const groupW = innerW + GROUP_PADDING * 2;
        const groupH = innerH + GROUP_PADDING * 2 + GROUP_LABEL_H;

        return { key, items, flowCols, colWidths, rowHeights, innerW, innerH, groupW, groupH };
    });

    // Lay groups out in a grid: MAX_GROUPS_PER_ROW per row
    let curX = origin.x;
    let curY = origin.y;
    let rowMaxH = 0;
    let colInRow = 0;
    let globalIdx = 0;

    for (const m of measures) {
        if (colInRow >= MAX_GROUPS_PER_ROW) {
            // Wrap to next row of groups
            curX = origin.x;
            curY += rowMaxH + INTER_GROUP_GAP;
            rowMaxH = 0;
            colInRow = 0;
        }

        const groupX = curX;
        const groupY = curY;
        const nodeIds: string[] = [];

        // Place each node inside the flow grid
        let cellY = groupY + GROUP_PADDING + GROUP_LABEL_H;
        const rowCount = m.rowHeights.length;
        for (let r = 0; r < rowCount; r++) {
            let cellX = groupX + GROUP_PADDING;
            for (let c = 0; c < m.flowCols; c++) {
                const idx = r * m.flowCols + c;
                if (idx >= m.items.length) break;

                const z = is3D ? globalIdx * 30 + Math.sin(idx) * 20 : globalIdx;
                positions.set(m.items[idx].id, vec3(cellX, cellY, z));
                nodeIds.push(m.items[idx].id);

                cellX += m.colWidths[c] + CELL_GAP_X;
            }
            cellY += m.rowHeights[r] + CELL_GAP_Y;
        }

        groups.push({
            id: `layout-group-${globalIdx}`,
            label: labelFn(m.key),
            nodeIds,
            color: BUCKET_COLORS[globalIdx % BUCKET_COLORS.length],
            bounds: { x: groupX, y: groupY, w: m.groupW, h: m.groupH },
        });

        curX += m.groupW + INTER_GROUP_GAP;
        rowMaxH = Math.max(rowMaxH, m.groupH);
        colInRow++;
        globalIdx++;
    }

    return { positions, groups };
}

// ─── Depth label helpers ────────────────────────────────────────

const DATE_DEPTH_LABELS  = ['Year', 'Month', 'Day'];
const LOC_DEPTH_LABELS   = ['Top-level', 'Region', 'Sub-region', 'Country', 'Province', 'City'];

/**
 * Human-readable label for the current drill depth.
 * Returns e.g. "Month" for group-date depth 1, "Region" for group-location depth 1.
 */
export function getDepthLabel(mode: LayoutMode, depth: number): string {
    if (mode === 'group-date')     return DATE_DEPTH_LABELS[depth] ?? `Level ${depth}`;
    if (mode === 'group-location') return LOC_DEPTH_LABELS[depth]  ?? `Level ${depth}`;
    return `Level ${depth}`;
}

// ─── 1. Center-Out (Radial) ─────────────────────────────────────

function layoutCenterOut(
    nodes: CanvasNode[],
    edges: CanvasEdge[],
    opts: ResolvedOpts,
): LayoutResult {
    const ranked = rankByDegree(nodes, edges);
    const adj = adjacency(nodes, edges);
    const positions = new Map<string, Vector3>();
    if (ranked.length === 0) return { positions, groups: [] };

    const { origin, spacing, renderMode } = opts;
    const is3D = renderMode === '3d';

    const rings = bfsLayers(ranked[0].id, adj, nodes);

    // Compute the max node dimension so we can guarantee no overlap
    const nodeById = new Map(nodes.map(n => [n.id, n]));
    const maxNodeDiag = Math.max(
        ...nodes.map(n => Math.sqrt(nodeWidth(n) ** 2 + nodeHeight(n) ** 2)),
        200,
    );

    for (let r = 0; r < rings.length; r++) {
        const ring = rings[r];

        if (r === 0) {
            // Centre node
            for (const id of ring) {
                positions.set(id, vec3(origin.x, origin.y, 0));
            }
            continue;
        }

        // Compute radius so nodes in this ring don't overlap:
        // radius must be large enough that the arc between neighbours ≥ maxNodeDiag
        const minArcRadius = (ring.length * (maxNodeDiag + 40)) / (2 * Math.PI);
        const baseRadius = r * spacing;
        const radius = Math.max(baseRadius, minArcRadius);

        for (let i = 0; i < ring.length; i++) {
            const angle = (2 * Math.PI * i) / ring.length;
            const x = origin.x + Math.cos(angle) * radius;
            const y = origin.y + Math.sin(angle) * radius;
            const z = is3D
                ? -r * (spacing * 0.6) + Math.sin(angle) * 30
                : r;
            positions.set(ring[i], vec3(x, y, z));
        }
    }

    return { positions, groups: [] };
}

// ─── 2. Propagate (Fan-out from a chosen root) ─────────────────
//
// Like center-out but starts from a SPECIFIC node (the one the
// user clicked "Visualize" on). Falls back to highest-degree if
// no rootNodeId is provided.

function layoutPropagate(
    nodes: CanvasNode[],
    edges: CanvasEdge[],
    opts: ResolvedOpts,
): LayoutResult {
    const adj = adjacency(nodes, edges);
    const positions = new Map<string, Vector3>();
    if (nodes.length === 0) return { positions, groups: [] };

    const { origin, spacing, renderMode, rootNodeId } = opts;
    const is3D = renderMode === '3d';

    // Resolve root — prefer explicit, fallback to highest degree
    let rootId = rootNodeId;
    if (!rootId || !adj.has(rootId)) {
        const ranked = rankByDegree(nodes, edges);
        rootId = ranked[0]?.id;
    }
    if (!rootId) return { positions, groups: [] };

    const rings = bfsLayers(rootId, adj, nodes);

    // Compute max node diagonal for overlap prevention
    const maxNodeDiag = Math.max(
        ...nodes.map(n => Math.sqrt(nodeWidth(n) ** 2 + nodeHeight(n) ** 2)),
        200,
    );

    // Fan-out radially — same geometry as center-out with overlap guard
    for (let r = 0; r < rings.length; r++) {
        const ring = rings[r];

        if (r === 0) {
            for (const id of ring) {
                positions.set(id, vec3(origin.x, origin.y, 0));
            }
            continue;
        }

        const minArcRadius = (ring.length * (maxNodeDiag + 40)) / (2 * Math.PI);
        const baseRadius = r * spacing;
        const radius = Math.max(baseRadius, minArcRadius);

        for (let i = 0; i < ring.length; i++) {
            const angle = (2 * Math.PI * i) / ring.length;
            const x = origin.x + Math.cos(angle) * radius;
            const y = origin.y + Math.sin(angle) * radius;
            const z = is3D
                ? -r * (spacing * 0.5) + Math.sin(angle) * 25
                : r;
            positions.set(ring[i], vec3(x, y, z));
        }
    }

    return { positions, groups: [] };
}

// ─── 3. Group-by-Date ───────────────────────────────────────────
//
// Dated nodes grouped into month buckets, columns flowing L→R.
// Non-dated nodes placed in a trailing column.

function layoutGroupDate(
    nodes: CanvasNode[],
    _edges: CanvasEdge[],
    opts: ResolvedOpts,
): LayoutResult {
    if (nodes.length === 0) return { positions: new Map(), groups: [] };

    const depth = opts.depth; // 0=year, 1=month, 2=day

    const dated: { node: CanvasNode; date: Date }[] = [];
    const undated: CanvasNode[] = [];
    for (const n of nodes) {
        const d = getNodeDate(n);
        if (d && !isNaN(d.getTime())) dated.push({ node: n, date: d });
        else undated.push(n);
    }

    dated.sort((a, b) => a.date.getTime() - b.date.getTime());

    const buckets = new Map<string, CanvasNode[]>();
    for (const { node, date } of dated) {
        const key = dateBucketKey(date, depth);
        if (!buckets.has(key)) buckets.set(key, []);
        buckets.get(key)!.push(node);
    }

    const sortedKeys = Array.from(buckets.keys()).sort();

    // Append undated bucket at the end
    if (undated.length > 0) {
        const undatedKey = '~undated';
        buckets.set(undatedKey, undated);
        sortedKeys.push(undatedKey);
    }

    return placeGroupedBuckets(buckets, sortedKeys, dateBucketLabel, opts);
}

// ─── 4. Group-by-Location ───────────────────────────────────────
//
// Articles grouped by their top-level geographic scope path.
// Non-article or location-less nodes fall into "_no-location".

function layoutGroupLocation(
    nodes: CanvasNode[],
    _edges: CanvasEdge[],
    opts: ResolvedOpts,
): LayoutResult {
    if (nodes.length === 0) return { positions: new Map(), groups: [] };

    const depth = opts.depth; // 0=top-level, 1=region, 2+=deeper

    const buckets = new Map<string, CanvasNode[]>();
    for (const n of nodes) {
        const key = getLocationBucket(n, depth);
        if (!buckets.has(key)) buckets.set(key, []);
        buckets.get(key)!.push(n);
    }

    // Sort: real locations alphabetically, _no-location at end
    const sortedKeys = Array.from(buckets.keys()).sort((a, b) => {
        if (a === '_no-location') return 1;
        if (b === '_no-location') return -1;
        return a.localeCompare(b);
    });

    return placeGroupedBuckets(buckets, sortedKeys, locationBucketLabel, opts);
}

// ─── 5. Group-by-Entity ─────────────────────────────────────────
//
// Clusters nodes around the entity nodes they connect to.
// Entity nodes become column anchors; connected non-entity nodes
// stack below. Orphans (no entity connection) go to a final column.

function layoutGroupEntity(
    nodes: CanvasNode[],
    edges: CanvasEdge[],
    opts: ResolvedOpts,
): LayoutResult {
    if (nodes.length === 0) return { positions: new Map(), groups: [] };

    const adj = adjacency(nodes, edges);

    // Find entity nodes — these become cluster anchors
    const entityNodes = nodes.filter(n => n.type === 'entity');
    const placed = new Set<string>();
    const buckets = new Map<string, CanvasNode[]>();
    const nodeById = new Map(nodes.map(n => [n.id, n]));

    for (const entity of entityNodes) {
        const key = entity.id;
        const members: CanvasNode[] = [entity];
        placed.add(entity.id);

        const neighbours = adj.get(entity.id);
        if (neighbours) {
            for (const nId of neighbours) {
                if (!placed.has(nId)) {
                    const node = nodeById.get(nId);
                    if (node && node.type !== 'entity') {
                        members.push(node);
                        placed.add(nId);
                    }
                }
            }
        }

        buckets.set(key, members);
    }

    // Orphans — nodes not connected to any entity
    const orphans = nodes.filter(n => !placed.has(n.id));
    if (orphans.length > 0) {
        buckets.set('_unlinked', orphans);
    }

    // Sort by entity name, orphans at end
    const sortedKeys = Array.from(buckets.keys()).sort((a, b) => {
        if (a === '_unlinked') return 1;
        if (b === '_unlinked') return -1;
        const na = nodeById.get(a);
        const nb = nodeById.get(b);
        const nameA = na?.type === 'entity' ? na.data.name : a;
        const nameB = nb?.type === 'entity' ? nb.data.name : b;
        return nameA.localeCompare(nameB);
    });

    const entityLabel = (key: string): string => {
        if (key === '_unlinked') return 'Unlinked';
        const ent = nodeById.get(key);
        return ent?.type === 'entity' ? ent.data.name : key;
    };

    return placeGroupedBuckets(buckets, sortedKeys, entityLabel, opts);
}

// ─── Public API ─────────────────────────────────────────────────

const DEFAULT_ORIGIN = vec3(400, 300, 0);
const DEFAULT_SPACING = 320; // px — generous spacing to clear node cards

export function applyLayout(
    mode: LayoutMode,
    nodes: CanvasNode[],
    edges: CanvasEdge[],
    options: LayoutOptions,
): LayoutResult {
    const resolved: ResolvedOpts = {
        renderMode: options.renderMode,
        origin: options.origin ?? DEFAULT_ORIGIN,
        spacing: options.spacing ?? DEFAULT_SPACING,
        rootNodeId: options.rootNodeId,
        depth: options.depth ?? 1,
    };

    switch (mode) {
        case 'center':         return layoutCenterOut(nodes, edges, resolved);
        case 'propagate':      return layoutPropagate(nodes, edges, resolved);
        case 'group-date':     return layoutGroupDate(nodes, edges, resolved);
        case 'group-location': return layoutGroupLocation(nodes, edges, resolved);
        case 'group-entity':   return layoutGroupEntity(nodes, edges, resolved);
        default:               return { positions: new Map(), groups: [] };
    }
}

// ─── Initial overlap resolution ─────────────────────────────────

/**
 * Check whether any pair of nodes overlap (axis-aligned bbox test).
 * Returns true if at least one pair collides.
 */
export function hasOverlap(nodes: CanvasNode[]): boolean {
    for (let i = 0; i < nodes.length; i++) {
        const a = nodes[i];
        const aw = nodeWidth(a);
        const ah = nodeHeight(a);
        for (let j = i + 1; j < nodes.length; j++) {
            const b = nodes[j];
            const bw = nodeWidth(b);
            const bh = nodeHeight(b);
            if (
                a.position.x < b.position.x + bw &&
                a.position.x + aw > b.position.x &&
                a.position.y < b.position.y + bh &&
                a.position.y + ah > b.position.y
            ) {
                return true;
            }
        }
    }
    return false;
}

/**
 * Spread overlapping nodes into a clean grid layout.
 * Called once on initial mount when story/mock positions clash.
 * Returns a position map the caller can dispatch via APPLY_LAYOUT.
 */
export function autoSpreadNodes(
    nodes: CanvasNode[],
    origin: Vector3 = DEFAULT_ORIGIN,
): Map<string, Vector3> {
    const positions = new Map<string, Vector3>();
    if (nodes.length === 0) return positions;

    // Use a generous grid with 3 columns
    const cols = Math.min(nodes.length, 3);
    const GAP_X = 40;
    const GAP_Y = 32;

    // Compute per-column widths and per-row heights
    const rowCount = Math.ceil(nodes.length / cols);
    const colWidths: number[] = Array(cols).fill(0);
    const rowHeights: number[] = Array(rowCount).fill(0);

    for (let i = 0; i < nodes.length; i++) {
        const c = i % cols;
        const r = Math.floor(i / cols);
        colWidths[c] = Math.max(colWidths[c], nodeWidth(nodes[i]));
        rowHeights[r] = Math.max(rowHeights[r], nodeHeight(nodes[i]));
    }

    // Total grid size for centering
    const totalW = colWidths.reduce((s, w) => s + w, 0) + (cols - 1) * GAP_X;
    const totalH = rowHeights.reduce((s, h) => s + h, 0) + (rowCount - 1) * GAP_Y;
    const startX = origin.x - totalW / 2;
    const startY = origin.y - totalH / 2;

    for (let i = 0; i < nodes.length; i++) {
        const c = i % cols;
        const r = Math.floor(i / cols);
        const x = startX + colWidths.slice(0, c).reduce((s, w) => s + w + GAP_X, 0);
        const y = startY + rowHeights.slice(0, r).reduce((s, h) => s + h + GAP_Y, 0);
        positions.set(nodes[i].id, vec3(x, y, i));
    }

    return positions;
}
