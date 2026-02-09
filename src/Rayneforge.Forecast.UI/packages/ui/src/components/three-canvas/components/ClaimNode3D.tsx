import React, { useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { ThreeEvent } from '@react-three/fiber';
import { RoundedBox } from '@react-three/drei';
import { ClaimNode as ClaimNodeData, Vector3 as V3 } from '../../../canvas/CanvasTypes';
import { TextLabel, FontSize } from './TextLabel';
import { Theme, toWorld, NodeSize } from './theme3d';
import { useDrag3D } from './useDrag3D';
import { useNodeRef } from './ScenePhysicsContext';

// ─── ClaimNode3D ────────────────────────────────────────────────
// Orange-accented quote card for claim propositions.
// Position driven imperatively by PhysicsTicker.

export interface ClaimNode3DProps {
    node: ClaimNodeData;
    selected?: boolean;
    onSelect: (id: string) => void;
    onMove: (id: string, pos: V3) => void;
    onDragStart?: (id: string) => void;
    onDragEnd?: (id: string, pos: V3, velocity: V3) => void;
}

const CLAIM_ORANGE = 0xF0883E;

export const ClaimNode3D: React.FC<ClaimNode3DProps> = ({
    node, selected, onSelect, onMove, onDragStart, onDragEnd,
}) => {
    const { w, h, depth } = NodeSize.claim;
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
                    opacity={0.9}
                />
            </RoundedBox>

            {/* Orange left accent strip */}
            <mesh position={[-w / 2 + 0.03, 0, depth / 2 + 0.005]}>
                <boxGeometry args={[0.04, h - 0.12, 0.01]} />
                <meshBasicMaterial color={CLAIM_ORANGE} />
            </mesh>

            {/* Selection ring */}
            {(selected || hovered) && (
                <RoundedBox args={[w + 0.04, h + 0.04, depth * 0.5]} radius={0.06} smoothness={4}>
                    <meshBasicMaterial
                        color={selected ? CLAIM_ORANGE : Theme.accentHover}
                        transparent
                        opacity={selected ? 0.5 : 0.2}
                        wireframe={!selected}
                    />
                </RoundedBox>
            )}

            {/* Open-quote glyph */}
            <TextLabel
                text={'\u201C'}
                position={[-w / 2 + 0.18, h / 2 - 0.12, depth / 2 + 0.01]}
                fontSize={0.22}
                color="#F0883E"
            />

            {/* Claim text */}
            <TextLabel
                text={node.data.normalizedText}
                position={[-w / 2 + 0.18, h / 2 - 0.32, depth / 2 + 0.01]}
                fontSize={FontSize.body}
                maxWidth={w - 0.36}
                color="#E6EDF3"
            />

            {/* Article reference */}
            {node.data.articleTitle && (
                <TextLabel
                    text={`📄 ${node.data.articleTitle}`}
                    position={[-w / 2 + 0.18, -h / 2 + 0.12, depth / 2 + 0.01]}
                    fontSize={FontSize.meta}
                    maxWidth={w - 0.36}
                    color="#484F58"
                />
            )}
        </group>
    );
};
