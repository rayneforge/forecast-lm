import React from 'react';
import { ChainGroup, CanvasNode } from '../../../canvas/CanvasTypes';
import './group-frame.scss';

export interface GroupFrameProps {
    group: ChainGroup;
    nodes: CanvasNode[];
    selected?: boolean;
    onSelect?: (groupId: string) => void;
    onRemove?: (groupId: string) => void;
}

/** Bounding box around member nodes (2D projection, z ignored) */
function getBounds(nodes: CanvasNode[], padding = 20) {
    if (nodes.length === 0) return { x: 0, y: 0, w: 120, h: 80 };

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const n of nodes) {
        minX = Math.min(minX, n.position.x);
        minY = Math.min(minY, n.position.y);
        const w = n.type === 'article' ? 260 : n.type === 'note' ? 220 : 100;
        const h = n.type === 'topic' ? 36 : 100;
        maxX = Math.max(maxX, n.position.x + w);
        maxY = Math.max(maxY, n.position.y + h);
    }

    return {
        x: minX - padding,
        y: minY - padding - 24, // extra room for label
        w: maxX - minX + padding * 2,
        h: maxY - minY + padding * 2 + 24,
    };
}

export const GroupFrame: React.FC<GroupFrameProps> = ({
    group, nodes, selected, onSelect, onRemove,
}) => {
    const memberNodes = nodes.filter(n => group.nodeIds.includes(n.id));
    const bounds = getBounds(memberNodes);

    const cls = [
        'rf-group-frame',
        selected && 'rf-group-frame--selected',
    ].filter(Boolean).join(' ');

    return (
        <div
            className={cls}
            style={{
                left: bounds.x,
                top: bounds.y,
                width: bounds.w,
                height: bounds.h,
                borderColor: group.color || undefined,
            }}
        >
            <span
                className="rf-group-frame__label"
                onClick={() => onSelect?.(group.id)}
            >
                {group.label} ({memberNodes.length})
            </span>
            <div className="rf-group-frame__toolbar">
                <button
                    className="rf-icon-btn"
                    onClick={() => onRemove?.(group.id)}
                    aria-label="Remove group"
                >
                    ×
                </button>
            </div>
        </div>
    );
};
