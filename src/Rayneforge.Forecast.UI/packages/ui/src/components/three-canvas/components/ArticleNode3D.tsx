import React, { useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { ThreeEvent } from '@react-three/fiber';
import { RoundedBox, Image } from '@react-three/drei';
import { ArticleNode as ArticleNodeData, Vector3 as V3 } from '../../../canvas/CanvasTypes';
import { TextLabel, FontSize } from './TextLabel';
import { Theme, toWorld, NodeSize } from './theme3d';
import { useDrag3D } from './useDrag3D';
import { useNodeRef } from './ScenePhysicsContext';

// ─── ArticleNode3D ──────────────────────────────────────────────
// Rounded box card with source meta, title, and tag pills.
// Position is driven imperatively by PhysicsTicker via the
// registered group ref — NOT by React props.

export interface ArticleNode3DProps {
    node: ArticleNodeData;
    selected?: boolean;
    onSelect: (id: string) => void;
    onMove: (id: string, pos: V3) => void;
    onDragStart?: (id: string) => void;
    onDragEnd?: (id: string, pos: V3, velocity: V3) => void;
}

export const ArticleNode3D: React.FC<ArticleNode3DProps> = ({
    node, selected, onSelect, onMove, onDragStart, onDragEnd,
}) => {
    const { w, h, depth } = NodeSize.article;
    const setGroupRef = useNodeRef(node.id);
    const groupRef = useRef<THREE.Group>(null);
    const [hovered, setHovered] = useState(false);

    // Initial position (PhysicsTicker overwrites this each frame)
    const px = toWorld(node.position.x);
    const py = -toWorld(node.position.y);
    const pz = toWorld(node.position.z);

    // Live position reader — reads from the Three.js group (set by ticker)
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

    // Combined ref callback: registers with physics store AND keeps local ref
    const combinedRef = useCallback((group: THREE.Group | null) => {
        (groupRef as React.MutableRefObject<THREE.Group | null>).current = group;
        setGroupRef(group);
    }, [setGroupRef]);

    const renderDate = (dateStr: string) => {
        try {
            return new Date(dateStr).toLocaleDateString(undefined, {
                month: 'short', day: 'numeric',
            });
        } catch { return dateStr; }
    };

    const hasImage = !!node.data.imageUrl;
    // Adjust layout if image is present
    const imageHeight = hasImage ? 2.5 : 0; 
    const contentOffsetY = hasImage ? -1.2 : 0;

    const borderColor = selected ? Theme.selectionGlow : hovered ? Theme.accentHover : Theme.textMuted;

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
            <RoundedBox args={[w, h + imageHeight, depth]} radius={0.06} smoothness={4}>
                <meshStandardMaterial
                    color={Theme.canvasSurface}
                    transparent
                    opacity={0.92}
                />
            </RoundedBox>

            {/* Selection / hover border */}
            <RoundedBox args={[w + 0.04, h + imageHeight + 0.04, depth * 0.5]} radius={0.07} smoothness={4}>
                <meshBasicMaterial
                    color={borderColor}
                    transparent
                    opacity={selected ? 0.6 : hovered ? 0.3 : 0.1}
                    wireframe={!selected}
                />
            </RoundedBox>

            {/* Header Image */}
            {hasImage && node.data.imageUrl && (
                <Image
                    url={node.data.imageUrl}
                    position={[0, (h + imageHeight) / 2 - 1.25, depth / 2 + 0.01]} // Top aligned
                    scale={[w, 2.5]}
                    opacity={1}
                    transparent
                />
            )}

            {/* Source + Date meta line */}
            <TextLabel
                text={`${node.data.source.name}  ·  ${renderDate(node.data.publishedAt)}`}
                position={[-w / 2 + 0.12, (h / 2) - 0.14 + contentOffsetY, depth / 2 + 0.01]}
                fontSize={FontSize.meta}
                color="#8B949E"
            />

            {/* Title */}
            <TextLabel
                text={node.data.title}
                position={[-w / 2 + 0.12, (h / 2) - 0.32 + contentOffsetY, depth / 2 + 0.01]}
                fontSize={FontSize.headline}
                maxWidth={w - 0.24}
                bold
            />

            {/* Tags row */}
            {node.data.tags && node.data.tags.slice(0, 3).map((tag, i) => (
                <group key={tag} position={[-w / 2 + 0.12 + i * 0.7, -h / 2 + 0.16, depth / 2 + 0.01]}>
                    <RoundedBox args={[0.6, 0.18, 0.01]} radius={0.04} smoothness={3}>
                        <meshBasicMaterial color={Theme.accentSoft} transparent opacity={0.5} />
                    </RoundedBox>
                    <TextLabel
                        text={tag}
                        position={[0, 0, 0.01]}
                        fontSize={FontSize.meta}
                        color="#00D2FF"
                        anchorX="center"
                        anchorY="middle"
                    />
                </group>
            ))}
        </group>
    );
};
