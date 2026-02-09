import React, { useCallback } from 'react';
import { EntityNode as EntityNodeData, Vector3 } from '../../../canvas/CanvasTypes';
import { useDrag } from '../../../canvas/useDrag';
import './entity-node.scss';

export interface EntityNodeProps {
    node: EntityNodeData;
    selected?: boolean;
    zoom?: number;
    renderPosition?: Vector3;
    onMove: (id: string, position: Vector3) => void;
    onSelect: (id: string) => void;
    onDragStart?: (id: string) => void;
    onDragEnd?: (id: string, position: Vector3, velocity: Vector3) => void;
    onAnchorDragStart?: (nodeId: string, anchor: string, pointerId: number) => void;
}

export const EntityNodeComponent: React.FC<EntityNodeProps> = ({
    node, selected, zoom = 1, renderPosition, onMove, onSelect, onDragStart, onDragEnd, onAnchorDragStart,
}) => {
    const pos = renderPosition ?? node.position;

    const handleMove = useCallback(
        (p: Vector3) => onMove(node.id, p),
        [node.id, onMove],
    );

    const handleEnd = useCallback(
        (p: Vector3, v: Vector3) => onDragEnd?.(node.id, p, v),
        [node.id, onDragEnd],
    );

    const { dragHandlers, isDragging } = useDrag({
        position: pos,
        zoom,
        onMove: handleMove,
        onEnd: handleEnd,
        onStart: () => { onSelect(node.id); onDragStart?.(node.id); },
        disabled: node.locked,
    });

    const cls = [
        'rf-entity-node',
        selected && 'rf-entity-node--selected',
        isDragging.current && 'rf-entity-node--dragging',
    ].filter(Boolean).join(' ');

    return (
        <div
            className={cls}
            style={{
                transform: `translate3d(${pos.x}px, ${pos.y}px, 0)`,
                zIndex: Math.round(pos.z) + (isDragging.current ? 10000 : 0),
            }}
            {...dragHandlers}
        >
            <div className="rf-entity-node__anchors">
                {(['top', 'right', 'bottom', 'left'] as const).map(dir => (
                    <div
                        key={dir}
                        className={`rf-entity-node__anchor rf-entity-node__anchor--${dir}`}
                        onPointerDown={e => {
                            e.stopPropagation();
                            onAnchorDragStart?.(node.id, dir, e.pointerId);
                        }}
                    />
                ))}
            </div>

            <div className="rf-entity-node__header">
                <span className="rf-entity-node__type">{node.data.type}</span>
                <h4 className="rf-entity-node__name">{node.data.name}</h4>
            </div>
            <p className="rf-entity-node__desc">{node.data.description}</p>
        </div>
    );
};
