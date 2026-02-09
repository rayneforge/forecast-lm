import React, { useRef, useCallback, useState, useMemo } from 'react';
import * as THREE from 'three';
import { ThreeEvent } from '@react-three/fiber';
import { RoundedBox } from '@react-three/drei';
import {
    CanvasNode, CanvasEdge, CanvasNodeType,
} from '../../../canvas/CanvasTypes';
import { TextLabel, FontSize } from './TextLabel';
import { Theme, toWorld } from './theme3d';
import { useScenePhysics } from './ScenePhysicsContext';

// ─── DetailView3D ───────────────────────────────────────────────
// Floating 3D panel showing node details. Positioned near the node.
// Multiple instances can coexist — tracked by ephemeral state
// in ThreeCanvasView (a Set<string> of expanded node IDs).

const PANEL_W = 3.2;
const PANEL_DEPTH = 0.03;
const PANEL_BG = Theme.canvasSurface;
const PADDING = 0.14;
const LINE_H = 0.14;  // spacing between text lines

// ─── Helpers ────────────────────────────────────────────────────

const TYPE_COLORS: Record<CanvasNodeType, number> = {
    article:   0x00D2FF,
    claim:     0xF0883E,
    entity:    0x8A2BE2,
    narrative: 0x58A6FF,
    note:      0x8B949E,
};

function nodeDisplayName(n: CanvasNode): string {
    switch (n.type) {
        case 'article':   return n.data.title;
        case 'claim':     return n.data.normalizedText;
        case 'entity':    return n.data.name;
        case 'narrative': return n.data.label;
        case 'note':      return n.data.title;
    }
}

function nodeSubtext(n: CanvasNode): string {
    switch (n.type) {
        case 'article':   return n.data.source.name;
        case 'claim':     return n.data.articleTitle ?? '';
        case 'entity':    return n.data.type;
        case 'narrative': return n.data.category;
        default:          return '';
    }
}

function getRelated(
    nodeId: string,
    edges: CanvasEdge[],
    nodes: CanvasNode[],
): CanvasNode[] {
    const ids = new Set<string>();
    for (const e of edges) {
        if (e.source === nodeId) ids.add(e.target);
        if (e.target === nodeId) ids.add(e.source);
    }
    return nodes.filter(n => ids.has(n.id));
}

// ─── Props ──────────────────────────────────────────────────────

export interface DetailView3DProps {
    node: CanvasNode;
    edges: CanvasEdge[];
    nodes: CanvasNode[];
    onClose: (id: string) => void;
    onSelectNode: (id: string) => void;
    /** Called when user clicks the source-link button */
    onOpenLink?: (url: string) => void;
    /** Trigger propagate layout from this node */
    onVisualize?: (nodeId: string) => void;
}

