import React, { useCallback } from 'react';
import { TopicBubble as TopicBubbleData, Vector3 } from '../../../canvas/CanvasTypes';
import { useDrag } from '../../../canvas/useDrag';
import './topic-bubble.scss';

export interface TopicBubbleComponentProps {
    node: TopicBubbleData;
    selected?: boolean;
    zoom?: number;
    renderPosition?: Vector3;
    onMove: (id: string, position: Vector3) => void;
    onSelect: (id: string) => void;
    onDragStart?: (id: string) => void;
    onDragEnd?: (id: string, position: Vector3, velocity: Vector3) => void;
}

export const TopicBubbleComponent: React.FC<TopicBubbleComponentProps> = ({
    node, selected, zoom = 1, renderPosition, onMove, onSelect, onDragStart, onDragEnd,
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
    });

    const scale = 0.8 + node.data.weight * 0.4; // weight 0→1  ➜  0.8→1.2

    const cls = [
        'rf-topic-bubble',
        selected && 'rf-topic-bubble--selected',
        isDragging.current && 'rf-topic-bubble--dragging',
    ].filter(Boolean).join(' ');

    return (
        <div
            className={cls}
            style={{
                transform: `translate3d(${pos.x}px, ${pos.y}px, 0) scale(${scale})`,
                zIndex: Math.round(pos.z),
            }}
            {...dragHandlers}
        >
            {node.data.label}
        </div>
    );
};
