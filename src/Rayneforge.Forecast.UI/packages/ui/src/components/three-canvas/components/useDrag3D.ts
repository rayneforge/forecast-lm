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
//   pointerUp    → stop dragging
//
// The drag plane is always parallel to the camera's near plane so
// it feels natural regardless of orbit angle.

export interface UseDrag3DOptions {
    /** Node id — passed to onMove */
    id: string;
    /** Current world position [x, y, z] */
    position: [number, number, number];
    /** If true, dragging is disabled */
    locked?: boolean;
    /** Called with pixel-space V3 each frame while dragging */
    onMove: (id: string, pos: V3) => void;
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
    id, position, locked, onMove,
}: UseDrag3DOptions): UseDrag3DResult {
    const { camera, gl } = useThree();
    const [isDragging, setIsDragging] = useState(false);

    // Offset between pointer hit and node origin at drag start
    const offsetRef = useRef(new THREE.Vector3());
    // The plane we project the pointer onto during drag
    const planeRef = useRef(new THREE.Plane());
    const raycaster = useRef(new THREE.Raycaster());
    const intersection = useRef(new THREE.Vector3());

    /** Set up the drag plane parallel to camera at the node's depth */
    const initPlane = useCallback((hitPoint: THREE.Vector3) => {
        const normal = new THREE.Vector3();
        camera.getWorldDirection(normal);
        // Plane at the node's position, facing the camera
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

    const onPointerDown = useCallback((e: ThreeEvent<PointerEvent>) => {
        if (locked) return;
        e.stopPropagation();
        // Capture pointer so moves outside the mesh are still tracked
        (e.nativeEvent.target as HTMLElement)?.setPointerCapture?.(e.nativeEvent.pointerId);

        const nodeOrigin = new THREE.Vector3(...position);
        const hitPoint = e.point.clone();

        initPlane(hitPoint);
        offsetRef.current.copy(nodeOrigin).sub(hitPoint);
        setIsDragging(true);
    }, [locked, position, initPlane]);

    const onPointerUp = useCallback((e: ThreeEvent<PointerEvent>) => {
        if (!isDragging) return;
        (e.nativeEvent.target as HTMLElement)?.releasePointerCapture?.(e.nativeEvent.pointerId);
        setIsDragging(false);
    }, [isDragging]);

    const onPointerMove = useCallback((e: ThreeEvent<PointerEvent>) => {
        if (!isDragging || locked) return;
        e.stopPropagation();

        const ndc = ndcFromEvent(e);
        const hit = projectPointer(ndc);
        if (!hit) return;

        const newWorld = hit.clone().add(offsetRef.current);

        // Convert world → pixel-space V3 for the state (invert the toWorld transform)
        const invScale = 1 / PX_TO_WORLD;
        onMove(id, {
            x: newWorld.x * invScale,
            y: -newWorld.y * invScale, // flip Y back
            z: newWorld.z * invScale,
        });
    }, [isDragging, locked, id, onMove, ndcFromEvent, projectPointer]);

    return {
        isDragging,
        bind: { onPointerDown, onPointerUp, onPointerMove },
    };
}
