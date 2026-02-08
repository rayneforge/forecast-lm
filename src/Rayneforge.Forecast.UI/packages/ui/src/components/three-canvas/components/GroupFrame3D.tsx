import React, { useMemo } from 'react';
import { RoundedBox } from '@react-three/drei';
import { ChainGroup, CanvasNode, Vector3 as V3 } from '../../../canvas/CanvasTypes';
import { TextLabel, FontSize } from './TextLabel';
import { Theme, toWorld } from './theme3d';

// ─── GroupFrame3D ───────────────────────────────────────────────
// Wireframe bounding box that auto-fits around member nodes.
// Matches the 2D GroupFrame (dashed border, label, auto-bbox).

export interface GroupFrame3DProps {
    group: ChainGroup;
    nodes: CanvasNode[];
    onRemove?: (id: string) => void;
}

const PAD = 0.25; // padding around outermost nodes

export const GroupFrame3D: React.FC<GroupFrame3DProps> = ({
    group, nodes, onRemove,
}) => {
    // compute bounding box from member nodes
    const bbox = useMemo(() => {
        const members = nodes.filter(n => group.nodeIds.includes(n.id));
        if (members.length === 0) return null;

        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        let avgZ = 0;

        for (const n of members) {
            const wx = toWorld(n.position.x);
            const wy = -toWorld(n.position.y);
            avgZ += toWorld(n.position.z);

            // approximate size per node (use 1.5 world units as default node radius)
            const halfW = 1.3;
            const halfH = 0.6;
            minX = Math.min(minX, wx - halfW);
            maxX = Math.max(maxX, wx + halfW);
            minY = Math.min(minY, wy - halfH);
            maxY = Math.max(maxY, wy + halfH);
        }

        avgZ /= members.length;
        return {
            cx: (minX + maxX) / 2,
            cy: (minY + maxY) / 2,
            cz: avgZ - 0.02, // behind nodes
            w: maxX - minX + PAD * 2,
            h: maxY - minY + PAD * 2,
        };
    }, [group.nodeIds, nodes]);

    if (!bbox) return null;

    return (
        <group position={[bbox.cx, bbox.cy, bbox.cz]}>
            {/* Wireframe frame */}
            <RoundedBox args={[bbox.w, bbox.h, 0.02]} radius={0.08} smoothness={3}>
                <meshBasicMaterial
                    color={Theme.groupCyan}
                    wireframe
                    transparent
                    opacity={0.35}
                />
            </RoundedBox>

            {/* Label above top-left corner */}
            <TextLabel
                text={group.label}
                position={[-bbox.w / 2 + 0.15, bbox.h / 2 + 0.12, 0.02]}
                fontSize={FontSize.body}
                color="#8B949E"
                bold
            />
        </group>
    );
};
