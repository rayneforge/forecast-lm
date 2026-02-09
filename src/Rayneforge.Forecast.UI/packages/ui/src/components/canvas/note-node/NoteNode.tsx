import React, { useCallback } from 'react';
import { NoteNode as NoteNodeData, Vector3 } from '../../../canvas/CanvasTypes';
import { useDrag } from '../../../canvas/useDrag';
import './note-node.scss';

export interface NoteNodeProps {
    node: NoteNodeData;
    selected?: boolean;
    zoom?: number;
    renderPosition?: Vector3;
    onMove: (id: string, position: Vector3) => void;
    onSelect: (id: string) => void;
    onDragStart?: (id: string) => void;
    onDragEnd?: (id: string, position: Vector3, velocity: Vector3) => void;
    onAnchorDragStart?: (nodeId: string, anchor: string, pointerId: number) => void;
}

export const NoteNodeComponent: React.FC<NoteNodeProps> = ({
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
                transform: `translate3d(${pos.x}px, ${pos.y}px, 0)`,
                zIndex: Math.round(pos.z) + (isDragging.current ? 10000 : 0),
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
                            onAnchorDragStart?.(node.id, dir, e.pointerId);
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
