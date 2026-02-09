import React, { useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { useFrame, ThreeEvent } from '@react-three/fiber';
import { TopicBubble as TopicBubbleData, Vector3 as V3 } from '../../../canvas/CanvasTypes';
import { TextLabel, FontSize } from './TextLabel';
import { Theme, toWorld, NodeSize } from './theme3d';
import { useDrag3D } from './useDrag3D';
import { useNodeRef } from './ScenePhysicsContext';

// ─── TopicBubble3D ──────────────────────────────────────────────
// Translucent sphere that pulses gently. Size driven by weight.
// Position driven imperatively by PhysicsTicker.

export interface TopicBubble3DProps {
    node: TopicBubbleData;
    selected?: boolean;
    onSelect: (id: string) => void;
    onMove: (id: string, pos: V3) => void;
    onDragStart?: (id: string) => void;
    onDragEnd?: (id: string, pos: V3, velocity: V3) => void;
}

export const TopicBubble3D: React.FC<TopicBubble3DProps> = ({
    node, selected, onSelect, onMove, onDragStart, onDragEnd,
}) => {
    const meshRef = useRef<THREE.Mesh>(null);
    const setGroupRef = useNodeRef(node.id);
    const groupRef = useRef<THREE.Group>(null);
    const [hovered, setHovered] = useState(false);

    const baseRadius = NodeSize.topic.radius;
    const scale = 0.8 + node.data.weight * 0.4;
    const r = baseRadius * scale;

    const px = toWorld(node.position.x);
    const py = -toWorld(node.position.y);
    const pz = toWorld(node.position.z);

    const getCurrentPosition = useCallback((): [number, number, number] => {
        if (groupRef.current) {
            const p = groupRef.current.position;
            return [p.x, p.y, p.z];
        }
        return [px, py, pz];
    }, [px, py, pz]);

    const { isDragging, bind: dragBind } = useDrag3D({
        id: node.id,
        position: [px, py, pz],
        getCurrentPosition,
        locked: node.locked,
        onMove,
        onStart: onDragStart,
        onEnd: onDragEnd,
    });

    // Gentle pulse animation
    useFrame(({ clock }) => {
        if (!meshRef.current) return;
        const t = clock.getElapsedTime();
        const pulse = 1 + Math.sin(t * 1.5 + node.data.weight * 10) * 0.03;
        meshRef.current.scale.setScalar(pulse);
    });

    const handleClick = (e: ThreeEvent<MouseEvent>) => {
        e.stopPropagation();
        onSelect(node.id);
    };

    const combinedRef = useCallback((group: THREE.Group | null) => {
        (groupRef as React.MutableRefObject<THREE.Group | null>).current = group;
        setGroupRef(group);
    }, [setGroupRef]);

    return (
        <group
            ref={combinedRef}
            position={[px, py, pz]}
            onPointerDown={dragBind.onPointerDown}
            onPointerUp={dragBind.onPointerUp}
            onPointerMove={dragBind.onPointerMove}
        >
            {/* Sphere body */}
            <mesh
                ref={meshRef}
                onClick={handleClick}
                onPointerOver={() => setHovered(true)}
                onPointerOut={() => setHovered(false)}
            >
                <sphereGeometry args={[r, 32, 24]} />
                <meshStandardMaterial
                    color={Theme.topicCyan}
                    transparent
                    opacity={0.12 + node.data.weight * 0.15}
                    roughness={0.6}
                />
            </mesh>

            {/* Wireframe shell on hover/select */}
            {(selected || hovered) && (
                <mesh>
                    <sphereGeometry args={[r + 0.02, 16, 12]} />
                    <meshBasicMaterial
                        color={Theme.selectionGlow}
                        wireframe
                        transparent
                        opacity={selected ? 0.6 : 0.25}
                    />
                </mesh>
            )}

            {/* Label (always faces camera via billboard in parent) */}
            <TextLabel
                text={node.data.label}
                position={[0, 0, r + 0.05]}
                fontSize={FontSize.headline}
                color="#00D2FF"
                anchorX="center"
                anchorY="middle"
                bold
            />
        </group>
    );
};
