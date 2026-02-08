import React, { useCallback } from 'react';
import { NoteNode as NoteNodeData, Vector3 } from '../../../canvas/CanvasTypes';
import { useDrag } from '../../../canvas/useDrag';
import './note-node.scss';

export interface NoteNodeProps {
    node: NoteNodeData;
    selected?: boolean;
    zoom?: number;
    onMove: (id: string, position: Vector3) => void;
    onSelect: (id: string) => void;
    onAnchorDragStart?: (nodeId: string, anchor: string) => void;
}

export const NoteNodeComponent: React.FC<NoteNodeProps> = ({
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
        'rf-note-node',
        selected && 'rf-note-node--selected',
        isDragging.current && 'rf-note-node--dragging',
    ].filter(Boolean).join(' ');

    const formatDate = (d: string) => {
        try { return new Date(d).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }); }
        catch { return d; }
    };

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
            <div className="rf-note-node__anchors">
                {(['top', 'right', 'bottom', 'left'] as const).map(dir => (
                    <div
                        key={dir}
                        className={`rf-note-node__anchor rf-note-node__anchor--${dir}`}
                        onPointerDown={e => {
                            e.stopPropagation();
                            onAnchorDragStart?.(node.id, dir);
                        }}
                    />
                ))}
            </div>

            <h4 className="rf-note-node__title">{node.data.title}</h4>
            <p className="rf-note-node__body">{node.data.body}</p>
            <div className="rf-note-node__timestamp">{formatDate(node.data.createdAt)}</div>
        </div>
    );
};
