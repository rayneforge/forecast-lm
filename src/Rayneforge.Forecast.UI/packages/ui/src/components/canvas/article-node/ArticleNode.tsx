import React, { useCallback } from 'react';
import { ArticleNode as ArticleNodeData, Vector3 } from '../../../canvas/CanvasTypes';
import { useDrag } from '../../../canvas/useDrag';
import { Chip } from '../../chip/Chip';
import './article-node.scss';

export interface ArticleNodeProps {
    node: ArticleNodeData;
    selected?: boolean;
    zoom?: number;
    /** Physics-interpolated position (if provided, overrides node.position for rendering) */
    renderPosition?: Vector3;
    onMove: (id: string, position: Vector3) => void;
    onSelect: (id: string) => void;
    onDragStart?: (id: string) => void;
    onDragEnd?: (id: string, position: Vector3, velocity: Vector3) => void;
    onAnchorDragStart?: (nodeId: string, anchor: string, pointerId: number) => void;
    layoutMode?: 'flow' | 'absolute';
}

export const ArticleNodeComponent: React.FC<ArticleNodeProps> = ({
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

    const renderDate = (dateStr: string) => {
        try {
            return new Date(dateStr).toLocaleDateString(undefined, {
                month: 'short', day: 'numeric',
            });
        } catch { return dateStr; }
    };

    const cls = [
        'rf-article-node',
        layoutMode === 'flow' && 'rf-article-node--flow',
        selected && 'rf-article-node--selected',
        isDragging.current && 'rf-article-node--dragging',
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
            <div className="rf-article-node__anchors">
                {(['top', 'right', 'bottom', 'left'] as const).map(dir => (
                    <div
                        key={dir}
                        className={`rf-article-node__anchor rf-article-node__anchor--${dir}`}
                        onPointerDown={e => {
                            e.stopPropagation();
                            onAnchorDragStart?.(node.id, dir, e.pointerId);
                        }}
                    />
                ))}
            </div>

            {node.data.imageUrl && (
                <div 
                    className="rf-article-node__image" 
                    style={{ backgroundImage: `url(${node.data.imageUrl})` }}
                />
            )}

            <div className="rf-article-node__meta">
                <span>{node.data.source.name}</span>
                <span>{renderDate(node.data.publishedAt)}</span>
            </div>
            <h4 className="rf-article-node__title">{node.data.title}</h4>
            {node.data.tags && node.data.tags.length > 0 && (
                <div className="rf-article-node__tags">
                    {node.data.tags.slice(0, 3).map((tag, i) => (
                        <Chip key={`${tag}-${i}`} label={tag} variant="entity" />
                    ))}
                </div>
            )}
        </div>
    );
};