export const DetailView3D: React.FC<DetailView3DProps> = ({
    node, edges, nodes, onClose, onSelectNode, onOpenLink, onVisualize,
}) => {
    const { bodiesRef } = useScenePhysics();

    // Position to the right of the node
    const position = useMemo<[number, number, number]>(() => {
        const body = bodiesRef.current.get(node.id);
        const px = body ? toWorld(body.position.x) : toWorld(node.position.x);
        const py = body ? -toWorld(body.position.y) : -toWorld(node.position.y);
        return [px + 2, py, 0.05];
    }, [node.id, node.position, bodiesRef]);

    const related = useMemo(
        () => getRelated(node.id, edges, nodes),
        [node.id, edges, nodes],
    );

    // Build content lines
    const lines = useMemo(() => {
        const result: { text: string; color: string; bold?: boolean; clickId?: string }[] = [];

        // Type badge
        result.push({ text: node.type.toUpperCase(), color: '#00D2FF', bold: true });

        // Title
        result.push({ text: nodeDisplayName(node), color: '#E6EDF3', bold: true });

        // Subtext
        const sub = nodeSubtext(node);
        if (sub) result.push({ text: sub, color: '#8B949E' });

        // Type-specific
        if (node.type === 'article' && node.data.description) {
            result.push({ text: '', color: '#484F58' }); // spacer
            result.push({ text: node.data.description.slice(0, 120) + '…', color: '#8B949E' });
        }
        if (node.type === 'claim') {
            result.push({ text: '', color: '#484F58' });
            result.push({ text: `"${node.data.normalizedText}"`, color: '#E6EDF3' });
        }
        if (node.type === 'narrative' && node.data.justification) {
            result.push({ text: '', color: '#484F58' });
            result.push({ text: node.data.justification.slice(0, 140) + '…', color: '#8B949E' });
        }
        if (node.type === 'entity' && node.data.description) {
            result.push({ text: '', color: '#484F58' });
            result.push({ text: node.data.description, color: '#8B949E' });
        }

        // Related section
        if (related.length > 0) {
            result.push({ text: '', color: '#484F58' });
            result.push({ text: `RELATED (${related.length})`, color: '#484F58', bold: true });
            for (const r of related.slice(0, 8)) {
                result.push({
                    text: `• ${nodeDisplayName(r)}`,
                    color: '#8B949E',
                    clickId: r.id,
                });
            }
            if (related.length > 8) {
                result.push({ text: `  +${related.length - 8} more`, color: '#484F58' });
            }
        }

        return result;
    }, [node, related]);

    const panelH = Math.max(1.5, (lines.length + 1) * LINE_H + PADDING * 2);

    const handleClose = (e: ThreeEvent<MouseEvent>) => {
        e.stopPropagation();
        onClose(node.id);
    };

    return (
        <group position={position}>
            {/* Panel background */}
            <RoundedBox args={[PANEL_W, panelH, PANEL_DEPTH]} radius={0.06} smoothness={4}>
                <meshStandardMaterial
                    color={PANEL_BG}
                    transparent
                    opacity={0.94}
                />
            </RoundedBox>

            {/* Accent border */}
            <RoundedBox args={[PANEL_W + 0.03, panelH + 0.03, PANEL_DEPTH * 0.5]} radius={0.07} smoothness={4}>
                <meshBasicMaterial
                    color={TYPE_COLORS[node.type] ?? Theme.accentPrimary}
                    transparent
                    opacity={0.25}
                    wireframe
                />
            </RoundedBox>

            {/* Close button (top-right) */}
            <group
                position={[PANEL_W / 2 - 0.18, panelH / 2 - 0.14, PANEL_DEPTH / 2 + 0.01]}
                onClick={handleClose}
            >
                <TextLabel
                    text="✕"
                    position={[0, 0, 0]}
                    fontSize={FontSize.headline}
                    color="#8B949E"
                    anchorX="center"
                    anchorY="middle"
                />
            </group>

            {/* Content lines */}
            {lines.map((line, i) => (
                <group
                    key={i}
                    position={[
                        -PANEL_W / 2 + PADDING,
                        panelH / 2 - PADDING - i * LINE_H,
                        PANEL_DEPTH / 2 + 0.01,
                    ]}
                    onClick={line.clickId ? (e: ThreeEvent<MouseEvent>) => {
                        e.stopPropagation();
                        onSelectNode(line.clickId!);
                    } : undefined}
                >
                    <TextLabel
                        text={line.text}
                        fontSize={line.bold ? FontSize.body : FontSize.meta}
                        color={line.color}
                        maxWidth={PANEL_W - PADDING * 2}
                        bold={line.bold}
                    />
                </group>
            ))}

            {/* Source link button (for articles/claims) */}
            {node.type === 'article' && node.data.url && onOpenLink && (
                <group
                    position={[onVisualize ? -0.5 : 0, -panelH / 2 + 0.18, PANEL_DEPTH / 2 + 0.01]}
                    onClick={(e: ThreeEvent<MouseEvent>) => {
                        e.stopPropagation();
                        onOpenLink(node.data.url);
                    }}
                >
                    <RoundedBox args={[1.4, 0.24, 0.01]} radius={0.04} smoothness={3}>
                        <meshBasicMaterial color={Theme.accentSoft} transparent opacity={0.6} />
                    </RoundedBox>
                    <TextLabel
                        text="🌐 View Source"
                        position={[0, 0, 0.01]}
                        fontSize={FontSize.body}
                        color="#00D2FF"
                        anchorX="center"
                        anchorY="middle"
                    />
                </group>
            )}

            {/* Visualize button — trigger propagate layout from this node */}
            {onVisualize && (
                <group
                    position={[
                        node.type === 'article' && node.data.url && onOpenLink ? 0.5 : 0,
                        -panelH / 2 + 0.18,
                        PANEL_DEPTH / 2 + 0.01,
                    ]}
                    onClick={(e: ThreeEvent<MouseEvent>) => {
                        e.stopPropagation();
                        onVisualize(node.id);
                    }}
                >
                    <RoundedBox args={[1.4, 0.24, 0.01]} radius={0.04} smoothness={3}>
                        <meshBasicMaterial color={Theme.accentSoft} transparent opacity={0.6} />
                    </RoundedBox>
                    <TextLabel
                        text="⟐ Visualize"
                        position={[0, 0, 0.01]}
                        fontSize={FontSize.body}
                        color="#58A6FF"
                        anchorX="center"
                        anchorY="middle"
                    />
                </group>
            )}
        </group>
    );
};
