import React, { useCallback } from 'react';
import { ArticleNode as ArticleNodeData, Vector3 } from '../../../canvas/CanvasTypes';
import { useDrag } from '../../../canvas/useDrag';
import { Chip } from '../../chip/Chip';
import './article-node.scss';

export interface ArticleNodeProps {
    node: ArticleNodeData;
    selected?: boolean;
    zoom?: number;
    onMove: (id: string, position: Vector3) => void;
    onSelect: (id: string) => void;
    onAnchorDragStart?: (nodeId: string, anchor: string) => void;
}

export const ArticleNodeComponent: React.FC<ArticleNodeProps> = ({
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

    const renderDate = (dateStr: string) => {
        try {
            return new Date(dateStr).toLocaleDateString(undefined, {
                month: 'short', day: 'numeric',
            });
        } catch { return dateStr; }
    };

    const cls = [
        'rf-article-node',
        selected && 'rf-article-node--selected',
        isDragging.current && 'rf-article-node--dragging',
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
            {/* Link anchors */}
            <div className="rf-article-node__anchors">
                {(['top', 'right', 'bottom', 'left'] as const).map(dir => (
                    <div
                        key={dir}
                        className={`rf-article-node__anchor rf-article-node__anchor--${dir}`}
                        onPointerDown={e => {
                            e.stopPropagation();
                            onAnchorDragStart?.(node.id, dir);
                        }}
                    />
                ))}
            </div>

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
