// Data-driven spawn factory: spawn(type, x, z, opts) for obstacles, hazards, landmarks, prefabs.
// Injected with createObstacle, createHazardZone, arenaLandmarks, scene via initSpawnFactory to avoid circular imports.

import { deformGeometry, applyMossVertexColors, applyVertexColorLerp, wobble } from '../utils/proceduralMesh.js';

let ctx = null;

const MATERIAL_CACHE = {};

function getMaterial(key) {
    if (MATERIAL_CACHE[key]) return MATERIAL_CACHE[key];
    const map = {
        wall: { color: 0x4a5a6a, roughness: 0.7 },
        platform: { color: 0x5a6a5a, roughness: 0.6 },
        pillar: { color: 0x5a5a7a, roughness: 0.6 },
        cover: { color: 0x4a4a6a, roughness: 0.7 },
        ramp: { color: 0x6a5a8a, roughness: 0.6 },
        slalom: { color: 0x3a5a4a, roughness: 0.8 },
        catwalk: { color: 0x2a4a5a, roughness: 0.75 },
        pod: { color: 0x3a5a6a, roughness: 0.8 }
    };
    const cfg = map[key] || map.wall;
    const mat = new THREE.MeshStandardMaterial({
        color: cfg.color,
        roughness: cfg.roughness ?? 0.7
    });
    MATERIAL_CACHE[key] = mat;
    return mat;
}

/**
 * Initialize the spawn factory with generator context (call from generator.js once).
 * @param {Object} context - { createObstacle, createHazardZone, arenaLandmarks, scene }
 */
export function initSpawnFactory(context) {
    ctx = context;
}

/**
 * Spawn a single object from layout data. Registers with obstacles or arenaLandmarks as appropriate.
 * @param {string} type - "obstacle" | "pillar" | "cover" | "platform" | "wall" | "ramp" | "slalom" | "catwalk" | "hazard" | "landmark" | "coralCluster" | "rockCluster" | ...
 * @param {number} x - world X
 * @param {number} z - world Z
 * @param {Object} opts - type-specific: sizeX, sizeZ, height, rot, scale, materialKey, radius, duration, typeId, variant, etc.
 * @returns {THREE.Object3D|null} created mesh or group
 */
export function spawn(type, x, z, opts = {}) {
    if (!ctx) {
        console.warn('[spawnFactory] initSpawnFactory not called');
        return null;
    }
    const { createObstacle, createHazardZone, arenaLandmarks, scene } = ctx;
    const rot = opts.rot ?? 0;
    const scale = opts.scale ?? 1;
    const materialKey = opts.materialKey || type;

    // --- Obstacles (collision) ---
    const obstacleTypes = ['obstacle', 'pillar', 'cover', 'platform', 'wall', 'ramp', 'slalom', 'catwalk'];
    if (obstacleTypes.includes(type)) {
        const sizeX = opts.sizeX ?? 2;
        const sizeZ = opts.sizeZ ?? opts.sizeX ?? 2;
        const height = opts.height ?? 1.5;
        const mat = getMaterial(opts.materialKey || type);
        const mesh = createObstacle(x, z, sizeX, height, sizeZ, mat);
        if (rot) mesh.rotation.y = rot;
        if (scale !== 1) mesh.scale.setScalar(scale);
        return mesh;
    }

    // --- Hazard ---
    if (type === 'hazard') {
        const radius = opts.radius ?? 4;
        const duration = opts.duration ?? -1;
        return createHazardZone(x, z, radius, duration);
    }

    // --- Landmarks (visual-only) ---
    if (type === 'landmark') {
        const typeId = opts.typeId || opts.variant || 'decal';
        if (typeId === 'resetPad') {
            const radius = opts.radius ?? 12;
            const mesh = new THREE.Mesh(
                new THREE.CircleGeometry(radius, 32),
                new THREE.MeshBasicMaterial({
                    color: 0x3a3a5a,
                    transparent: true,
                    opacity: 0.2,
                    side: THREE.DoubleSide
                })
            );
            mesh.rotation.x = -Math.PI / 2;
            mesh.position.set(x, 0.02, z);
            scene.add(mesh);
            arenaLandmarks.push(mesh);
            return mesh;
        }
        if (typeId === 'decal') {
            const radius = opts.radius ?? 5;
            const color = opts.color ?? 0x3a3a5a;
            const opacity = opts.opacity ?? 0.2;
            const mesh = new THREE.Mesh(
                new THREE.CircleGeometry(radius, 16),
                new THREE.MeshBasicMaterial({
                    color,
                    transparent: true,
                    opacity,
                    side: THREE.DoubleSide
                })
            );
            mesh.rotation.x = -Math.PI / 2;
            mesh.position.set(x, 0.01, z);
            scene.add(mesh);
            arenaLandmarks.push(mesh);
            return mesh;
        }
        if (typeId === 'cardinalLine') {
            const mesh = new THREE.Mesh(
                new THREE.PlaneGeometry(2, 40),
                new THREE.MeshBasicMaterial({
                    color: 0x3a3a5a,
                    transparent: true,
                    opacity: 0.2
                })
            );
            mesh.rotation.x = -Math.PI / 2;
            mesh.rotation.z = opts.rot ?? 0;
            mesh.position.set(x, 0.01, z);
            scene.add(mesh);
            arenaLandmarks.push(mesh);
            return mesh;
        }
        if (typeId === 'dome' || typeId === 'pod') {
            const r = opts.radius ?? 4;
            const geom = new THREE.SphereGeometry(r, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.5);
            const mat = getMaterial('pod');
            const mesh = new THREE.Mesh(geom, mat);
            mesh.position.set(x, 2, z);
            mesh.receiveShadow = true;
            scene.add(mesh);
            arenaLandmarks.push(mesh);
            return mesh;
        }
        // generic landmark: simple decal
        const mesh = new THREE.Mesh(
            new THREE.CircleGeometry(opts.radius ?? 3, 16),
            new THREE.MeshBasicMaterial({
                color: opts.color ?? 0x3a3a5a,
                transparent: true,
                opacity: 0.15,
                side: THREE.DoubleSide
            })
        );
        mesh.rotation.x = -Math.PI / 2;
        mesh.position.set(x, 0.01, z);
        scene.add(mesh);
        arenaLandmarks.push(mesh);
        return mesh;
    }

    // --- Prefabs ---
    if (type === 'coralCluster') {
        const group = createPrefabCoralCluster(opts.seed ?? 0);
        group.position.set(x, 0, z);
        group.rotation.y = rot || Math.random() * Math.PI * 2;
        group.scale.setScalar(scale);
        scene.add(group);
        arenaLandmarks.push(group);
        return group;
    }
    if (type === 'rockCluster' || type === 'rockFormation') {
        const group = createPrefabRockFormation(opts.seed ?? 0);
        group.position.set(x, (Math.random() * 0.05) || 0, z);
        group.rotation.y = rot || Math.random() * Math.PI * 2;
        group.scale.setScalar(scale);
        scene.add(group);
        arenaLandmarks.push(group);
        return group;
    }

    console.warn('[spawnFactory] unknown type:', type);
    return null;
}

