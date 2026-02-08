import * as THREE from 'three';

// ─── Canvas-based text renderer for Three.js ────────────────────
// Uses a 2D canvas → CanvasTexture to render crisp text as a
// textured plane.  No external font files needed.

export interface TextMeshOptions {
    text: string;
    fontSize?: number;
    fontFamily?: string;
    color?: string;
    maxWidth?: number;       // world units — texture is scaled to fit
    align?: 'left' | 'center' | 'right';
    bold?: boolean;
    opacity?: number;
    backgroundColor?: string | null;
    padding?: number;        // canvas pixels
}

const DEFAULT_OPTS: Required<TextMeshOptions> = {
    text: '',
    fontSize: 32,
    fontFamily: 'Inter, system-ui, sans-serif',
    color: '#E6EDF3',
    maxWidth: 2.4,
    align: 'left',
    bold: false,
    opacity: 1,
    backgroundColor: null,
    padding: 12,
};

/**
 * Create a plane mesh textured with the given text.
 * Returns a THREE.Mesh whose geometry is sized in world units.
 */
export function createTextMesh(opts: TextMeshOptions): THREE.Mesh {
    const o = { ...DEFAULT_OPTS, ...opts };

    // ─── Measure pass ───
    const measure = document.createElement('canvas');
    const mCtx = measure.getContext('2d')!;
    const font = `${o.bold ? 'bold ' : ''}${o.fontSize}px ${o.fontFamily}`;
    mCtx.font = font;

    // Word-wrap
    const lines = wrapText(mCtx, o.text, 512 - o.padding * 2);

    const canvasW = 512;
    const lineH = o.fontSize * 1.35;
    const canvasH = nextPow2(Math.ceil(lines.length * lineH + o.padding * 2));

    // ─── Render pass ───
    const canvas = document.createElement('canvas');
    canvas.width = canvasW;
    canvas.height = canvasH;
    const ctx = canvas.getContext('2d')!;

    if (o.backgroundColor) {
        ctx.fillStyle = o.backgroundColor;
        roundRect(ctx, 0, 0, canvasW, canvasH, 12);
        ctx.fill();
    }

    ctx.font = font;
    ctx.fillStyle = o.color;
    ctx.textBaseline = 'top';
    ctx.textAlign = o.align;

    const x = o.align === 'center' ? canvasW / 2 : o.align === 'right' ? canvasW - o.padding : o.padding;
    lines.forEach((line, i) => {
        ctx.fillText(line, x, o.padding + i * lineH);
    });

    // ─── Texture → Plane ───
    const tex = new THREE.CanvasTexture(canvas);
    tex.minFilter = THREE.LinearFilter;
    tex.needsUpdate = true;

    const aspect = canvasW / canvasH;
    const planeW = o.maxWidth;
    const planeH = planeW / aspect;

    const geo = new THREE.PlaneGeometry(planeW, planeH);
    const mat = new THREE.MeshBasicMaterial({
        map: tex,
        transparent: true,
        opacity: o.opacity,
        side: THREE.DoubleSide,
        depthWrite: false,
    });

    const mesh = new THREE.Mesh(geo, mat);
    // Store dimensions for layout
    mesh.userData.textWidth = planeW;
    mesh.userData.textHeight = planeH;
    return mesh;
}

/**
 * Update an existing text mesh with new text (avoids re-creating geometry).
 * Disposes old texture.
 */
export function updateTextMesh(mesh: THREE.Mesh, opts: TextMeshOptions): void {
    const old = mesh.material as THREE.MeshBasicMaterial;
    old.map?.dispose();
    old.dispose();
    mesh.geometry.dispose();

    const fresh = createTextMesh(opts);
    mesh.geometry = fresh.geometry;
    mesh.material = fresh.material;
    mesh.userData = fresh.userData;
}

// ─── Helpers ────────────────────────────────────────────────────

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
    const words = text.split(' ');
    const lines: string[] = [];
    let current = '';

    for (const word of words) {
        const test = current ? `${current} ${word}` : word;
        if (ctx.measureText(test).width > maxWidth && current) {
            lines.push(current);
            current = word;
        } else {
            current = test;
        }
    }
    if (current) lines.push(current);
    return lines.length ? lines : [''];
}

function nextPow2(v: number): number {
    let p = 64;
    while (p < v) p *= 2;
    return p;
}

function roundRect(
    ctx: CanvasRenderingContext2D,
    x: number, y: number, w: number, h: number, r: number,
) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
}
