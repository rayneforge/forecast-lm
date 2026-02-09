import { useRef, useCallback, useState } from 'react';
import { useThree, ThreeEvent } from '@react-three/fiber';
import * as THREE from 'three';
import { Vector3 as V3 } from '../../../canvas/CanvasTypes';
import { PX_TO_WORLD } from './theme3d';

// ─── useDrag3D ──────────────────────────────────────────────────
// Pointer-based grab interaction for R3F meshes.
//
// How it works:
//   pointerDown  → record the offset between the pointer plane hit
//                  and the node origin, start dragging
//   pointerMove  → project pointer onto the same parallel plane,
//                  apply offset, call onMove with updated V3
//   pointerUp    → stop dragging, compute fling velocity
//
// The drag plane is always parallel to the camera's near plane so
// it feels natural regardless of orbit angle.

// Circular buffer for velocity estimation
const SAMPLE_COUNT = 4;
interface PointerSample { x: number; y: number; time: number; }

export interface UseDrag3DOptions {
    /** Node id — passed to onMove */
    id: string;
    /** Current world position [x, y, z] — fallback if getCurrentPosition is not provided */
    position: [number, number, number];
    /** Live position reader — used when physics moves nodes externally */
    getCurrentPosition?: () => [number, number, number];
    /** If true, dragging is disabled */
    locked?: boolean;
    /** Called with pixel-space V3 each frame while dragging */
    onMove: (id: string, pos: V3) => void;
    /** Called when drag ends with pixel-space velocity (px/s) */
    onEnd?: (id: string, pos: V3, velocity: V3) => void;
    /** Called when drag starts */
    onStart?: (id: string) => void;
}

export interface UseDrag3DResult {
    /** Is the user currently dragging? */
    isDragging: boolean;
    /** Bind these to the <group> or <mesh> */
    bind: {
        onPointerDown: (e: ThreeEvent<PointerEvent>) => void;
        onPointerUp: (e: ThreeEvent<PointerEvent>) => void;
        onPointerMove: (e: ThreeEvent<PointerEvent>) => void;
    };
}

export function useDrag3D({
    id, position, getCurrentPosition, locked, onMove, onEnd, onStart,
}: UseDrag3DOptions): UseDrag3DResult {
    const { camera, gl } = useThree();
    const [isDragging, setIsDragging] = useState(false);

    // Offset between pointer hit and node origin at drag start
    const offsetRef = useRef(new THREE.Vector3());
    // The plane we project the pointer onto during drag
    const planeRef = useRef(new THREE.Plane());
    const raycaster = useRef(new THREE.Raycaster());
    const intersection = useRef(new THREE.Vector3());

    // Velocity tracking
    const samplesRef = useRef<PointerSample[]>([]);
    const sampleIdxRef = useRef(0);

    /** Set up the drag plane parallel to camera at the node's depth */
    const initPlane = useCallback((hitPoint: THREE.Vector3) => {
        const normal = new THREE.Vector3();
        camera.getWorldDirection(normal);
        planeRef.current.setFromNormalAndCoplanarPoint(normal, hitPoint);
    }, [camera]);

    const projectPointer = useCallback((ndc: THREE.Vector2): THREE.Vector3 | null => {
        raycaster.current.setFromCamera(ndc, camera);
        const hit = raycaster.current.ray.intersectPlane(planeRef.current, intersection.current);
        return hit;
    }, [camera]);

    const ndcFromEvent = useCallback((e: ThreeEvent<PointerEvent>): THREE.Vector2 => {
        const rect = gl.domElement.getBoundingClientRect();
        return new THREE.Vector2(
            ((e.nativeEvent.clientX - rect.left) / rect.width) * 2 - 1,
            -((e.nativeEvent.clientY - rect.top) / rect.height) * 2 + 1,
        );
    }, [gl]);

    /** Convert world→pixel V3 */
    const worldToPixel = (world: THREE.Vector3): V3 => {
        const invScale = 1 / PX_TO_WORLD;
        return { x: world.x * invScale, y: -world.y * invScale, z: world.z * invScale };
    };

    const onPointerDown = useCallback((e: ThreeEvent<PointerEvent>) => {
        if (locked) return;
        e.stopPropagation();
        (e.nativeEvent.target as HTMLElement)?.setPointerCapture?.(e.nativeEvent.pointerId);

        // Read live position if available (physics-driven), else use prop
        const pos = getCurrentPosition?.() ?? position;
        const nodeOrigin = new THREE.Vector3(...pos);
        const hitPoint = e.point.clone();

        initPlane(hitPoint);
        offsetRef.current.copy(nodeOrigin).sub(hitPoint);
        setIsDragging(true);

        // Reset velocity samples
        samplesRef.current = [];
        sampleIdxRef.current = 0;

        onStart?.(id);
    }, [locked, position, getCurrentPosition, initPlane, id, onStart]);

    const onPointerUp = useCallback((e: ThreeEvent<PointerEvent>) => {
        if (!isDragging) return;
        (e.nativeEvent.target as HTMLElement)?.releasePointerCapture?.(e.nativeEvent.pointerId);
        setIsDragging(false);

        // Compute final position
        const ndc = ndcFromEvent(e);
        const hit = projectPointer(ndc);
        const finalPixel: V3 = hit
            ? worldToPixel(hit.clone().add(offsetRef.current))
            : { x: position[0] / PX_TO_WORLD, y: -position[1] / PX_TO_WORLD, z: position[2] / PX_TO_WORLD };

        // Compute velocity from samples
        let velocity: V3 = { x: 0, y: 0, z: 0 };
        const buf = samplesRef.current;
        if (buf.length >= 2) {
            const sorted = [...buf].sort((a, b) => a.time - b.time);
            const oldest = sorted[0];
            const newest = sorted[sorted.length - 1];
            const elapsed = (newest.time - oldest.time) / 1000;
            if (elapsed > 0.005) {
                velocity = {
                    x: (newest.x - oldest.x) / elapsed,
                    y: (newest.y - oldest.y) / elapsed,
                    z: 0,
                };
            }
        }

        onEnd?.(id, finalPixel, velocity);
    }, [isDragging, id, onEnd, ndcFromEvent, projectPointer, position]);

    const onPointerMove = useCallback((e: ThreeEvent<PointerEvent>) => {
        if (!isDragging || locked) return;
        e.stopPropagation();

        const ndc = ndcFromEvent(e);
        const hit = projectPointer(ndc);
        if (!hit) return;

        const newWorld = hit.clone().add(offsetRef.current);
        const pixelPos = worldToPixel(newWorld);

        // Record velocity sample (pixel-space)
        const sample: PointerSample = { x: pixelPos.x, y: pixelPos.y, time: performance.now() };
        if (samplesRef.current.length < SAMPLE_COUNT) {
            samplesRef.current.push(sample);
        } else {
            samplesRef.current[sampleIdxRef.current % SAMPLE_COUNT] = sample;
        }
        sampleIdxRef.current++;

        onMove(id, pixelPos);
    }, [isDragging, locked, id, onMove, ndcFromEvent, projectPointer]);

    return {
        isDragging,
        bind: { onPointerDown, onPointerUp, onPointerMove },
    };
}