// Default coral colors (from UNDERWATER_ASSETS_CONFIG)
const CORAL_BASE = 0xcc7766;
const CORAL_HIGHLIGHT = 0xeeaa99;
const CORAL_TIP = 0x448877;

function randIn(min, max) {
    if (typeof min === 'object' && min.min != null) return min.min + Math.random() * (min.max - min.min);
    return min + Math.random() * (max - min);
}

function createPrefabCoralCluster(seed) {
    const group = new THREE.Group();
    const brainGeom = new THREE.SphereGeometry(0.4, 12, 10);
    deformGeometry(brainGeom, randIn(0.08, 0.15), seed);
    applyVertexColorLerp(brainGeom, CORAL_BASE, CORAL_HIGHLIGHT, (n, p) => Math.max(0, n.y) * 0.6 + wobble(p, 1.5, seed) * 0.25 + 0.25);
    const brainMat = new THREE.MeshBasicMaterial({ vertexColors: true });
    group.add(new THREE.Mesh(brainGeom, brainMat));

    const fanGroup = new THREE.Group();
    for (let i = 0; i < 6; i++) {
        const blade = new THREE.BoxGeometry(0.15, 0.5, 0.02);
        const m = new THREE.MeshBasicMaterial({ vertexColors: true, color: CORAL_BASE });
        const mesh = new THREE.Mesh(blade, m);
        mesh.rotation.y = (i / 6) * Math.PI * 0.6;
        mesh.position.y = 0.25;
        fanGroup.add(mesh);
    }
    fanGroup.position.y = 0.1;
    group.add(fanGroup);

    const tubeCount = 2 + Math.floor(Math.random() * 3);
    for (let t = 0; t < tubeCount; t++) {
        const h = randIn(0.3, 0.6);
        const geom = new THREE.CylinderGeometry(0.06, 0.1, h, 6);
        deformGeometry(geom, randIn(0.03, 0.06), seed + t * 7);
        applyVertexColorLerp(geom, CORAL_BASE, CORAL_TIP, (n, p) => (p.y + h / 2) / h * 0.5 + 0.25);
        const mesh = new THREE.Mesh(geom, new THREE.MeshBasicMaterial({ vertexColors: true }));
        mesh.position.set((Math.random() - 0.5) * 0.4, h / 2, (Math.random() - 0.5) * 0.4);
        group.add(mesh);
    }
    return group;
}

const ROCK_STONE = 0x555566;
const ROCK_MOSS = 0x3b5b3b;

function createPrefabRockFormation(seed) {
    const group = new THREE.Group();
    const n = Math.floor(randIn(2, 5));
    const stoneMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, metalness: 0 });
    for (let r = 0; r < n; r++) {
        const geom = new THREE.SphereGeometry(0.6, 8, 6);
        deformGeometry(geom, randIn(0.12, 0.2), seed + r * 13);
        applyMossVertexColors(geom, ROCK_STONE, ROCK_MOSS, seed + r);
        const mesh = new THREE.Mesh(geom, stoneMat);
        const s = randIn(0.4, 1.2);
        mesh.scale.setScalar(s);
        mesh.position.set((Math.random() - 0.5) * 0.8, 0.3 * s, (Math.random() - 0.5) * 0.8);
        mesh.rotation.set(Math.random() * 0.2, Math.random() * Math.PI * 2, Math.random() * 0.2);
        group.add(mesh);
    }
    return group;
}

/** Get list of spawnable type IDs for debug placement UI */
export function getSpawnableTypes() {
    return [
        'obstacle', 'pillar', 'cover', 'platform', 'wall', 'ramp', 'slalom', 'catwalk',
        'hazard',
        'landmark',
        'coralCluster', 'rockCluster'
    ];
}
