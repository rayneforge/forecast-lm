import React, { useCallback } from 'react';
import { EntityNode as EntityNodeData, Vector3 } from '../../../canvas/CanvasTypes';
import { useDrag } from '../../../canvas/useDrag';
import './entity-node.scss';

export interface EntityNodeProps {
    node: EntityNodeData;
    selected?: boolean;
    zoom?: number;
    onMove: (id: string, position: Vector3) => void;
    onSelect: (id: string) => void;
    onAnchorDragStart?: (nodeId: string, anchor: string) => void;
}

export const EntityNodeComponent: React.FC<EntityNodeProps> = ({
    node, selected, zoom = 1, onMove, onSelect, onAnchorDragStart,
}) => {
    const handleMove = useCallback(
        (pos: Vector3) => onMove(node.id, pos),
        [node.id, onMove],
    );

    const { dragHandlers, isDragging } = useDrag({
        position: node.position,
        zoom,
        onMove: handleMove,
        onStart: () => onSelect(node.id),
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
                left: node.position.x,
                top: node.position.y,
                zIndex: Math.round(node.position.z) + (isDragging.current ? 10000 : 0),
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
                            onAnchorDragStart?.(node.id, dir);
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
