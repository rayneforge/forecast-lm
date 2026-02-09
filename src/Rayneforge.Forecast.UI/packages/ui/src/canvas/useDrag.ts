import { useRef, useCallback, PointerEvent as ReactPointerEvent } from 'react';
import { Vector3 } from './CanvasTypes';

export interface UseDragOptions {
    /** Current position of the element (Vector3 — z preserved during 2D drag) */
    position: Vector3;
    /** Current camera zoom to scale screen→world deltas */
    zoom?: number;
    /** Called every move frame with the new position */
    onMove: (newPosition: Vector3) => void;
    /** Called when drag ends — velocity is the fling vector (px/s) */
    onEnd?: (finalPosition: Vector3, velocity: Vector3) => void;
    /** Called when drag starts */
    onStart?: () => void;
    /** Disable dragging (e.g. locked nodes) */
    disabled?: boolean;
}

// Circular buffer size for velocity estimation
const SAMPLE_COUNT = 4;

interface PointerSample { x: number; y: number; time: number; }

/**
 * Zero-dependency pointer-event drag hook.
 * Converts screen-space deltas into world-space Vector3 moves,
 * accounting for camera zoom. Z is preserved untouched (XR mode
 * will provide its own 3-axis input).
 *
 * Tracks pointer velocity via a circular buffer and passes it
 * to onEnd for fling/momentum behaviour.
 */
export function useDrag({ position, zoom = 1, onMove, onEnd, onStart, disabled }: UseDragOptions) {
    const dragging = useRef(false);
    const startPointer = useRef({ x: 0, y: 0 });
    const startPosition = useRef<Vector3>({ x: 0, y: 0, z: 0 });

    // Velocity tracking — circular buffer of recent pointer samples
    const samples = useRef<PointerSample[]>([]);
    const sampleIdx = useRef(0);

    const onPointerDown = useCallback((e: ReactPointerEvent) => {
        if (disabled || e.button !== 0) return;
        e.stopPropagation();
        e.preventDefault();

        dragging.current = true;
        startPointer.current = { x: e.clientX, y: e.clientY };
        startPosition.current = { ...position };

        // Reset velocity samples
        samples.current = [];
        sampleIdx.current = 0;

        (e.target as HTMLElement).setPointerCapture(e.pointerId);
        onStart?.();
    }, [position, disabled, onStart]);

    const onPointerMove = useCallback((e: ReactPointerEvent) => {
        if (!dragging.current) return;
        e.stopPropagation();

        const dx = (e.clientX - startPointer.current.x) / zoom;
        const dy = (e.clientY - startPointer.current.y) / zoom;

        const newPos: Vector3 = {
            x: startPosition.current.x + dx,
            y: startPosition.current.y + dy,
            z: startPosition.current.z,
        };

        // Record sample for velocity estimation
        const sample: PointerSample = { x: newPos.x, y: newPos.y, time: performance.now() };
        if (samples.current.length < SAMPLE_COUNT) {
            samples.current.push(sample);
        } else {
            samples.current[sampleIdx.current % SAMPLE_COUNT] = sample;
        }
        sampleIdx.current++;

        onMove(newPos);
    }, [zoom, onMove]);

    const onPointerUp = useCallback((e: ReactPointerEvent) => {
        if (!dragging.current) return;
        dragging.current = false;

        try { (e.target as HTMLElement).releasePointerCapture(e.pointerId); } catch { /* ok */ }

        const dx = (e.clientX - startPointer.current.x) / zoom;
        const dy = (e.clientY - startPointer.current.y) / zoom;

        const finalPos: Vector3 = {
            x: startPosition.current.x + dx,
            y: startPosition.current.y + dy,
            z: startPosition.current.z,
        };

        // Compute velocity from recent samples
        let velocity: Vector3 = { x: 0, y: 0, z: 0 };
        const buf = samples.current;
        if (buf.length >= 2) {
            // Find oldest and newest samples
            const sorted = [...buf].sort((a, b) => a.time - b.time);
            const oldest = sorted[0];
            const newest = sorted[sorted.length - 1];
            const elapsed = (newest.time - oldest.time) / 1000; // seconds
            if (elapsed > 0.005) { // at least 5ms of data
                velocity = {
                    x: (newest.x - oldest.x) / elapsed,
                    y: (newest.y - oldest.y) / elapsed,
                    z: 0,
                };
            }
        }

        onEnd?.(finalPos, velocity);
    }, [zoom, onEnd]);

    return {
        dragHandlers: { onPointerDown, onPointerMove, onPointerUp },
        isDragging: dragging,
    };
}
