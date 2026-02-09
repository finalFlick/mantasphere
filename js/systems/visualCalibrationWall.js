// Visual calibration wall for Debug → Visual tab (exposure, tone map, emissive tuning)
// THREE is global (loaded via script tag in index.html)
import { getArenaBounds } from '../config/arenas.js';

const KEY = 'visualCalibrationWall';

/**
 * Creates a canvas texture with grayscale ramp, RGB patches, and emissive strips.
 * @param {number} size - Canvas width/height (default 512)
 * @returns {THREE.CanvasTexture}
 */
export function makeCalibrationTexture(size = 512) {
    const c = document.createElement('canvas');
    c.width = c.height = size;
    const ctx = c.getContext('2d');

    // Background
    ctx.fillStyle = '#111';
    ctx.fillRect(0, 0, size, size);

    // Grayscale ramp (top ~25%)
    const rampH = Math.floor(size * 0.25);
    for (let x = 0; x < size; x++) {
        const v = Math.floor((x / (size - 1)) * 255);
        ctx.fillStyle = `rgb(${v},${v},${v})`;
        ctx.fillRect(x, 0, 1, rampH);
    }
    ctx.fillStyle = '#fff';
    ctx.font = '18px monospace';
    ctx.fillText('0 → 255 (exposure / tone map)', 10, 20);

    // RGB patches (middle-left)
    const patchY = rampH + 10;
    const patchSize = Math.floor(size * 0.18);
    const patches = [
        ['#ffffff', 'WHITE'],
        ['#ff4444', 'RED'],
        ['#44ff44', 'GREEN'],
        ['#4488ff', 'BLUE'],
        ['#000000', 'BLACK'],
    ];
    patches.forEach(([col, label], i) => {
        const x = 10;
        const y = patchY + i * (patchSize + 10);
        ctx.fillStyle = col;
        ctx.fillRect(x, y, patchSize, patchSize);
        ctx.strokeStyle = 'rgba(255,255,255,0.25)';
        ctx.strokeRect(x, y, patchSize, patchSize);
        ctx.fillStyle = '#ddd';
        ctx.fillText(label, x + patchSize + 12, y + 24);
    });

    // Emissive test strips (right side)
    const stripsX = Math.floor(size * 0.55);
    const stripsW = Math.floor(size * 0.40);
    const stripsY = patchY;
    const stripsH = Math.floor(size * 0.62);
    const stripCount = 6;

    for (let i = 0; i < stripCount; i++) {
        const t = i / (stripCount - 1);
        const y0 = stripsY + Math.floor(i * (stripsH / stripCount));
        const h0 = Math.floor(stripsH / stripCount) - 4;
        const v = Math.floor(40 + t * 215);
        ctx.fillStyle = `rgb(${v},${v},${v})`;
        ctx.fillRect(stripsX, y0, stripsW, h0);
        ctx.fillStyle = '#111';
        ctx.fillText(`E${(t * 2.0).toFixed(2)}`, stripsX + 10, y0 + 24);
    }
    ctx.fillStyle = '#fff';
    ctx.fillText('Emissive strips (label = target intensity)', stripsX, stripsY - 10);

    const tex = new THREE.CanvasTexture(c);
    tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
    tex.anisotropy = 8;
    tex.needsUpdate = true;
    return tex;
}

/**
 * Show or hide the visual calibration wall. Stores reference in scene.userData[visualCalibrationWall].
 * @param {THREE.Scene} scene
 * @param {number} arenaNumber
 * @param {boolean} enabled
 */
export function setVisualCalibrationWall(scene, arenaNumber, enabled) {
    if (!enabled) {
        const existing = scene.userData[KEY];
        if (existing) {
            scene.remove(existing);
            existing.geometry.dispose();
            if (existing.material.map) existing.material.map.dispose();
            existing.material.dispose();
            scene.userData[KEY] = null;
        }
        return;
    }

    // Remove existing so arena changes can reposition
    const existing = scene.userData[KEY];
    if (existing) {
        scene.remove(existing);
        existing.geometry.dispose();
        if (existing.material.map) existing.material.map.dispose();
        existing.material.dispose();
        scene.userData[KEY] = null;
    }

    const bound = getArenaBounds(arenaNumber);
    const inset = 1.0;
    const width = Math.min(bound * 1.6, 140);
    const height = Math.min(bound * 0.6, 60);

    const geo = new THREE.PlaneGeometry(width, height, 1, 1);
    const map = makeCalibrationTexture(512);
    const mat = new THREE.MeshStandardMaterial({
        map,
        color: 0xffffff,
        roughness: 1.0,
        metalness: 0.0,
        emissive: 0xffffff,
        emissiveIntensity: 0.0,
    });

    const plane = new THREE.Mesh(geo, mat);
    plane.position.set(0, height * 0.5 + 0.25, -bound + inset);
    plane.rotation.y = 0;
    plane.renderOrder = 1;
    plane.frustumCulled = false;

    scene.add(plane);
    scene.userData[KEY] = plane;
}
