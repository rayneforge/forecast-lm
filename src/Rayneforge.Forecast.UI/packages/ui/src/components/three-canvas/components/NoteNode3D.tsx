import React, { useRef, useState } from 'react';
import { ThreeEvent } from '@react-three/fiber';
import { RoundedBox } from '@react-three/drei';
import { NoteNode as NoteNodeData, Vector3 as V3 } from '../../../canvas/CanvasTypes';
import { TextLabel, FontSize } from './TextLabel';
import { Theme, toWorld, NodeSize } from './theme3d';
import { useDrag3D } from './useDrag3D';

// ─── NoteNode3D ─────────────────────────────────────────────────
// Gold-accented card for user notes.
// Mirrors the 2D NoteNodeComponent with gold left-border strip.

export interface NoteNode3DProps {
    node: NoteNodeData;
    selected?: boolean;
    onSelect: (id: string) => void;
    onMove: (id: string, pos: V3) => void;
}

export const NoteNode3D: React.FC<NoteNode3DProps> = ({
    node, selected, onSelect, onMove,
}) => {
    const { w, h, depth } = NodeSize.note;
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

    const formatDate = (d: string) => {
        try { return new Date(d).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }); }
        catch { return d; }
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
                    opacity={0.88}
                />
            </RoundedBox>

            {/* Gold left accent strip */}
            <mesh position={[-w / 2 + 0.03, 0, depth / 2 + 0.005]}>
                <boxGeometry args={[0.04, h - 0.12, 0.01]} />
                <meshBasicMaterial color={Theme.noteGold} />
            </mesh>

            {/* Selection ring */}
            {(selected || hovered) && (
                <RoundedBox args={[w + 0.04, h + 0.04, depth * 0.5]} radius={0.06} smoothness={4}>
                    <meshBasicMaterial
                        color={selected ? Theme.noteGold : Theme.accentHover}
                        transparent
                        opacity={selected ? 0.5 : 0.2}
                        wireframe={!selected}
                    />
                </RoundedBox>
            )}

            {/* Title */}
            <TextLabel
                text={node.data.title}
                position={[-w / 2 + 0.18, h / 2 - 0.14, depth / 2 + 0.01]}
                fontSize={FontSize.headline}
                color="#D29922"
                maxWidth={w - 0.36}
                bold
            />

            {/* Body text */}
            <TextLabel
                text={node.data.body}
                position={[-w / 2 + 0.18, h / 2 - 0.36, depth / 2 + 0.01]}
                fontSize={FontSize.body}
                maxWidth={w - 0.36}
                color="#8B949E"
            />

            {/* Timestamp */}
            <TextLabel
                text={formatDate(node.data.createdAt)}
                position={[-w / 2 + 0.18, -h / 2 + 0.12, depth / 2 + 0.01]}
                fontSize={FontSize.meta}
                color="#484F58"
            />
        </group>
    );
};
