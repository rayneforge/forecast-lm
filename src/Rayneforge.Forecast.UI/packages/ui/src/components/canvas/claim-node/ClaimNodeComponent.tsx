import React, { useCallback } from 'react';
import { ClaimNode as ClaimNodeData, Vector3 } from '../../../canvas/CanvasTypes';
import { useDrag } from '../../../canvas/useDrag';
import './claim-node.scss';

export interface ClaimNodeProps {
    node: ClaimNodeData;
    selected?: boolean;
    zoom?: number;
    renderPosition?: Vector3;
    onMove: (id: string, position: Vector3) => void;
    onSelect: (id: string) => void;
    onDragStart?: (id: string) => void;
    onDragEnd?: (id: string, position: Vector3, velocity: Vector3) => void;
    onAnchorDragStart?: (nodeId: string, anchor: string, pointerId: number) => void;
    layoutMode?: 'flow' | 'absolute';
}

export const ClaimNodeComponent: React.FC<ClaimNodeProps> = ({
    node, selected, zoom = 1, renderPosition, onMove, onSelect, onDragStart, onDragEnd, onAnchorDragStart,
    layoutMode = 'absolute',
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
        disabled: node.locked || layoutMode === 'flow',
    });

    const cls = [
        'rf-claim-node',
        layoutMode === 'flow' && 'rf-claim-node--flow',
        selected && 'rf-claim-node--selected',
        isDragging.current && 'rf-claim-node--dragging',
    ].filter(Boolean).join(' ');

    const style: React.CSSProperties = layoutMode === 'absolute'
        ? {
            transform: `translate3d(${pos.x}px, ${pos.y}px, 0)`,
            zIndex: Math.round(pos.z) + (isDragging.current ? 10000 : 0),
        }
        : {
            position: 'relative',
        };

    return (
        <div
            className={cls}
            style={style}
            {...dragHandlers}
            onClick={() => layoutMode === 'flow' && onSelect(node.id)}
        >
            {/* Link anchors */}
            <div className="rf-claim-node__anchors">
                {(['top', 'right', 'bottom', 'left'] as const).map(dir => (
                    <div
                        key={dir}
                        className={`rf-claim-node__anchor rf-claim-node__anchor--${dir}`}
                        onPointerDown={e => {
                            e.stopPropagation();
                            onAnchorDragStart?.(node.id, dir, e.pointerId);
                        }}
                    />
                ))}
            </div>

            {/* Claim icon + quote mark */}
            <div className="rf-claim-node__quote">&#8220;</div>

            {/* Normalized text */}
            <p className="rf-claim-node__text">{node.data.normalizedText}</p>

            {/* Source article reference */}
            {node.data.articleTitle && (
                <div className="rf-claim-node__source">
                    <span className="rf-claim-node__source-icon">📄</span>
                    <span className="rf-claim-node__source-title">{node.data.articleTitle}</span>
                </div>
            )}
        </div>
    );
};
