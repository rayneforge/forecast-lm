// ─── Canvas Physics Engine ──────────────────────────────────────
// Pure-function simulation: spring-to-target, collision repulsion,
// edge attraction, velocity integration. Zero React dependency.
//
// The caller (useCanvasPhysics) maintains bodies and calls step()
// each frame. Bodies are mutated in-place for performance.

import { CanvasEdge, Vector3 } from '../CanvasTypes';

// ─── Types ──────────────────────────────────────────────────────

export interface PhysicsBody {
    position: Vector3;
    velocity: Vector3;
    /** Where the body wants to be (set by layout or by drag release) */
    target: Vector3;
    width: number;
    height: number;
    dragging: boolean;
    locked: boolean;
}

export interface PhysicsConfig {
    /** Spring stiffness toward target (N/m) */
    springStiffness: number;
    /** Spring damping coefficient */
    springDamping: number;
    /** Repulsion force when AABBs overlap */
    repulsionStrength: number;
    /** Extra margin around each node for repulsion (px) */
    repulsionMargin: number;
    /** Edge spring stiffness (fraction of main spring) */
    edgeStiffness: number;
    /** Preferred resting distance between connected nodes (px) */
    edgeRestLength: number;
    /** Velocity decay per second (0-1, lower = more friction) */
    velocityDecay: number;
    /** Maximum velocity magnitude (px/s) */
    maxVelocity: number;
    /** Minimum velocity threshold — below this, snap to zero */
    sleepThreshold: number;
    /**
     * When set, nodes that share a layout group skip collision repulsion
     * so the layout engine's placement is respected.
     */
    layoutGroupMap?: Map<string, string>;
}

export const DEFAULT_CONFIG: PhysicsConfig = {
    springStiffness: 32,
    springDamping: 10,
    repulsionStrength: 800,
    repulsionMargin: 24,
    edgeStiffness: 10,
    edgeRestLength: 300,
    velocityDecay: 0.92,
    maxVelocity: 400,
    sleepThreshold: 0.8,
};

// ─── Math Helpers ───────────────────────────────────────────────

function clampMag(vx: number, vy: number, max: number): [number, number] {
    const mag = Math.sqrt(vx * vx + vy * vy);
    if (mag <= max || mag === 0) return [vx, vy];
    const s = max / mag;
    return [vx * s, vy * s];
}

// ─── Broad-Phase: Sort & Sweep on X ────────────────────────────
// Returns pairs of body-ids whose X extents overlap (including margin).

function broadPhase(
    ids: string[],
    bodies: Map<string, PhysicsBody>,
    margin: number,
): [string, string][] {
    // Build intervals sorted by left edge
    const intervals: { id: string; left: number; right: number }[] = [];
    for (const id of ids) {
        const b = bodies.get(id)!;
        const halfW = (b.width + margin) / 2;
        intervals.push({
            id,
            left: b.position.x - halfW,
            right: b.position.x + halfW + b.width,
        });
    }
    intervals.sort((a, b) => a.left - b.left);

    const pairs: [string, string][] = [];
    for (let i = 0; i < intervals.length; i++) {
        for (let j = i + 1; j < intervals.length; j++) {
            if (intervals[j].left > intervals[i].right) break; // swept past
            pairs.push([intervals[i].id, intervals[j].id]);
        }
    }
    return pairs;
}

// ─── AABB Overlap Check ─────────────────────────────────────────

interface Overlap {
    overlapX: number;
    overlapY: number;
}

function aabbOverlap(a: PhysicsBody, b: PhysicsBody, margin: number): Overlap | null {
    const aCx = a.position.x + a.width / 2;
    const aCy = a.position.y + a.height / 2;
    const bCx = b.position.x + b.width / 2;
    const bCy = b.position.y + b.height / 2;

    const halfWA = (a.width + margin) / 2;
    const halfHA = (a.height + margin) / 2;
    const halfWB = (b.width + margin) / 2;
    const halfHB = (b.height + margin) / 2;

    const dx = Math.abs(aCx - bCx);
    const dy = Math.abs(aCy - bCy);

    const overlapX = (halfWA + halfWB) - dx;
    const overlapY = (halfHA + halfHB) - dy;

    if (overlapX > 0 && overlapY > 0) {
        return { overlapX, overlapY };
    }
    return null;
}

// ─── Step Function ──────────────────────────────────────────────

/**
 * Advance the physics simulation by dt seconds.
 * Mutates body positions and velocities in-place.
 *
 * @returns true if any body is still moving (above sleepThreshold)
 */
