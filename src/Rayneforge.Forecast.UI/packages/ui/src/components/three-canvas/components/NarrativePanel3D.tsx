import React, { useState } from 'react';
import { RoundedBox } from '@react-three/drei';
import { TextLabel, FontSize } from './TextLabel';
import { Theme } from './theme3d';

// ─── NarrativePanel3D ───────────────────────────────────────────
// Floating side panel that lists narratives + claims.
// In VR/AR this would be anchored to the user's left-hand space;
// in flat-3D it floats at a fixed world position passed as prop.

export interface NarrativeClaim3D {
    id: string;
    text: string;
    category: string;
}

export interface NarrativeData3D {
    id: string;
    title: string;
    claims: NarrativeClaim3D[];
}

export interface NarrativePanel3DProps {
    narratives: NarrativeData3D[];
    position?: [number, number, number];
    visible?: boolean;
}

const CATEGORY_COLORS: Record<string, string> = {
    Technology: '#00D2FF',
    Politics:   '#FF6B6B',
    Finance:    '#22C55E',
    AI:         '#8A2BE2',
    Default:    '#8B949E',
};

const PANEL_W = 2.8;
const ROW_H = 0.22;
const CLAIM_H = 0.18;

export const NarrativePanel3D: React.FC<NarrativePanel3DProps> = ({
    narratives,
    position = [-6, 1.5, 0],
    visible = true,
}) => {
    const [expandedId, setExpandedId] = useState<string | null>(null);

    if (!visible || narratives.length === 0) return null;

    // Calculate total height
    let totalRows = 0;
    for (const n of narratives) {
        totalRows += 1; // narrative header
        if (expandedId === n.id) totalRows += n.claims.length;
    }
    const panelH = Math.max(1, totalRows * ROW_H + 0.4);

    let yOff = panelH / 2 - 0.22;

    return (
        <group position={position}>
            {/* Panel background */}
            <RoundedBox args={[PANEL_W, panelH, 0.04]} radius={0.08} smoothness={4}>
                <meshStandardMaterial
                    color="#0C1117"
                    transparent
                    opacity={0.85}
                />
            </RoundedBox>

            {/* Title */}
            <TextLabel
                text="Narratives"
                position={[-PANEL_W / 2 + 0.15, yOff, 0.03]}
                fontSize={FontSize.title}
                bold
            />
            {(() => {
                yOff -= 0.3;
                return null;
            })()}

            {narratives.map(narrative => {
                const catColor = CATEGORY_COLORS[narrative.claims[0]?.category ?? 'Default']
                    ?? CATEGORY_COLORS.Default;

                const headerY = yOff;
                yOff -= ROW_H;

                const isExpanded = expandedId === narrative.id;

                return (
                    <group key={narrative.id}>
                        {/* Narrative row */}
                        <group
                            position={[0, headerY, 0.03]}
                            onClick={(e) => {
                                e.stopPropagation();
                                setExpandedId(isExpanded ? null : narrative.id);
                            }}
                        >
                            {/* Category dot */}
                            <mesh position={[-PANEL_W / 2 + 0.2, 0, 0]}>
                                <sphereGeometry args={[0.04, 12, 8]} />
                                <meshBasicMaterial color={catColor} />
                            </mesh>

                            <TextLabel
                                text={narrative.title}
                                position={[-PANEL_W / 2 + 0.35, 0, 0]}
                                fontSize={FontSize.body}
                                maxWidth={PANEL_W - 0.7}
                                anchorY="middle"
                            />
                        </group>

                        {/* Expanded claims */}
                        {isExpanded && narrative.claims.map(claim => {
                            const claimY = yOff;
                            yOff -= CLAIM_H;

                            return (
                                <group key={claim.id} position={[0, claimY, 0.03]}>
                                    <TextLabel
                                        text={`  ${claim.text}`}
                                        position={[-PANEL_W / 2 + 0.45, 0, 0]}
                                        fontSize={FontSize.meta}
                                        maxWidth={PANEL_W - 0.9}
                                        color="#8B949E"
                                        anchorY="middle"
                                    />
                                </group>
                            );
                        })}
                    </group>
                );
            })}
        </group>
    );
};
