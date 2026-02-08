import React, { useRef, useState } from 'react';
import * as THREE from 'three';
import { useFrame, ThreeEvent } from '@react-three/fiber';
import { TopicBubble as TopicBubbleData, Vector3 as V3 } from '../../../canvas/CanvasTypes';
import { TextLabel, FontSize } from './TextLabel';
import { Theme, toWorld, NodeSize } from './theme3d';
import { useDrag3D } from './useDrag3D';

// ─── TopicBubble3D ──────────────────────────────────────────────
// Translucent sphere that pulses gently. Size driven by weight.
// Matches the 2D TopicBubbleComponent (weight → scale, pulse anim).

export interface TopicBubble3DProps {
    node: TopicBubbleData;
    selected?: boolean;
    onSelect: (id: string) => void;
    onMove: (id: string, pos: V3) => void;
}

export const TopicBubble3D: React.FC<TopicBubble3DProps> = ({
    node, selected, onSelect, onMove,
}) => {
    const meshRef = useRef<THREE.Mesh>(null);
    const [hovered, setHovered] = useState(false);

    const baseRadius = NodeSize.topic.radius;
    const scale = 0.8 + node.data.weight * 0.4;
    const r = baseRadius * scale;

    const px = toWorld(node.position.x);
    const py = -toWorld(node.position.y);
    const pz = toWorld(node.position.z);

    const { isDragging, bind: dragBind } = useDrag3D({
        id: node.id,
        position: [px, py, pz],
        locked: node.locked,
        onMove,
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

    return (
        <group
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
