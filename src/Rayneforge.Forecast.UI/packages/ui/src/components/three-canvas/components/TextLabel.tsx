import React from 'react';
import { Text } from '@react-three/drei';

// ─── Declarative R3F text component ─────────────────────────────
// Wraps drei's <Text> with our theme defaults.
// Uses SDF rendering — crisp at any distance, no canvas textures.

export interface TextLabelProps {
    text: string;
    position?: [number, number, number];
    fontSize?: number;
    color?: string;
    maxWidth?: number;
    anchorX?: 'left' | 'center' | 'right';
    anchorY?: 'top' | 'middle' | 'bottom';
    bold?: boolean;
    opacity?: number;
}

export const TextLabel: React.FC<TextLabelProps> = ({
    text,
    position = [0, 0, 0],
    fontSize = 0.12,
    color = '#E6EDF3',
    maxWidth = 2.2,
    anchorX = 'left',
    anchorY = 'top',
    bold = false,
    opacity = 1,
}) => (
    <Text
        position={position}
        fontSize={fontSize}
        color={color}
        maxWidth={maxWidth}
        anchorX={anchorX}
        anchorY={anchorY}
        fontWeight={bold ? 'bold' : 'normal'}
        fillOpacity={opacity}
        depthOffset={-1}
    >
        {text}
    </Text>
);

// ─── Convenience sizes matching our 2D type scale ───────────────

export const FontSize = {
    meta:     0.08,
    body:     0.10,
    headline: 0.12,
    title:    0.16,
} as const;
