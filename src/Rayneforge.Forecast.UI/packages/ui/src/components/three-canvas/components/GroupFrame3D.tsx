import React, { useMemo, useReducer } from 'react';
import { useFrame } from '@react-three/fiber';
import { RoundedBox } from '@react-three/drei';
import { ChainGroup } from '../../../canvas/CanvasTypes';
import { TextLabel, FontSize } from './TextLabel';
import { Theme, toWorld } from './theme3d';
import { useScenePhysics } from './ScenePhysicsContext';

// ─── GroupFrame3D ───────────────────────────────────────────────
// Wireframe bounding box that auto-fits around member nodes.
// Reads node positions from bodiesRef (physics engine) via context.

export interface GroupFrame3DProps {
    group: ChainGroup;
    onRemove?: (id: string) => void;
}

const PAD = 0.25; // padding around outermost nodes

export const GroupFrame3D: React.FC<GroupFrame3DProps> = ({
    group, onRemove,
}) => {
    const { bodiesRef } = useScenePhysics();
    // Re-render each frame to keep bbox in sync with physics
    const [, tick] = useReducer(c => c + 1, 0);
    useFrame(() => tick());

    // Compute bounding box from member node physics bodies
    const bbox = (() => {
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        let avgZ = 0;
        let count = 0;

        for (const nodeId of group.nodeIds) {
            const body = bodiesRef.current.get(nodeId);
            if (!body) continue;

            const wx = toWorld(body.position.x);
            const wy = -toWorld(body.position.y);
            const wz = toWorld(body.position.z);

            const halfW = 1.3;
            const halfH = 0.6;
            minX = Math.min(minX, wx - halfW);
            maxX = Math.max(maxX, wx + halfW);
            minY = Math.min(minY, wy - halfH);
            maxY = Math.max(maxY, wy + halfH);
            avgZ += wz;
            count++;
        }

        if (count === 0) return null;
        avgZ /= count;

        return {
            cx: (minX + maxX) / 2,
            cy: (minY + maxY) / 2,
            cz: avgZ - 0.02,
            w: maxX - minX + PAD * 2,
            h: maxY - minY + PAD * 2,
        };
    })();

    if (!bbox) return null;

    return (
        <group position={[bbox.cx, bbox.cy, bbox.cz]}>
            {/* Wireframe frame */}
            <RoundedBox args={[bbox.w, bbox.h, 0.02]} radius={0.08} smoothness={3}>
                <meshBasicMaterial
                    color={group.color || Theme.groupCyan}
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
