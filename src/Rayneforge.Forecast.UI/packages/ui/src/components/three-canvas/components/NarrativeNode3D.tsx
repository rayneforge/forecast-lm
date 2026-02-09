import React, { useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { ThreeEvent } from '@react-three/fiber';
import { RoundedBox } from '@react-three/drei';
import { NarrativeNode as NarrativeNodeData, Vector3 as V3 } from '../../../canvas/CanvasTypes';
import { TextLabel, FontSize } from './TextLabel';
import { Theme, toWorld, NodeSize } from './theme3d';
import { useDrag3D } from './useDrag3D';
import { useNodeRef } from './ScenePhysicsContext';

// ─── NarrativeNode3D ────────────────────────────────────────────
// Green-accented card with category pill, label, posture chips.
// Position driven imperatively by PhysicsTicker.

export interface NarrativeNode3DProps {
    node: NarrativeNodeData;
    selected?: boolean;
    onSelect: (id: string) => void;
    onMove: (id: string, pos: V3) => void;
    onDragStart?: (id: string) => void;
    onDragEnd?: (id: string, pos: V3, velocity: V3) => void;
}

const categoryColor = (cat: string): number =>
    Theme.narrativeColors[cat] ?? 0x3FB950;

export const NarrativeNode3D: React.FC<NarrativeNode3DProps> = ({
    node, selected, onSelect, onMove, onDragStart, onDragEnd,
}) => {
    const { w, h, depth } = NodeSize.narrative;
    const setGroupRef = useNodeRef(node.id);
    const groupRef = useRef<THREE.Group>(null);
    const [hovered, setHovered] = useState(false);

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

    const handleClick = (e: ThreeEvent<MouseEvent>) => {
        e.stopPropagation();
        onSelect(node.id);
    };

    const combinedRef = useCallback((group: THREE.Group | null) => {
        (groupRef as React.MutableRefObject<THREE.Group | null>).current = group;
        setGroupRef(group);
    }, [setGroupRef]);

    const accent = categoryColor(node.data.category);

    return (
        <group
            ref={combinedRef}
            position={[px, py, pz]}
            onClick={handleClick}
            onPointerOver={() => setHovered(true)}
            onPointerOut={() => setHovered(false)}
            onPointerDown={dragBind.onPointerDown}
            onPointerUp={dragBind.onPointerUp}
            onPointerMove={dragBind.onPointerMove}
        >
            {/* Card body */}
            <RoundedBox args={[w, h, depth]} radius={0.05} smoothness={4}>
                <meshStandardMaterial
                    color={Theme.canvasSurface}
                    transparent
                    opacity={0.92}
                />
            </RoundedBox>

            {/* Category-coloured top accent bar */}
            <mesh position={[0, h / 2 - 0.02, depth / 2 + 0.005]}>
                <boxGeometry args={[w - 0.12, 0.03, 0.01]} />
                <meshBasicMaterial color={accent} />
            </mesh>

            {/* Selection ring */}
            {(selected || hovered) && (
                <RoundedBox args={[w + 0.04, h + 0.04, depth * 0.5]} radius={0.06} smoothness={4}>
                    <meshBasicMaterial
                        color={selected ? accent : Theme.accentHover}
                        transparent
                        opacity={selected ? 0.5 : 0.2}
                        wireframe={!selected}
                    />
                </RoundedBox>
            )}

            {/* Category pill */}
            <group position={[-w / 2 + 0.5, h / 2 - 0.18, depth / 2 + 0.01]}>
                <RoundedBox args={[0.85, 0.18, 0.01]} radius={0.08} smoothness={3}>
                    <meshBasicMaterial color={accent} transparent opacity={0.2} />
                </RoundedBox>
                <TextLabel
                    text={node.data.category}
                    position={[0, 0, 0.01]}
                    fontSize={FontSize.meta}
                    color={`#${accent.toString(16).padStart(6, '0')}`}
                    anchorX="center"
                    anchorY="middle"
                />
            </group>

            {/* Label */}
            <TextLabel
                text={node.data.label}
                position={[-w / 2 + 0.12, h / 2 - 0.36, depth / 2 + 0.01]}
                fontSize={FontSize.headline}
                maxWidth={w - 0.24}
                bold
            />

            {/* Justification excerpt */}
            {node.data.justification && (
                <TextLabel
                    text={node.data.justification}
                    position={[-w / 2 + 0.12, h / 2 - 0.58, depth / 2 + 0.01]}
                    fontSize={FontSize.body}
                    maxWidth={w - 0.24}
                    color="#8B949E"
                />
            )}

            {/* Posture + temporal tags */}
            <group position={[-w / 2 + 0.4, -h / 2 + 0.14, depth / 2 + 0.01]}>
                <RoundedBox args={[0.6, 0.16, 0.01]} radius={0.04} smoothness={3}>
                    <meshBasicMaterial color={Theme.accentSoft} transparent opacity={0.5} />
                </RoundedBox>
                <TextLabel
                    text={node.data.evidencePosture}
                    position={[0, 0, 0.01]}
                    fontSize={FontSize.meta}
                    color="#00D2FF"
                    anchorX="center"
                    anchorY="middle"
                />
            </group>

            <group position={[w / 2 - 0.4, -h / 2 + 0.14, depth / 2 + 0.01]}>
                <RoundedBox args={[0.6, 0.16, 0.01]} radius={0.04} smoothness={3}>
                    <meshBasicMaterial color={Theme.accentSoft} transparent opacity={0.5} />
                </RoundedBox>
                <TextLabel
                    text={node.data.temporalFocus}
                    position={[0, 0, 0.01]}
                    fontSize={FontSize.meta}
                    color="#00D2FF"
                    anchorX="center"
                    anchorY="middle"
                />
            </group>
        </group>
    );
};
