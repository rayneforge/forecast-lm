// ─── Node Bounds Registry ───────────────────────────────────────
// Single source of truth for node dimensions (pixel-space).
// Used by: physics collision, edge endpoint resolution, 3D sizing.

import { CanvasNodeType } from '../CanvasTypes';

export interface NodeBounds {
    width: number;
    height: number;
}

const BOUNDS: Record<CanvasNodeType, NodeBounds> = {
    article:   { width: 260, height: 120 },
    note:      { width: 220, height: 100 },
    entity:    { width: 200, height: 90 },
    narrative: { width: 280, height: 130 },
    claim:     { width: 240, height: 100 },
};

/** Get the pixel-space bounding box for a node type */
export function getNodeBounds(type: CanvasNodeType): NodeBounds {
    return BOUNDS[type] ?? BOUNDS.article;
}
