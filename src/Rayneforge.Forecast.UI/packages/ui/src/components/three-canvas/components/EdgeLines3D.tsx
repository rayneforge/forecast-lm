import React, { useMemo, useReducer } from 'react';
import { useFrame } from '@react-three/fiber';
import { Line, QuadraticBezierLine } from '@react-three/drei';
import {
    CanvasEdge, EdgeType,
} from '../../../canvas/CanvasTypes';
import { Theme, toWorld } from './theme3d';
import { useScenePhysics } from './ScenePhysicsContext';

// ─── EdgeLines3D ────────────────────────────────────────────────
// Renders all edges as lines / curves between node centres.
// Reads positions from bodiesRef (physics engine) in useFrame and
// triggers a lightweight React re-render to update drei <Line> props.
// This is acceptable overhead — line geometry is cheap compared to
// node meshes with RoundedBox + SDF text.

export interface EdgeLines3DProps {
    edges: CanvasEdge[];
}

const edgeColor: Record<EdgeType, number> = {
    link:          Theme.textMuted,
    'group-bridge': Theme.groupCyan,
    relation:      Theme.entityViolet,
};

const edgeDash: Record<EdgeType, number> = {
    link:          0,
    'group-bridge': 0.06,
    relation:      0.04,
};

export const EdgeLines3D: React.FC<EdgeLines3DProps> = ({ edges }) => {
    const { bodiesRef } = useScenePhysics();
    // Force re-render each frame so line positions stay in sync with physics
    const [, tick] = useReducer(c => c + 1, 0);
    useFrame(() => tick());

    const nodeCenter = (id: string): [number, number, number] | null => {
        const body = bodiesRef.current.get(id);
        if (!body) return null;
        return [toWorld(body.position.x), -toWorld(body.position.y), toWorld(body.position.z)];
    };

    return (
        <group>
            {edges.map(edge => {
                const start = nodeCenter(edge.source);
                const end = nodeCenter(edge.target);
                if (!start || !end) return null;
                const color = edgeColor[edge.type] ?? Theme.textMuted;
                const dash = edgeDash[edge.type] ?? 0;

                // For relation edges, use a bezier curve with a slight midpoint offset
                if (edge.type === 'relation') {
                    const mid: [number, number, number] = [
                        (start[0] + end[0]) / 2,
                        (start[1] + end[1]) / 2 + 0.3,
                        (start[2] + end[2]) / 2 + 0.1,
                    ];
                    return (
                        <QuadraticBezierLine
                            key={edge.id}
                            start={start}
                            end={end}
                            mid={mid}
                            color={color}
                            lineWidth={1.5}
                            transparent
                            opacity={0.6}
                            dashed={dash > 0}
                            dashScale={dash > 0 ? 20 : undefined}
                            dashSize={dash > 0 ? dash : undefined}
                            gapSize={dash > 0 ? dash : undefined}
                        />
                    );
                }

                return (
                    <Line
                        key={edge.id}
                        points={[start, end]}
                        color={color}
                        lineWidth={1.2}
                        transparent
                        opacity={0.5}
                        dashed={dash > 0}
                        dashScale={dash > 0 ? 20 : undefined}
                        dashSize={dash > 0 ? dash : undefined}
                        gapSize={dash > 0 ? dash : undefined}
                    />
                );
            })}
        </group>
    );
};
