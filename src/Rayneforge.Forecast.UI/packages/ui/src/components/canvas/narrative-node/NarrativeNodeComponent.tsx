import React, { useCallback } from 'react';
import { NarrativeNode as NarrativeNodeData, Vector3 } from '../../../canvas/CanvasTypes';
import { useDrag } from '../../../canvas/useDrag';
import { Chip } from '../../chip/Chip';
import './narrative-node.scss';

// ─── Category colour map (matches NarrativePane / theme3d) ──────

const CATEGORY_COLORS: Record<string, string> = {
    OptimisticProgress: '#00D2FF',
    RiskSafety:         '#F85149',
    LaborDisplacement:  '#D29922',
    NationalSecurity:   '#F0883E',
    MarketFinance:      '#58A6FF',
    RightsEthics:       '#BC8CFF',
    TechnicalRealism:   '#8B949E',
    MoralPanic:         '#FF7B72',
};

const categoryColor = (cat: string) => CATEGORY_COLORS[cat] ?? '#3FB950';

// ─── Component ──────────────────────────────────────────────────

export interface NarrativeNodeProps {
    node: NarrativeNodeData;
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

export const NarrativeNodeComponent: React.FC<NarrativeNodeProps> = ({
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

    const accent = categoryColor(node.data.category);

    const cls = [
        'rf-narrative-node',
        layoutMode === 'flow' && 'rf-narrative-node--flow',
        selected && 'rf-narrative-node--selected',
        isDragging.current && 'rf-narrative-node--dragging',
    ].filter(Boolean).join(' ');

    const style: React.CSSProperties = layoutMode === 'absolute'
        ? {
            transform: `translate3d(${pos.x}px, ${pos.y}px, 0)`,
            zIndex: Math.round(pos.z) + (isDragging.current ? 10000 : 0),
            borderTopColor: accent,
        }
        : {
            position: 'relative',
            borderTopColor: accent,
        };

    return (
        <div
            className={cls}
            style={style}
            {...dragHandlers}
            onClick={() => layoutMode === 'flow' && onSelect(node.id)}
        >
            {/* Link anchors */}
            <div className="rf-narrative-node__anchors">
                {(['top', 'right', 'bottom', 'left'] as const).map(dir => (
                    <div
                        key={dir}
                        className={`rf-narrative-node__anchor rf-narrative-node__anchor--${dir}`}
                        onPointerDown={e => {
                            e.stopPropagation();
                            onAnchorDragStart?.(node.id, dir, e.pointerId);
                        }}
                    />
                ))}
            </div>

            {/* Category pill */}
            <div className="rf-narrative-node__category" style={{ color: accent, borderColor: accent }}>
                {node.data.category}
            </div>

            {/* Label */}
            <h4 className="rf-narrative-node__label">{node.data.label}</h4>

            {/* Justification excerpt */}
            {node.data.justification && (
                <p className="rf-narrative-node__justification">{node.data.justification}</p>
            )}

            {/* Posture + temporal chips */}
            <div className="rf-narrative-node__chips">
                <Chip label={node.data.evidencePosture} variant="entity" />
                <Chip label={node.data.temporalFocus} variant="entity" />
            </div>
        </div>
    );
};