export function step(
    dt: number,
    bodies: Map<string, PhysicsBody>,
    edges: CanvasEdge[],
    config: PhysicsConfig,
): boolean {
    // Clamp dt to avoid explosion after tab-switch
    const clamped = Math.min(dt, 0.05);
    if (clamped <= 0) return false;

    const ids = [...bodies.keys()];
    let awake = false;

    // ── 1. Spring-to-target for non-dragging bodies ─────────
    for (const id of ids) {
        const b = bodies.get(id)!;
        if (b.dragging || b.locked) continue;

        // Spring force: F = stiffness * (target - pos) - damping * vel
        const fx = config.springStiffness * (b.target.x - b.position.x) - config.springDamping * b.velocity.x;
        const fy = config.springStiffness * (b.target.y - b.position.y) - config.springDamping * b.velocity.y;

        b.velocity.x += fx * clamped;
        b.velocity.y += fy * clamped;
    }

    // ── 2. Collision repulsion ──────────────────────────────
    const pairs = broadPhase(ids, bodies, config.repulsionMargin);
    const lgMap = config.layoutGroupMap;

    for (const [idA, idB] of pairs) {
        // Skip repulsion for nodes in the same layout group — the layout
        // engine placed them intentionally and physics should not fight it
        if (lgMap) {
            const gA = lgMap.get(idA);
            const gB = lgMap.get(idB);
            if (gA && gA === gB) continue;
        }

        const a = bodies.get(idA)!;
        const b = bodies.get(idB)!;

        // Skip if both are locked/dragging (nothing can move)
        if ((a.locked || a.dragging) && (b.locked || b.dragging)) continue;

        const overlap = aabbOverlap(a, b, config.repulsionMargin);
        if (!overlap) continue;

        const aCx = a.position.x + a.width / 2;
        const aCy = a.position.y + a.height / 2;
        const bCx = b.position.x + b.width / 2;
        const bCy = b.position.y + b.height / 2;

        // Push along axis of minimum overlap
        let pushX = 0;
        let pushY = 0;

        if (overlap.overlapX < overlap.overlapY) {
            pushX = aCx < bCx ? -overlap.overlapX : overlap.overlapX;
        } else {
            pushY = aCy < bCy ? -overlap.overlapY : overlap.overlapY;
        }

        const force = config.repulsionStrength * clamped;

        if (!a.locked && !a.dragging) {
            a.velocity.x += pushX * force * 0.02;
            a.velocity.y += pushY * force * 0.02;
        }
        if (!b.locked && !b.dragging) {
            b.velocity.x -= pushX * force * 0.02;
            b.velocity.y -= pushY * force * 0.02;
        }
    }

    // ── 3. Edge attraction ──────────────────────────────────
    for (const edge of edges) {
        const a = bodies.get(edge.source);
        const b = bodies.get(edge.target);
        if (!a || !b) continue;

        const aCx = a.position.x + a.width / 2;
        const aCy = a.position.y + a.height / 2;
        const bCx = b.position.x + b.width / 2;
        const bCy = b.position.y + b.height / 2;

        const dx = bCx - aCx;
        const dy = bCy - aCy;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;

        // Only attract if farther than rest length
        if (dist <= config.edgeRestLength) continue;

        const excess = dist - config.edgeRestLength;
        const fx = (dx / dist) * excess * config.edgeStiffness * clamped;
        const fy = (dy / dist) * excess * config.edgeStiffness * clamped;

        if (!a.locked && !a.dragging) {
            a.velocity.x += fx;
            a.velocity.y += fy;
        }
        if (!b.locked && !b.dragging) {
            b.velocity.x -= fx;
            b.velocity.y -= fy;
        }
    }

    // ── 4. Velocity integration + decay ─────────────────────
    const decayPerFrame = Math.pow(config.velocityDecay, clamped * 60);

    for (const id of ids) {
        const b = bodies.get(id)!;
        if (b.dragging || b.locked) continue;

        // Clamp velocity
        [b.velocity.x, b.velocity.y] = clampMag(
            b.velocity.x, b.velocity.y, config.maxVelocity,
        );

        // Integrate position
        b.position.x += b.velocity.x * clamped;
        b.position.y += b.velocity.y * clamped;

        // Decay
        b.velocity.x *= decayPerFrame;
        b.velocity.y *= decayPerFrame;

        // Sleep check
        const speed = Math.abs(b.velocity.x) + Math.abs(b.velocity.y);
        const distToTarget = Math.abs(b.target.x - b.position.x) + Math.abs(b.target.y - b.position.y);

        if (speed < config.sleepThreshold && distToTarget < 1) {
            b.velocity.x = 0;
            b.velocity.y = 0;
            b.position.x = b.target.x;
            b.position.y = b.target.y;
        } else {
            awake = true;
        }
    }

    return awake;
}
