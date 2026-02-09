// ─── Shared 3D Theme Constants ──────────────────────────────────
// Mirrors _design-tokens.scss for use in Three.js materials.
// All colours are hex integers for THREE.Color / MeshBasicMaterial.

export const Theme = {
    // Canvas
    canvasDefault:  0x0B0E14,
    canvasSurface:  0x151921,

    // Text
    textPrimary:    0xE6EDF3,
    textSecondary:  0x8B949E,
    textMuted:      0x484F58,

    // Accent
    accentPrimary:  0x00D2FF,
    accentSoft:     0x003344,   // low-alpha equivalent for solid meshes
    accentHover:    0x58A6FF,

    // Semantic / node colours
    noteGold:       0xD29922,
    entityViolet:   0x8A2BE2,
    narrativeGreen: 0x3FB950,
    claimOrange:    0xF0883E,
    groupCyan:      0x00D2FF,

    // Edges
    edgeLink:       0x00D2FF,
    edgeRelation:   0x58A6FF,
    edgeBridge:     0x8B949E,

    // Selection glow
    selectionGlow:  0x00D2FF,

    // Narrative category colours (matches NarrativePane)
    narrativeColors: {
        OptimisticProgress: 0x00D2FF,
        RiskSafety:         0xF85149,
        LaborDisplacement:  0xD29922,
        NationalSecurity:   0xF0883E,
        MarketFinance:      0x58A6FF,
        RightsEthics:       0xBC8CFF,
        TechnicalRealism:   0x8B949E,
        MoralPanic:         0xFF7B72,
    } as Record<string, number>,
} as const;

// ─── Spatial conversion ─────────────────────────────────────────
// 2D canvas uses pixel coords (0–800+), 3D uses world units.
// Scale factor: 100px ≈ 1 world unit

export const PX_TO_WORLD = 0.01;

/** Convert a 2D canvas position to 3D world coords */
export function toWorld(px: number): number {
    return px * PX_TO_WORLD;
}

// ─── Node sizing (world units) ──────────────────────────────────

export const NodeSize = {
    article:    { w: 2.6, h: 1.2, depth: 0.06 },
    note:       { w: 2.2, h: 1.0, depth: 0.04 },
    entity:     { w: 2.0, h: 0.9, depth: 0.05 },
    narrative:  { w: 2.8, h: 1.3, depth: 0.06 },
    claim:      { w: 2.4, h: 1.0, depth: 0.04 },
    group:      { padding: 0.3, depth: 0.02 },
} as const;
