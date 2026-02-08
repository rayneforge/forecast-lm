import React from 'react';
import { CanvasEdge, CanvasNode, ChainGroup, Vector3 } from '../../../canvas/CanvasTypes';
import './canvas-edge.scss';

interface CanvasEdgesProps {
    edges: CanvasEdge[];
    nodes: CanvasNode[];
    groups: ChainGroup[];
}

/** Centre of a node's visual rect (2D projection) */
function getCenter(node: CanvasNode): Vector3 {
    const w = node.type === 'article' ? 260 : node.type === 'note' ? 220 : 80;
    const h = node.type === 'topic' ? 36 : 90;
    return { x: node.position.x + w / 2, y: node.position.y + h / 2, z: node.position.z };
}

function getGroupCenter(group: ChainGroup, nodes: CanvasNode[]): Vector3 {
    const members = nodes.filter(n => group.nodeIds.includes(n.id));
    if (members.length === 0) return group.position;
    const sum = members.reduce(
        (a, n) => ({ x: a.x + n.position.x, y: a.y + n.position.y, z: a.z + n.position.z }),
        { x: 0, y: 0, z: 0 },
    );
    return { x: sum.x / members.length, y: sum.y / members.length, z: sum.z / members.length };
}

function resolve(id: string, nodes: CanvasNode[], groups: ChainGroup[]): Vector3 | null {
    const node = nodes.find(n => n.id === id);
    if (node) return getCenter(node);
    const group = groups.find(g => g.id === id);
    if (group) return getGroupCenter(group, nodes);
    return null;
}

export const CanvasEdges: React.FC<CanvasEdgesProps> = ({ edges, nodes, groups }) => (
    <svg className="rf-canvas-edges">
        {edges.map(edge => {
            const from = resolve(edge.source, nodes, groups);
            const to = resolve(edge.target, nodes, groups);
            if (!from || !to) return null;

            const mx = (from.x + to.x) / 2;
            const my = (from.y + to.y) / 2;
            const dx = to.x - from.x;
            const dy = to.y - from.y;
            const dist = Math.sqrt(dx * dx + dy * dy) || 1;
            const curve = Math.min(dist * 0.2, 60);
            const cx = mx - (dy / dist) * curve;
            const cy = my + (dx / dist) * curve;

            return (
                <g key={edge.id}>
                    <path
                        d={`M ${from.x} ${from.y} Q ${cx} ${cy} ${to.x} ${to.y}`}
                        className={`rf-canvas-edges__path rf-canvas-edges__path--${edge.type}`}
                    />
                    {edge.label && (
                        <text className="rf-canvas-edges__label" x={mx} y={my - 8}>
                            {edge.label}
                        </text>
                    )}
                </g>
            );
        })}
    </svg>
);
