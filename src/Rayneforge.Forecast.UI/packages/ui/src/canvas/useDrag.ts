import { useRef, useCallback, PointerEvent as ReactPointerEvent } from 'react';
import { Vector3 } from './CanvasTypes';

export interface UseDragOptions {
    /** Current position of the element (Vector3 — z preserved during 2D drag) */
    position: Vector3;
    /** Current camera zoom to scale screen→world deltas */
    zoom?: number;
    /** Called every move frame with the new position */
    onMove: (newPosition: Vector3) => void;
    /** Called when drag ends */
    onEnd?: (finalPosition: Vector3) => void;
    /** Called when drag starts */
    onStart?: () => void;
    /** Disable dragging (e.g. locked nodes) */
    disabled?: boolean;
}

/**
 * Zero-dependency pointer-event drag hook.
 * Converts screen-space deltas into world-space Vector3 moves,
 * accounting for camera zoom. Z is preserved untouched (XR mode
 * will provide its own 3-axis input).
 */
export function useDrag({ position, zoom = 1, onMove, onEnd, onStart, disabled }: UseDragOptions) {
    const dragging = useRef(false);
    const startPointer = useRef({ x: 0, y: 0 });
    const startPosition = useRef<Vector3>({ x: 0, y: 0, z: 0 });

    const onPointerDown = useCallback((e: ReactPointerEvent) => {
        if (disabled || e.button !== 0) return;
        e.stopPropagation();
        e.preventDefault();

        dragging.current = true;
        startPointer.current = { x: e.clientX, y: e.clientY };
        startPosition.current = { ...position };

        (e.target as HTMLElement).setPointerCapture(e.pointerId);
        onStart?.();
    }, [position, disabled, onStart]);

    const onPointerMove = useCallback((e: ReactPointerEvent) => {
        if (!dragging.current) return;
        e.stopPropagation();

        const dx = (e.clientX - startPointer.current.x) / zoom;
        const dy = (e.clientY - startPointer.current.y) / zoom;

        onMove({
            x: startPosition.current.x + dx,
            y: startPosition.current.y + dy,
            z: startPosition.current.z, // z stays put in 2D
        });
    }, [zoom, onMove]);

    const onPointerUp = useCallback((e: ReactPointerEvent) => {
        if (!dragging.current) return;
        dragging.current = false;

        try { (e.target as HTMLElement).releasePointerCapture(e.pointerId); } catch { /* ok */ }

        const dx = (e.clientX - startPointer.current.x) / zoom;
        const dy = (e.clientY - startPointer.current.y) / zoom;

        onEnd?.({
            x: startPosition.current.x + dx,
            y: startPosition.current.y + dy,
            z: startPosition.current.z,
        });
    }, [zoom, onEnd]);

    return {
        dragHandlers: { onPointerDown, onPointerMove, onPointerUp },
        isDragging: dragging,
    };
}
