// Shared procedural mesh utilities for organic/deformed geometry and vertex colors.
// Used by pufferkeepCastle, underwater decor (coral, rocks, ruins, shipwreck), etc.

// Pseudo-noise for organic texture (displaces vertices along normals)
export function wobble(v, scale, seed = 0) {
    const t = (v.x * 12.7 + v.y * 7.3 + v.z * 9.1 + seed) * scale;
    return Math.sin(t) * 0.5 + Math.cos(t * 0.7) * 0.5;
}

// Mask: returns 0-1 based on upward-facing + noise. Higher = more of "secondary" color.
export function getMossMask(normal, position, seed = 42) {
    const upwardness = Math.max(0, normal.y);
    const noise = wobble(position, 1.5, seed) * 0.5 + 0.5;
    return Math.min(1, upwardness * 0.7 + noise * 0.4);
}

// Apply vertex colors by lerping colorA and colorB using a mask (e.g. moss = upward + noise).
export function applyMossVertexColors(geometry, stoneColor, mossColor, seed = 42) {
    const positions = geometry.attributes.position;
    const normals = geometry.attributes.normal;
    const colors = new Float32Array(positions.count * 3);

    const stone = new THREE.Color(stoneColor);
    const moss = new THREE.Color(mossColor);
    const temp = new THREE.Color();
    const pos = new THREE.Vector3();
    const norm = new THREE.Vector3();

    for (let i = 0; i < positions.count; i++) {
        pos.set(positions.getX(i), positions.getY(i), positions.getZ(i));
        norm.set(normals.getX(i), normals.getY(i), normals.getZ(i));

        const mossFactor = getMossMask(norm, pos, seed);
        temp.copy(stone).lerp(moss, mossFactor);

        colors[i * 3] = temp.r;
        colors[i * 3 + 1] = temp.g;
        colors[i * 3 + 2] = temp.b;
    }

    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
}

// Generic vertex color lerp: maskFn(normal, position) returns 0-1.
export function applyVertexColorLerp(geometry, colorA, colorB, maskFn) {
    const positions = geometry.attributes.position;
    const normals = geometry.attributes.normal;
    const colors = new Float32Array(positions.count * 3);

    const ca = new THREE.Color(colorA);
    const cb = new THREE.Color(colorB);
    const temp = new THREE.Color();
    const pos = new THREE.Vector3();
    const norm = new THREE.Vector3();

    for (let i = 0; i < positions.count; i++) {
        pos.set(positions.getX(i), positions.getY(i), positions.getZ(i));
        norm.set(normals.getX(i), normals.getY(i), normals.getZ(i));

        const t = maskFn(norm, pos);
        temp.copy(ca).lerp(cb, t);

        colors[i * 3] = temp.r;
        colors[i * 3 + 1] = temp.g;
        colors[i * 3 + 2] = temp.b;
    }

    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
}

// Deform geometry vertices along normals for organic rock/coral look.
export function deformGeometry(geometry, scale, seed = 0) {
    const positions = geometry.attributes.position;
    const normals = geometry.attributes.normal;
    const pos = new THREE.Vector3();
    const norm = new THREE.Vector3();

    for (let i = 0; i < positions.count; i++) {
        pos.set(positions.getX(i), positions.getY(i), positions.getZ(i));
        norm.set(normals.getX(i), normals.getY(i), normals.getZ(i));

        const displacement = wobble(pos, 2.2, seed) * scale;
        pos.addScaledVector(norm, displacement);

        positions.setXYZ(i, pos.x, pos.y, pos.z);
    }

    geometry.computeVertexNormals();
}
