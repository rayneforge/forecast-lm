import React, { useMemo } from 'react';
import { Line, QuadraticBezierLine } from '@react-three/drei';
import {
    CanvasEdge, CanvasNode, EdgeType, Vector3 as V3,
} from '../../../canvas/CanvasTypes';
import { Theme, toWorld } from './theme3d';

// ─── EdgeLines3D ────────────────────────────────────────────────
// Renders all edges as lines / curves between node centres.
// Uses drei's <Line> for straight and <QuadraticBezierLine> for curves.
// Edge colour and dash pattern keyed by EdgeType.

export interface EdgeLines3DProps {
    edges: CanvasEdge[];
    nodes: CanvasNode[];
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

function nodeCenter(n: CanvasNode): [number, number, number] {
    return [toWorld(n.position.x), -toWorld(n.position.y), toWorld(n.position.z)];
}

export const EdgeLines3D: React.FC<EdgeLines3DProps> = ({ edges, nodes }) => {
    const nodeMap = useMemo(() => {
        const m = new Map<string, CanvasNode>();
        for (const n of nodes) m.set(n.id, n);
        return m;
    }, [nodes]);

    return (
        <group>
            {edges.map(edge => {
                const src = nodeMap.get(edge.source);
                const tgt = nodeMap.get(edge.target);
                if (!src || !tgt) return null;

                const start = nodeCenter(src);
                const end = nodeCenter(tgt);
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
