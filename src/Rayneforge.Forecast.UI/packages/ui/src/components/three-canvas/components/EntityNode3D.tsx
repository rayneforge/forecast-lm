import React, { useState } from 'react';
import { ThreeEvent } from '@react-three/fiber';
import { RoundedBox } from '@react-three/drei';
import { EntityNode as EntityNodeData, Vector3 as V3 } from '../../../canvas/CanvasTypes';
import { TextLabel, FontSize } from './TextLabel';
import { Theme, toWorld, NodeSize } from './theme3d';
import { useDrag3D } from './useDrag3D';

// ─── EntityNode3D ───────────────────────────────────────────────
// BlueViolet-accented card showing entity type pill, name, description.
// Matches the 2D EntityNodeComponent hierarchy.

export interface EntityNode3DProps {
    node: EntityNodeData;
    selected?: boolean;
    onSelect: (id: string) => void;
    onMove: (id: string, pos: V3) => void;
}

export const EntityNode3D: React.FC<EntityNode3DProps> = ({
    node, selected, onSelect, onMove,
}) => {
    const { w, h, depth } = NodeSize.entity;
    const [hovered, setHovered] = useState(false);

    const px = toWorld(node.position.x);
    const py = -toWorld(node.position.y);
    const pz = toWorld(node.position.z);

    const { isDragging, bind: dragBind } = useDrag3D({
        id: node.id,
        position: [px, py, pz],
        locked: node.locked,
        onMove,
    });

    const handleClick = (e: ThreeEvent<MouseEvent>) => {
        e.stopPropagation();
        onSelect(node.id);
    };

    return (
        <group
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

            {/* Violet top accent bar */}
            <mesh position={[0, h / 2 - 0.02, depth / 2 + 0.005]}>
                <boxGeometry args={[w - 0.12, 0.03, 0.01]} />
                <meshBasicMaterial color={Theme.entityViolet} />
            </mesh>

            {/* Selection ring */}
            {(selected || hovered) && (
                <RoundedBox args={[w + 0.04, h + 0.04, depth * 0.5]} radius={0.06} smoothness={4}>
                    <meshBasicMaterial
                        color={selected ? Theme.entityViolet : Theme.accentHover}
                        transparent
                        opacity={selected ? 0.5 : 0.2}
                        wireframe={!selected}
                    />
                </RoundedBox>
            )}

            {/* Entity type pill */}
            <group position={[-w / 2 + 0.45, h / 2 - 0.18, depth / 2 + 0.01]}>
                <RoundedBox args={[0.7, 0.18, 0.01]} radius={0.08} smoothness={3}>
                    <meshBasicMaterial color={Theme.entityViolet} transparent opacity={0.25} />
                </RoundedBox>
                <TextLabel
                    text={node.data.type}
                    position={[0, 0, 0.01]}
                    fontSize={FontSize.meta}
                    color="#8A2BE2"
                    anchorX="center"
                    anchorY="middle"
                />
            </group>

            {/* Name */}
            <TextLabel
                text={node.data.name}
                position={[-w / 2 + 0.12, h / 2 - 0.36, depth / 2 + 0.01]}
                fontSize={FontSize.headline}
                maxWidth={w - 0.24}
                bold
            />

            {/* Description */}
            <TextLabel
                text={node.data.description}
                position={[-w / 2 + 0.12, h / 2 - 0.55, depth / 2 + 0.01]}
                fontSize={FontSize.body}
                maxWidth={w - 0.24}
                color="#8B949E"
            />
        </group>
    );
};
