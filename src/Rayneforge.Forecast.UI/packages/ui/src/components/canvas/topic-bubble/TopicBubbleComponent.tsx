import React, { useCallback } from 'react';
import { TopicBubble as TopicBubbleData, Vector3 } from '../../../canvas/CanvasTypes';
import { useDrag } from '../../../canvas/useDrag';
import './topic-bubble.scss';

export interface TopicBubbleComponentProps {
    node: TopicBubbleData;
    selected?: boolean;
    zoom?: number;
    onMove: (id: string, position: Vector3) => void;
    onSelect: (id: string) => void;
}

export const TopicBubbleComponent: React.FC<TopicBubbleComponentProps> = ({
    node, selected, zoom = 1, onMove, onSelect,
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
                left: node.position.x,
                top: node.position.y,
                zIndex: Math.round(node.position.z),
                transform: `scale(${scale})`,
            }}
            {...dragHandlers}
        >
            {node.data.label}
        </div>
    );
};
