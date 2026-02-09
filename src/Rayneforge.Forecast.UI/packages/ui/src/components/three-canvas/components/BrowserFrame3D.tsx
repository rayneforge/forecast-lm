import React, { useMemo } from 'react';
import { ThreeEvent } from '@react-three/fiber';
import { Html, RoundedBox } from '@react-three/drei';
import { TextLabel, FontSize } from './TextLabel';
import { Theme, toWorld } from './theme3d';
import { useScenePhysics } from './ScenePhysicsContext';

// ─── BrowserFrame3D ─────────────────────────────────────────────
// Renders an embedded iframe inside the 3D scene using drei's Html
// component. Positioned near a node — multiple can coexist.
//
// This is an ephemeral UI element — not tracked in workspace data.

const FRAME_W = 4.0;    // world units
const FRAME_H = 3.0;
const DEPTH   = 0.03;
const IFRAME_PX_W = 640;  // pixel size of the Html container
const IFRAME_PX_H = 480;

export interface BrowserFrame3DProps {
    /** The node this browser frame originated from */
    nodeId: string;
    /** The URL to load in the iframe */
    url: string;
    /** Called to close this frame */
    onClose: (nodeId: string) => void;
}

export const BrowserFrame3D: React.FC<BrowserFrame3DProps> = ({
    nodeId, url, onClose,
}) => {
    const { bodiesRef } = useScenePhysics();

    // Position to the left of the source node
    const position = useMemo<[number, number, number]>(() => {
        const body = bodiesRef.current.get(nodeId);
        if (body) {
            return [toWorld(body.position.x) - 3, -toWorld(body.position.y), 0.05];
        }
        return [-3, 0, 0.05];
    }, [nodeId, bodiesRef]);

    const handleClose = (e: ThreeEvent<MouseEvent>) => {
        e.stopPropagation();
        onClose(nodeId);
    };

    return (
        <group position={position}>
            {/* Panel background */}
            <RoundedBox args={[FRAME_W, FRAME_H, DEPTH]} radius={0.06} smoothness={4}>
                <meshStandardMaterial
                    color={Theme.canvasSurface}
                    transparent
                    opacity={0.96}
                />
            </RoundedBox>

            {/* Accent border */}
            <RoundedBox args={[FRAME_W + 0.03, FRAME_H + 0.03, DEPTH * 0.5]} radius={0.07} smoothness={4}>
                <meshBasicMaterial
                    color={Theme.accentPrimary}
                    transparent
                    opacity={0.2}
                    wireframe
                />
            </RoundedBox>

            {/* Toolbar area */}
            <group position={[-FRAME_W / 2 + 0.14, FRAME_H / 2 - 0.14, DEPTH / 2 + 0.01]}>
                <TextLabel
                    text={url.length > 50 ? url.slice(0, 47) + '…' : url}
                    fontSize={FontSize.meta}
                    color="#8B949E"
                    maxWidth={FRAME_W - 0.8}
                />
            </group>

            {/* Close button */}
            <group
                position={[FRAME_W / 2 - 0.18, FRAME_H / 2 - 0.14, DEPTH / 2 + 0.01]}
                onClick={handleClose}
            >
                <TextLabel
                    text="✕"
                    fontSize={FontSize.headline}
                    color="#8B949E"
                    anchorX="center"
                    anchorY="middle"
                />
            </group>

            {/* Embedded iframe via drei Html */}
            <Html
                position={[0, -0.1, DEPTH / 2 + 0.02]}
                transform
                distanceFactor={4}
                style={{
                    width: `${IFRAME_PX_W}px`,
                    height: `${IFRAME_PX_H}px`,
                    borderRadius: '6px',
                    overflow: 'hidden',
                    background: '#0B0E14',
                }}
            >
                <iframe
                    src={url}
                    title="Source preview"
                    sandbox="allow-scripts allow-same-origin allow-popups"
                    style={{
                        width: '100%',
                        height: '100%',
                        border: 'none',
                        background: '#fff',
                    }}
                />
            </Html>
        </group>
    );
};
