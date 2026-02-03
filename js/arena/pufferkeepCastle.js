// Pufferkeep Castle - Arena 1 decorative landmark
// The throne of the King Red Puffer
// Purely visual - no gameplay impact, no collision

import { scene } from '../core/scene.js';

// ==================== UTILITIES ====================

// Pseudo-noise for organic stone texture (displaces vertices along normals)
function wobble(v, scale, seed = 0) {
    const t = (v.x * 12.7 + v.y * 7.3 + v.z * 9.1 + seed) * scale;
    return Math.sin(t) * 0.5 + Math.cos(t * 0.7) * 0.5;
}

// Moss mask: returns 0-1 based on upward-facing + noise
// Higher values = more moss (green vertex color)
function getMossMask(normal, position, seed = 42) {
    // Upward-facing surfaces get more moss
    const upwardness = Math.max(0, normal.y);
    // Add noise variation
    const noise = wobble(position, 1.5, seed) * 0.5 + 0.5;
    // Combine: mostly upward surfaces, with some noise variation
    return Math.min(1, upwardness * 0.7 + noise * 0.4);
}

// Apply vertex colors for moss effect to a geometry
function applyMossVertexColors(geometry, stoneColor, mossColor, seed = 42) {
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

// Deform geometry vertices along normals for organic rock look
function deformGeometry(geometry, scale, seed = 0) {
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

// ==================== MATERIALS (module-scoped for safe disposal) ====================

let ownedMaterials = [];

function createStoneMaterial() {
    const mat = new THREE.MeshStandardMaterial({
        color: 0x555566,
        roughness: 0.95,
        metalness: 0.0,
        vertexColors: true
    });
    ownedMaterials.push(mat);
    return mat;
}

function createDarkMaterial() {
    const mat = new THREE.MeshStandardMaterial({
        color: 0x0a0a0a,
        roughness: 1.0,
        metalness: 0.0
    });
    ownedMaterials.push(mat);
    return mat;
}

function createCrownMaterial() {
    // Matte old gold - low contrast, not attention-stealing
    const mat = new THREE.MeshStandardMaterial({
        color: 0x8a7a44,
        roughness: 0.7,
        metalness: 0.3,
        // No emissive - avoid looking like an objective
    });
    ownedMaterials.push(mat);
    return mat;
}

// ==================== GEOMETRY CREATION ====================

function createMainGate(stoneMat, darkMat) {
    const gateGroup = new THREE.Group();
    
    // Gate arch - tube along semicircle curve
    const archPoints = [];
    for (let i = 0; i <= 12; i++) {
        const angle = (i / 12) * Math.PI;
        archPoints.push(new THREE.Vector3(
            Math.cos(angle) * 1.2,
            Math.sin(angle) * 1.0 + 0.1,
            0
        ));
    }
    const archCurve = new THREE.CatmullRomCurve3(archPoints);
    const archGeom = new THREE.TubeGeometry(archCurve, 32, 0.35, 8, false);
    
    // Deform for organic stone look
    deformGeometry(archGeom, 0.06, 13);
    
    // Apply moss vertex colors
    applyMossVertexColors(archGeom, 0x555566, 0x3b5b3b, 17);
    
    const archMesh = new THREE.Mesh(archGeom, stoneMat);
    archMesh.position.set(0, 0.3, 0);
    gateGroup.add(archMesh);
    
    // Gate interior - dark cylinder for depth illusion
    const interiorGeom = new THREE.CylinderGeometry(0.7, 0.7, 0.6, 16, 1, true);
    const interiorMesh = new THREE.Mesh(interiorGeom, darkMat);
    interiorMesh.rotation.z = Math.PI / 2;
    interiorMesh.position.set(0, 0.55, 0);
    gateGroup.add(interiorMesh);
    
    // Deep back plane - guarantees hollow read
    const backPlaneGeom = new THREE.CircleGeometry(0.65, 16);
    const backPlaneMesh = new THREE.Mesh(backPlaneGeom, darkMat);
    backPlaneMesh.position.set(0, 0.55, -0.35);
    gateGroup.add(backPlaneMesh);
    
    return gateGroup;
}

function createTurret(stoneMat, x) {
    const turretGroup = new THREE.Group();
    
    // Main tower cylinder
    const towerGeom = new THREE.CylinderGeometry(0.5, 0.55, 1.8, 12);
    deformGeometry(towerGeom, 0.04, x * 7);
    applyMossVertexColors(towerGeom, 0x555566, 0x3b5b3b, x * 11);
    
    const tower = new THREE.Mesh(towerGeom, stoneMat);
    tower.position.y = 0.9;
    turretGroup.add(tower);
    
    // Turret cap (slightly wider)
    const capGeom = new THREE.CylinderGeometry(0.55, 0.5, 0.15, 12);
    applyMossVertexColors(capGeom, 0x555566, 0x3b5b3b, x * 13);
    const cap = new THREE.Mesh(capGeom, stoneMat);
    cap.position.y = 1.85;
    turretGroup.add(cap);
    
    turretGroup.position.x = x;
    return turretGroup;
}

function createCrenellations(stoneMat) {
    // Use InstancedMesh for performance
    const crenGeom = new THREE.BoxGeometry(0.15, 0.2, 0.15);
    applyMossVertexColors(crenGeom, 0x555566, 0x3b5b3b, 99);
    
    // 8 crenellations per turret * 2 turrets + 6 on wall = 22 total
    const crenCount = 22;
    const crenMesh = new THREE.InstancedMesh(crenGeom, stoneMat, crenCount);
    
    const matrix = new THREE.Matrix4();
    const position = new THREE.Vector3();
    const rotation = new THREE.Quaternion();
    const scale = new THREE.Vector3(1, 1, 1);
    
    let idx = 0;
    
    // Left turret crenellations (8 around edge)
    for (let i = 0; i < 8; i++) {
        const angle = (i / 8) * Math.PI * 2;
        position.set(
            -1.8 + Math.cos(angle) * 0.45,
            1.95,
            Math.sin(angle) * 0.45
        );
        matrix.compose(position, rotation, scale);
        crenMesh.setMatrixAt(idx++, matrix);
    }
    
    // Right turret crenellations (8 around edge)
    for (let i = 0; i < 8; i++) {
        const angle = (i / 8) * Math.PI * 2;
        position.set(
            1.8 + Math.cos(angle) * 0.45,
            1.95,
            Math.sin(angle) * 0.45
        );
        matrix.compose(position, rotation, scale);
        crenMesh.setMatrixAt(idx++, matrix);
    }
    
    // Wall crenellations (6 along top)
    for (let i = 0; i < 6; i++) {
        position.set(
            -1.0 + (i / 5) * 2.0,
            1.55,
            -0.2
        );
        matrix.compose(position, rotation, scale);
        crenMesh.setMatrixAt(idx++, matrix);
    }
    
    crenMesh.instanceMatrix.needsUpdate = true;
    return crenMesh;
}

function createCurtainWall(stoneMat) {
    // Low wall connecting turrets
    const wallGeom = new THREE.BoxGeometry(2.4, 1.2, 0.4);
    deformGeometry(wallGeom, 0.03, 27);
    applyMossVertexColors(wallGeom, 0x555566, 0x3b5b3b, 31);
    
    const wall = new THREE.Mesh(wallGeom, stoneMat);
    wall.position.set(0, 0.7, -0.25);
    return wall;
}

function createCrownCrest(crownMat) {
    const crownGroup = new THREE.Group();
    
    // Crown base ring
    const ringGeom = new THREE.TorusGeometry(0.25, 0.04, 6, 16);
    const ring = new THREE.Mesh(ringGeom, crownMat);
    ring.rotation.x = Math.PI / 2;
    crownGroup.add(ring);
    
    // Crown points (5 small cones)
    const pointGeom = new THREE.ConeGeometry(0.06, 0.18, 4);
    for (let i = 0; i < 5; i++) {
        const angle = (i / 5) * Math.PI * 2 - Math.PI / 2;
        const point = new THREE.Mesh(pointGeom, crownMat);
        point.position.set(
            Math.cos(angle) * 0.25,
            0.09,
            Math.sin(angle) * 0.25
        );
        crownGroup.add(point);
    }
    
    // Position above gate
    crownGroup.position.set(0, 1.4, 0.15);
    crownGroup.scale.setScalar(0.8);
    
    return crownGroup;
}

function createBaseRocks(stoneMat) {
    // Use InstancedMesh for scattered rock lumps
    const rockGeom = new THREE.IcosahedronGeometry(0.25, 1);
    applyMossVertexColors(rockGeom, 0x555566, 0x3b5b3b, 77);
    
    const rockCount = 16;
    const rockMesh = new THREE.InstancedMesh(rockGeom, stoneMat, rockCount);
    
    const matrix = new THREE.Matrix4();
    const position = new THREE.Vector3();
    const rotation = new THREE.Quaternion();
    const euler = new THREE.Euler();
    const scale = new THREE.Vector3();
    
    // Seeded random for consistent placement
    const seededRandom = (seed) => {
        const x = Math.sin(seed * 127.1) * 43758.5453;
        return x - Math.floor(x);
    };
    
    for (let i = 0; i < rockCount; i++) {
        // Scatter around base, more at front
        const angle = seededRandom(i * 3) * Math.PI * 2;
        const radius = 1.5 + seededRandom(i * 7) * 1.2;
        const zBias = seededRandom(i * 11) > 0.5 ? 0.3 : -0.2;
        
        position.set(
            Math.cos(angle) * radius,
            0.15 + seededRandom(i * 13) * 0.15,
            Math.sin(angle) * radius * 0.6 + zBias
        );
        
        euler.set(
            seededRandom(i * 17) * Math.PI,
            seededRandom(i * 19) * Math.PI,
            seededRandom(i * 23) * Math.PI
        );
        rotation.setFromEuler(euler);
        
        const s = 0.6 + seededRandom(i * 29) * 0.8;
        scale.set(s, s * 0.7, s);
        
        matrix.compose(position, rotation, scale);
        rockMesh.setMatrixAt(i, matrix);
    }
    
    rockMesh.instanceMatrix.needsUpdate = true;
    return rockMesh;
}

function createMoatGroove(stoneMat) {
    // Carved groove around base - NOT a glowing ring
    // Uses a flat, dark, low-contrast ring that reads as carved stone
    const grooveGroup = new THREE.Group();
    
    // Inner edge of groove
    const innerGeom = new THREE.TorusGeometry(2.2, 0.08, 4, 32);
    applyMossVertexColors(innerGeom, 0x333344, 0x2a3a2a, 41);
    const inner = new THREE.Mesh(innerGeom, stoneMat);
    inner.rotation.x = Math.PI / 2;
    inner.position.y = 0.02;
    grooveGroup.add(inner);
    
    // Outer edge of groove (slightly larger)
    const outerGeom = new THREE.TorusGeometry(2.5, 0.06, 4, 32);
    applyMossVertexColors(outerGeom, 0x333344, 0x2a3a2a, 43);
    const outer = new THREE.Mesh(outerGeom, stoneMat);
    outer.rotation.x = Math.PI / 2;
    outer.position.y = 0.02;
    grooveGroup.add(outer);
    
    return grooveGroup;
}

// ==================== MAIN CREATION FUNCTION ====================

export function createPufferkeepCastle() {
    const group = new THREE.Group();
    
    // Create materials
    const stoneMat = createStoneMaterial();
    const darkMat = createDarkMaterial();
    const crownMat = createCrownMaterial();
    
    // Build castle components
    const gate = createMainGate(stoneMat, darkMat);
    group.add(gate);
    
    const leftTurret = createTurret(stoneMat, -1.8);
    group.add(leftTurret);
    
    const rightTurret = createTurret(stoneMat, 1.8);
    group.add(rightTurret);
    
    const crenellations = createCrenellations(stoneMat);
    group.add(crenellations);
    
    const wall = createCurtainWall(stoneMat);
    group.add(wall);
    
    const crown = createCrownCrest(crownMat);
    group.add(crown);
    
    const rocks = createBaseRocks(stoneMat);
    group.add(rocks);
    
    const moat = createMoatGroove(stoneMat);
    group.add(moat);
    
    return group;
}

// ==================== LIFECYCLE ====================

let castleMesh = null;

export function addPufferkeepCastle() {
    if (castleMesh) return;
    
    castleMesh = createPufferkeepCastle();
    
    // Position: center-back of arena
    castleMesh.position.set(0, 0, -42);
    
    // Scale to fit arena backdrop
    castleMesh.scale.setScalar(3.5);
    
    scene.add(castleMesh);
}

export function removePufferkeepCastle() {
    if (!castleMesh) return;
    
    // Dispose geometries
    castleMesh.traverse(child => {
        if (child.geometry) {
            child.geometry.dispose();
        }
    });
    
    // Dispose only materials we own (tracked in module)
    ownedMaterials.forEach(mat => {
        if (mat) mat.dispose();
    });
    ownedMaterials = [];
    
    scene.remove(castleMesh);
    castleMesh = null;
}

export function isCastleActive() {
    return castleMesh !== null;
}
