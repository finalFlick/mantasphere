import { scene, ground, resizeGroundForArena, applyArenaVisualProfile } from '../core/scene.js';
import { gameState } from '../core/gameState.js';
import { obstacles, hazardZones, arenaWalls, arenaZones, arenaEvents } from '../core/entities.js';
import { ARENA_CONFIG, getArenaBounds, getSpeedBowlsForArena, BOWL_HOLE_RADIUS } from '../config/arenas.js';
import { setVisualCalibrationWall } from '../systems/visualCalibrationWall.js';
import { cachePillarPositions } from '../entities/enemies.js';
import { initAmbience, cleanupAmbience } from '../systems/ambience.js';
import { initUnderwaterAssets, cleanupUnderwaterAssets } from '../systems/underwaterAssets.js';
import { clearAllPickups } from '../systems/pickups.js';
import { initArena1ChaseState, resetArena1ChaseState } from '../core/gameState.js';
import { initArenaZonesForArena } from '../systems/arenaZones.js';
import { addPufferkeepCastle, removePufferkeepCastle } from './pufferkeepCastle.js';
import { initSpawnFactory, spawn } from './spawnFactory.js';
import { getArenaLayout } from '../config/arenaLayouts.js';
import { deformGeometry, applyMossVertexColors } from '../utils/proceduralMesh.js';
import { Textures, applyPbr, ensureUv2 } from '../systems/textures.js';
import { TUNING } from '../config/tuning.js';
import { applyEmissiveMultiplier } from '../systems/materialUtils.js';

// Arena landmarks (visual-only, no collision)
const arenaLandmarks = [];

function buildFromLayout(layout) {
    initSpawnFactory({ createObstacle, createHazardZone, arenaLandmarks, scene });
    (layout.objects || []).forEach(entry => {
        spawn(entry.type, entry.x, entry.z, entry);
    });
    (layout.prefabs || []).forEach(entry => {
        spawn(entry.type, entry.x, entry.z, entry);
    });
}

/** Exposed for debug placement editor so it can init the spawn factory when placement mode is enabled. */
export function getSpawnFactoryContext() {
    return { createObstacle, createHazardZone, arenaLandmarks, scene };
}

export function generateArena(arenaNumber) {
    clearArenaGeometry();
    clearAllPickups();  // Clear XP gems and hearts to prevent carryover

    const arenaNum = Math.min(arenaNumber, 6);
    const arenaData = ARENA_CONFIG.arenas[arenaNum];

    resizeGroundForArena(arenaNum);
    createBoundaryWalls(arenaNum);

    const layout = getArenaLayout(arenaNum);
    if (layout) {
        buildFromLayout(layout);
        if (arenaNum === 1) {
            addArena1SkateParkBowls();
            addPufferkeepCastle();
            addArena1ZoneDecals();
        }
    } else {
        if (arenaData.features.includes('pillars')) addPillars(arenaNum);
        if (arenaData.features.includes('vertical')) addVerticalElements(arenaNum);
        if (arenaData.features.includes('platforms')) addPlatforms(arenaNum);
        if (arenaData.features.includes('tunnels')) addTunnelWalls(arenaNum);
        if (arenaData.features.includes('hazards')) addHazardZones(arenaNum);
        if (arenaData.features.includes('landmarks')) {
            addArena1Landmarks();
            if (arenaNum === 1) {
                addArena1SkateParkBowls();
                addArena1SkateparkLayout();
                addArena1CityDistrict();
            }
        }
    }
    if (arenaData.features.includes('multiLevel')) {
        addResetPads(arenaNum);
        addPlatformHeightIndicators(arenaNum);
    }
    
    // Arena 6: Add safe bailout zone marker at center
    if (arenaNum === 6) {
        addSafeBailoutMarker();
    }
    
    if (ground && ground.material) {
        // Only tint ground when there is no texture map; with a map, use groundAlbedoMultiplier
        if (!ground.material.map) {
            ground.material.color.setHex(arenaData.color);
        } else {
            const albedo = Number(TUNING.groundAlbedoMultiplier ?? 1.0);
            ground.material.color.setRGB(albedo, albedo, albedo);
        }
    }

    // Draw floor-level landmarks after ground to avoid z-fighting
    arenaLandmarks.forEach(mesh => { mesh.renderOrder = 1; });

    // Cache pillar positions for pillar hopper enemies
    cachePillarPositions();
    
    // Initialize underwater ambience (bubbles, kelp, fish) with bound-scaled radii
    initAmbience(arenaNum);

    // Initialize underwater decorative assets (coral, rocks, life, effects) with bound-scaled placement
    initUnderwaterAssets(getArenaBounds(arenaNum), arenaNum);

    applyArenaVisualProfile(arenaNum);

    initArenaZonesForArena(arenaNum);

    // Initialize Arena 1 boss chase state (boss appears multiple times)
    if (arenaNum === 1) {
        initArena1ChaseState();
    } else {
        resetArena1ChaseState();  // Clear chase state for other arenas
    }

    applyEmissiveMultiplier(scene);

    if (gameState.debugShowCalibrationWall) {
        setVisualCalibrationWall(scene, arenaNum, true);
    }
}

export function clearArenaGeometry() {
    // Clear obstacles
    obstacles.forEach(obs => {
        if (obs.geometry) obs.geometry.dispose();
        if (obs.material) obs.material.dispose();
        scene.remove(obs);
    });
    obstacles.length = 0;
    
    // Clear arena walls
    arenaWalls.forEach(wall => {
        if (wall.geometry) wall.geometry.dispose();
        if (wall.material) wall.material.dispose();
        scene.remove(wall);
    });
    arenaWalls.length = 0;
    
    // Clear hazard zones
    hazardZones.forEach(hz => {
        if (hz.geometry) hz.geometry.dispose();
        if (hz.material) hz.material.dispose();
        scene.remove(hz);
    });
    hazardZones.length = 0;
    
    // Clear arena landmarks (visual-only elements)
    arenaLandmarks.forEach(lm => {
        if (lm.geometry) lm.geometry.dispose();
        if (lm.material) lm.material.dispose();
        scene.remove(lm);
    });
    arenaLandmarks.length = 0;
    
    arenaZones.length = 0;
    arenaEvents.forEach(ev => {
        if (ev.mesh) {
            scene.remove(ev.mesh);
            if (ev.mesh.geometry) ev.mesh.geometry.dispose();
            if (ev.mesh.material) ev.mesh.material.dispose();
        }
    });
    arenaEvents.length = 0;
    
    // Clear Pufferkeep Castle (Arena 1 landmark)
    removePufferkeepCastle();
    
    // Clear underwater ambience
    cleanupAmbience();

    // Clear underwater decorative assets
    cleanupUnderwaterAssets();
}

function addPillars(arenaNum) {
    const pillarMat = new THREE.MeshStandardMaterial({ color: 0x5a5a7a, roughness: 0.6 });
    
    // Arena 2 gets TALL unclimbable pillars with ASYMMETRIC layout
    const pillarHeight = (arenaNum === 2) ? 8 : 3 + arenaNum * 0.5;
    
    if (arenaNum === 2) {
        // ASYMMETRIC outer ring - vary radius and angles to break "solved loop"
        const outerPillars = [
            { angle: 0, radius: 18 },
            { angle: Math.PI * 0.27, radius: 17 },      // Slightly inward, non-uniform spacing
            { angle: Math.PI * 0.5, radius: 19 },       // Slightly outward
            { angle: Math.PI * 0.73, radius: 18 },
            { angle: Math.PI, radius: 17 },
            { angle: Math.PI * 1.25, radius: 19 },
            { angle: Math.PI * 1.55, radius: 18 },
            { angle: Math.PI * 1.8, radius: 17 }
        ];
        
        outerPillars.forEach(p => {
            createObstacle(
                Math.cos(p.angle) * p.radius,
                Math.sin(p.angle) * p.radius,
                2,
                pillarHeight,
                2,
                pillarMat
            );
        });
        
        // ASYMMETRIC inner ring - 3 pillars instead of 4 to break symmetry
        const innerPillars = [
            { angle: Math.PI * 0.3, radius: 10 },
            { angle: Math.PI * 1.0, radius: 9 },
            { angle: Math.PI * 1.6, radius: 11 }
        ];
        
        innerPillars.forEach(p => {
            createObstacle(
                Math.cos(p.angle) * p.radius,
                Math.sin(p.angle) * p.radius,
                2,
                8,
                2,
                pillarMat
            );
        });
    } else {
        // Standard symmetric pillars for other arenas
        const count = 4 + arenaNum * 2;
        const radius = 18;
        
        for (let i = 0; i < count; i++) {
            const angle = (i / count) * Math.PI * 2;
            createObstacle(
                Math.cos(angle) * radius,
                Math.sin(angle) * radius,
                2,
                pillarHeight,
                2,
                pillarMat
            );
        }
    }
    
    // Cover blocks (low, can't stand on)
    const coverMat = new THREE.MeshStandardMaterial({ color: 0x4a4a6a, roughness: 0.7 });
    
    // Arena 2: Offset cover blocks from corners to prevent camping, add "leak" gaps
    // Other arenas: Standard corner positions
    const coverPositions = (arenaNum === 2) 
        ? [[-12, -8], [8, -12], [-8, 12], [12, 8]]  // Staggered, asymmetric
        : [[-10, -10], [10, -10], [-10, 10], [10, 10]];  // Standard corners
    
    coverPositions.forEach(([x, z]) => {
        createObstacle(x, z, 3, 1.2, 2, coverMat);
    });
}

function addVerticalElements(arenaNum) {
    const platformMat = new THREE.MeshStandardMaterial({ color: 0x5a4a7a, roughness: 0.5 });
    
    // Central platform (climbable)
    createObstacle(0, 0, 8, 2, 8, platformMat);
    
    // Arena 3 gets more platforms for Pillar Police
    if (arenaNum === 3) {
        // Corner platforms at varying heights
        createObstacle(-15, -15, 4, 3, 4, platformMat);
        createObstacle(15, -15, 4, 3.5, 4, platformMat);
        createObstacle(-15, 15, 4, 4, 4, platformMat);
        createObstacle(15, 15, 4, 4.5, 4, platformMat);
    }
    
    // Stepped platforms as ramps
    const rampMat = new THREE.MeshStandardMaterial({ color: 0x6a5a8a, roughness: 0.6 });
    createObstacle(6, 0, 3, 0.7, 3, rampMat);
    createObstacle(8, 0, 2.5, 1.3, 2.5, rampMat);
    createObstacle(-6, 0, 3, 0.7, 3, rampMat);
    createObstacle(-8, 0, 2.5, 1.3, 2.5, rampMat);
    createObstacle(0, 6, 3, 0.7, 3, rampMat);
    createObstacle(0, -6, 3, 0.7, 3, rampMat);
    
    // Arena 3: Stepping stones to CP4 (god-pillar fix)
    // Creates two-ramp approach from +X and +Z directions
    if (arenaNum === 3) {
        createObstacle(12, 15, 2.5, 2.5, 2.5, rampMat);   // +X approach (lower)
        createObstacle(15, 12, 2.5, 2.5, 2.5, rampMat);   // +Z approach (lower)
    }
}

function addPlatforms(arenaNum) {
    const platformMat = new THREE.MeshStandardMaterial({ color: 0x4a6a5a, roughness: 0.5 });
    
    // Corner platforms (varying heights for Arena 4)
    const platformConfigs = [
        { x: -22, z: -22, h: 2.5, size: 7 },
        { x: 22, z: -22, h: 3.5, size: 7 },
        { x: -22, z: 22, h: 4.5, size: 7 },
        { x: 22, z: 22, h: 5.5, size: 7 }
    ];
    
    // Mid-ring platforms (connecting)
    // Arena 5+: Move platforms inward to avoid collision with tunnel walls
    // Tunnel wall inner edges are at ±22, so platforms at ±17 create 2.5-unit gap
    const hasTunnels = arenaNum >= 5;
    const midRingDist = hasTunnels ? 17 : 20;
    const midPlatforms = [
        { x: 0, z: -midRingDist, h: 3, size: 5 },
        { x: -midRingDist, z: 0, h: 3.5, size: 5 },
        { x: midRingDist, z: 0, h: 4, size: 5 },
        { x: 0, z: midRingDist, h: 4.5, size: 5 }
    ];
    
    // Build corner platforms
    platformConfigs.forEach(c => {
        createObstacle(c.x, c.z, c.size, c.h, c.size, platformMat);
    });
    
    // Build mid platforms (Arena 4+ only)
    if (arenaNum >= 4) {
        midPlatforms.forEach(c => {
            createObstacle(c.x, c.z, c.size, c.h, c.size, platformMat);
        });
    }
    
    // Central elevated platform
    if (arenaNum >= 4) {
        createObstacle(0, 0, 8, 3, 8, platformMat);
    }
    
    // Bridges
    const bridgeMat = new THREE.MeshStandardMaterial({ color: 0x5a7a6a, roughness: 0.6 });
    createObstacle(-11, -11, 4, 1.2, 4, bridgeMat);
    createObstacle(11, 11, 4, 2, 4, bridgeMat);
    
    // Arena 4: additional connecting bridges (widened for bouncer dodging)
    if (arenaNum >= 4) {
        createObstacle(0, -10, 8, 1.5, 5, bridgeMat);   // 8x5 instead of 6x3
        createObstacle(-10, 0, 5, 1.8, 8, bridgeMat);   // 5x8 instead of 3x6
    }
}

function addTunnelWalls(arenaNum) {
    const wallMat = new THREE.MeshStandardMaterial({ color: 0x6a4a5a, roughness: 0.7 });
    
    // Wall height: 5 units (unjumpable - prevents wall-camping cheese)
    // Player jump velocity is 0.4 with max bounce height ~4 units
    const wallHeight = 5;
    
    // Junction pockets: Split each wall into two sections with a 4-unit gap
    // This provides dodge space and cross-corridor escape routes
    
    // West wall - split into two sections with pocket at center
    // Original: spanning x=-34 to x=-22
    createObstacle(-32, 0, 4, wallHeight, 3, wallMat);   // Left section (x=-34 to x=-30)
    createObstacle(-24, 0, 4, wallHeight, 3, wallMat);   // Right section (x=-26 to x=-22)
    // Gap at x=-30 to x=-26 (4 units) creates junction pocket
    
    // East wall - split into two sections with pocket at center
    // Original: spanning x=22 to x=34
    createObstacle(24, 0, 4, wallHeight, 3, wallMat);    // Left section (x=22 to x=26)
    createObstacle(32, 0, 4, wallHeight, 3, wallMat);    // Right section (x=30 to x=34)
    // Gap at x=26 to x=30 (4 units) creates junction pocket
    
    // North wall - split into two sections with pocket at center
    // Original: spanning z=-34 to z=-22
    createObstacle(0, -32, 3, wallHeight, 4, wallMat);   // Far section (z=-34 to z=-30)
    createObstacle(0, -24, 3, wallHeight, 4, wallMat);   // Near section (z=-26 to z=-22)
    // Gap at z=-30 to z=-26 (4 units) creates junction pocket
    
    // South wall - split into two sections with pocket at center
    // Original: spanning z=22 to z=34
    createObstacle(0, 24, 3, wallHeight, 4, wallMat);    // Near section (z=22 to z=26)
    createObstacle(0, 32, 3, wallHeight, 4, wallMat);    // Far section (z=30 to z=34)
    // Gap at z=26 to z=30 (4 units) creates junction pocket
}

function addHazardZones(arenaNum) {
    // Corner hazards shifted inward with reduced radius to create escape channels
    // Position (±32, ±32) with radius 4 creates 6-unit escape routes:
    // Arena edge (±42) - hazard edge (32+4=36) = 6 units clearance
    const hazardPositions = [
        { x: -32, z: -32 },
        { x: 32, z: -32 },
        { x: -32, z: 32 },
        { x: 32, z: 32 }
    ];
    
    hazardPositions.forEach(pos => {
        createHazardZone(pos.x, pos.z, 4, -1);  // Reduced radius from 5 to 4
    });
}

// Safe bailout zone marker - visual aid for Arena 6 central safe area
function addSafeBailoutMarker() {
    const safeZoneRadius = 12;
    
    // Outer ring marker
    const ringGeom = new THREE.RingGeometry(safeZoneRadius - 0.5, safeZoneRadius, 32);
    const ringMat = new THREE.MeshBasicMaterial({
        color: 0x44aa44,
        transparent: true,
        opacity: 0.15,
        side: THREE.DoubleSide
    });
    const safeZone = new THREE.Mesh(ringGeom, ringMat);
    safeZone.rotation.x = -Math.PI / 2;
    safeZone.position.y = 0.02;
    scene.add(safeZone);
    arenaLandmarks.push(safeZone);
    
    // Inner subtle fill (very low opacity)
    const fillGeom = new THREE.CircleGeometry(safeZoneRadius - 1, 32);
    const fillMat = new THREE.MeshBasicMaterial({
        color: 0x44aa44,
        transparent: true,
        opacity: 0.05,
        side: THREE.DoubleSide
    });
    const fill = new THREE.Mesh(fillGeom, fillMat);
    fill.rotation.x = -Math.PI / 2;
    fill.position.y = 0.01;
    scene.add(fill);
    arenaLandmarks.push(fill);
}

// Reset pads - visual markers for open recovery zones (Arena 4+)
function addResetPads(arenaNum) {
    if (arenaNum < 4) return;
    
    // 4 cardinal positions - open areas without elevated geometry
    const padPositions = [
        { x: -30, z: 0 },
        { x: 30, z: 0 },
        { x: 0, z: -30 },
        { x: 0, z: 30 }
    ];
    
    const padMat = new THREE.MeshBasicMaterial({
        color: 0x3a5a4a,
        transparent: true,
        opacity: 0.3,
        side: THREE.DoubleSide
    });
    
    padPositions.forEach(pos => {
        // Visual marker (non-collision)
        const pad = new THREE.Mesh(
            new THREE.CircleGeometry(4, 16),
            padMat
        );
        pad.rotation.x = -Math.PI / 2;
        pad.position.set(pos.x, 0.02, pos.z);
        scene.add(pad);
        arenaLandmarks.push(pad);
    });
}

// Platform height indicators - color-code platforms by height tier (Arena 4+)
function addPlatformHeightIndicators(arenaNum) {
    if (arenaNum < 4) return;
    
    const heightColors = {
        1: 0x3a4a3a,  // Low: darker
        2: 0x4a5a4a,  // Medium-low
        3: 0x5a6a5a,  // Medium
        4: 0x6a7a6a,  // Medium-high
        5: 0x7a8a7a   // High: lighter
    };
    
    for (const obs of obstacles) {
        const c = obs.collisionData;
        if (!c) continue;
        
        const heightTier = Math.min(5, Math.ceil(c.height));
        const indicatorColor = heightColors[heightTier];
        
        // Add top-surface tint
        const indicator = new THREE.Mesh(
            new THREE.PlaneGeometry(
                (c.maxX - c.minX) * 0.8,
                (c.maxZ - c.minZ) * 0.8
            ),
            new THREE.MeshBasicMaterial({
                color: indicatorColor,
                transparent: true,
                opacity: 0.4,
                side: THREE.DoubleSide
            })
        );
        indicator.rotation.x = -Math.PI / 2;
        indicator.position.set(
            (c.minX + c.maxX) / 2,
            c.topY + 0.02,
            (c.minZ + c.maxZ) / 2
        );
        scene.add(indicator);
        arenaLandmarks.push(indicator);
    }
}

// Arena 1 underwater skate park: visible bowl geometry (visual-only, no collision)
function addArena1SkateParkBowls() {
    const bowls = getSpeedBowlsForArena(1);
    const stoneColor = 0x555566;
    const mossColor = 0x3b5b3b;
    const bowlRadius = 12;
    const phiLength = 0.38 * Math.PI;
    const rimY = bowlRadius * Math.cos(phiLength);

    const floorRadius = BOWL_HOLE_RADIUS;
    const bowlBottomY = rimY - bowlRadius + 0.02;

    bowls.forEach((b, i) => {
        const useStoneTex = !!Textures.stoneSeabed?.albedo;
        const stoneMat = new THREE.MeshStandardMaterial({
            color: 0xffffff,
            roughness: 1,
            metalness: useStoneTex ? 1 : 0,
            vertexColors: !useStoneTex,
            side: THREE.DoubleSide
        });
        if (useStoneTex) {
            applyPbr(stoneMat, Textures.stoneSeabed, { repeatX: 4, repeatY: 4 });
        } else {
            stoneMat.color.setHex(stoneColor);
            stoneMat.roughness = 0.95;
            stoneMat.metalness = 0;
        }
        const sphereGeom = new THREE.SphereGeometry(
            bowlRadius, 32, 16, 0, phiLength, 0, Math.PI * 2
        );
        sphereGeom.rotateX(Math.PI);
        sphereGeom.translate(0, rimY, 0);
        deformGeometry(sphereGeom, 0.08, i * 7);
        if (!useStoneTex) applyMossVertexColors(sphereGeom, stoneColor, mossColor, i * 11);

        const dish = new THREE.Mesh(sphereGeom, stoneMat);
        dish.position.set(b.cx, 0, b.cz);
        dish.receiveShadow = true;
        scene.add(dish);
        arenaLandmarks.push(dish);

        const floorGeom = new THREE.CircleGeometry(floorRadius, 32);
        ensureUv2(floorGeom);
        const floorMat = new THREE.MeshStandardMaterial({
            color: 0xffffff,
            roughness: 1,
            metalness: 1
        });
        if (Textures.groundSand?.albedo) {
            applyPbr(floorMat, Textures.groundSand, { repeatX: floorRadius / 5, repeatY: floorRadius / 5 });
            floorMat.color.setRGB(1.35, 1.35, 1.35);
        } else {
            floorMat.color.setHex(0x2a2a4a);
            floorMat.roughness = 0.8;
            floorMat.metalness = 0.2;
        }
        const floor = new THREE.Mesh(floorGeom, floorMat);
        floor.rotation.x = -Math.PI / 2;
        floor.position.set(b.cx, bowlBottomY, b.cz);
        floor.receiveShadow = true;
        scene.add(floor);
        arenaLandmarks.push(floor);

        const copingGeom = new THREE.RingGeometry(bowlRadius - 0.4, bowlRadius + 0.3, 32);
        const copingMat = new THREE.MeshStandardMaterial({
            color: 0x444455,
            roughness: 0.9,
            metalness: 0
        });
        const coping = new THREE.Mesh(copingGeom, copingMat);
        coping.rotation.x = -Math.PI / 2;
        coping.position.set(b.cx, 0.02, b.cz);
        scene.add(coping);
        arenaLandmarks.push(coping);
    });

    const bankRadius = 58;
    const bankAngles = [0, Math.PI / 2, Math.PI, (3 * Math.PI) / 2];
    bankAngles.forEach((angle, i) => {
        const cx = Math.cos(angle) * bankRadius;
        const cz = Math.sin(angle) * bankRadius;
        const bankGeom = new THREE.CylinderGeometry(5, 5.5, 2.5, 24, 1, false, 0, Math.PI * 0.5);
        deformGeometry(bankGeom, 0.06, i * 13);
        applyMossVertexColors(bankGeom, stoneColor, mossColor, i * 17);
        const bankStoneMat = new THREE.MeshStandardMaterial({
            color: stoneColor,
            roughness: 0.95,
            metalness: 0,
            vertexColors: true
        });
        const bank = new THREE.Mesh(bankGeom, bankStoneMat);
        bank.position.set(cx, 1.25, cz);
        bank.rotation.x = Math.PI / 2;
        bank.rotation.z = -angle;
        bank.receiveShadow = true;
        scene.add(bank);
        arenaLandmarks.push(bank);
    });
}

// Arena 1 full skatepark: collision geometry (central rim, halfpipe, ramp, tunnel, treasure islands, slalom)
function addArena1SkateparkLayout() {
    const wallMat = new THREE.MeshStandardMaterial({ color: 0x4a5a6a, roughness: 0.7 });
    const platformMat = new THREE.MeshStandardMaterial({ color: 0x5a6a5a, roughness: 0.6 });

    // --- Central Bowl Rim: circle radius ~22, 12 segments with 3 entry gaps ---
    const rimRadius = 22;
    const rimSegments = 12;
    const rimSegmentAngle = (Math.PI * 2) / rimSegments;
    const rimBoxW = 2.2;
    const rimBoxH = 1.2;
    const gapIndices = [0, 4, 8];  // Three gaps for entry/exit
    for (let i = 0; i < rimSegments; i++) {
        if (gapIndices.includes(i)) continue;
        const a = i * rimSegmentAngle - Math.PI / 2;
        const cx = Math.cos(a) * rimRadius;
        const cz = Math.sin(a) * rimRadius;
        createObstacle(cx, cz, rimBoxW, rimBoxH, 2.5, wallMat);
    }

    // --- Coral Halfpipe (NE quadrant): U-curve around (44, -44), opening toward center (SW) ---
    const hpCx = 44;
    const hpCz = -44;
    const hpWidth = 14;
    const hpLegLen = 22;
    const wallH = 2.8;
    const wallThick = 2;
    // Left wall (west side of U)
    createObstacle(hpCx - hpWidth / 2 - wallThick / 2, hpCz + hpLegLen / 2, wallThick, wallH, hpLegLen + 2, wallMat);
    // Right wall (east side of U)
    createObstacle(hpCx + hpWidth / 2 + wallThick / 2, hpCz + hpLegLen / 2, wallThick, wallH, hpLegLen + 2, wallMat);
    // Curved end (arc of boxes at top of U)
    const arcCount = 8;
    for (let i = 0; i < arcCount; i++) {
        const t = (i + 0.5) / arcCount;
        const angle = Math.PI * t;
        const ax = hpCx + Math.cos(angle) * (hpWidth / 2 + wallThick);
        const az = hpCz + hpLegLen + Math.sin(angle) * (hpWidth / 2 + wallThick);
        createObstacle(ax, az, 2.5, wallH, 2, wallMat);
    }

    // --- Sunken Ramp (east commit lane): corridor x 50-70, z -25 to 25, jump gap z -5 to 5 ---
    const rampZMin = -25;
    const rampZMax = 25;
    const rampXLeft = 50;
    const rampXRight = 70;
    const rampWallH = 2.5;
    const gapZMin = -5;
    const gapZMax = 5;
    // Left wall: two segments (below and above gap)
    createObstacle(rampXLeft, (rampZMin + gapZMin) / 2, 2, rampWallH, (gapZMin - rampZMin) + 1, wallMat);
    createObstacle(rampXLeft, (gapZMax + rampZMax) / 2, 2, rampWallH, (rampZMax - gapZMax) + 1, wallMat);
    // Right wall: two segments
    createObstacle(rampXRight, (rampZMin + gapZMin) / 2, 2, rampWallH, (gapZMin - rampZMin) + 1, wallMat);
    createObstacle(rampXRight, (gapZMax + rampZMax) / 2, 2, rampWallH, (rampZMax - gapZMax) + 1, wallMat);

    // --- Kelp Tunnel (SW quadrant): curving corridor around (-44, 44) with one pocket ---
    const tunCx = -44;
    const tunCz = 44;
    const tunWallH = 2.6;
    const tunSegs = [
        { x: tunCx - 12, z: tunCz, sx: 3, sz: 10 },
        { x: tunCx - 8, z: tunCz + 14, sx: 12, sz: 3 },
        { x: tunCx + 6, z: tunCz + 10, sx: 3, sz: 12 },
        { x: tunCx + 10, z: tunCz - 6, sx: 14, sz: 3 },
        { x: tunCx, z: tunCz - 14, sx: 3, sz: 10 }
    ];
    tunSegs.forEach(s => createObstacle(s.x, s.z, s.sx, tunWallH, s.sz, wallMat));

    // --- Treasure Gap (SE quadrant): elevated platforms, jump-able gaps ---
    const platH = 1.8;
    const platSize = 4;
    const treasurePlats = [
        { x: 40, z: 40 },
        { x: 46, z: 44 },
        { x: 42, z: 50 },
        { x: 50, z: 46 }
    ];
    treasurePlats.forEach(p => createObstacle(p.x, p.z, platSize, platH, platSize, platformMat));

    // --- Seaweed Slalom (south band z 70-110): S-curve pillars ---
    const slalomZMin = 72;
    const slalomZMax = 108;
    const pillarSize = 1.8;
    const pillarH = 2.2;
    const slalomMat = new THREE.MeshStandardMaterial({ color: 0x3a5a4a, roughness: 0.8 });
    const sCurve = (t) => {
        const x = 15 * Math.sin(t * Math.PI * 2);
        const z = slalomZMin + t * (slalomZMax - slalomZMin);
        return { x, z };
    };
    const numPillars = 16;
    for (let i = 0; i < numPillars; i++) {
        const t = (i + 0.5) / numPillars;
        const { x, z } = sCurve(t);
        createObstacle(x, z, pillarSize, pillarH, pillarSize, slalomMat);
    }

    addArena1ZoneDecals();
}

// Arena 1 outer-ring city district: walkable catwalks + decorative pods (outside skatepark combat zone)
function addArena1CityDistrict() {
    const ringRadius = 100;
    const segmentCount = 8;
    const catwalkMat = new THREE.MeshStandardMaterial({ color: 0x2a4a5a, roughness: 0.75 });
    for (let i = 0; i < segmentCount; i++) {
        const a = (i / segmentCount) * Math.PI * 2;
        const cx = Math.cos(a) * ringRadius;
        const cz = Math.sin(a) * ringRadius;
        createObstacle(cx, cz, 12, 0.5, 5, catwalkMat);
    }
    // Landmark pods (visual-only): a few domes along the ring
    const podMat = new THREE.MeshStandardMaterial({ color: 0x3a5a6a, roughness: 0.8 });
    const podAngles = [0.2, 1.2, 2.8, 4.5];
    podAngles.forEach(a => {
        const domeGeom = new THREE.SphereGeometry(4, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.5);
        const rad = a * Math.PI;
        const px = Math.cos(rad) * (ringRadius - 6);
        const pz = Math.sin(rad) * (ringRadius - 6);
        const dome = new THREE.Mesh(domeGeom, podMat.clone());
        dome.position.set(px, 2, pz);
        dome.receiveShadow = true;
        scene.add(dome);
        arenaLandmarks.push(dome);
    });
}

// Zone decals for top-down readability (safe=teal, boost=green, reward=gold)
function addArena1ZoneDecals() {
    const decalMat = (color, opacity) => new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity,
        side: THREE.DoubleSide
    });
    // Central bowl: ring teal/blue
    const centerRing = new THREE.Mesh(
        new THREE.RingGeometry(20, 24, 32),
        decalMat(0x2a4a5a, 0.15)
    );
    centerRing.rotation.x = -Math.PI / 2;
    centerRing.position.y = 0.01;
    scene.add(centerRing);
    arenaLandmarks.push(centerRing);
    // Halfpipe: U-zone outline green (boost)
    const hpW = 16;
    const hpH = 24;
    const hpOutline = new THREE.Mesh(
        new THREE.PlaneGeometry(hpW, hpH),
        decalMat(0x22aa44, 0.12)
    );
    hpOutline.rotation.x = -Math.PI / 2;
    hpOutline.position.set(44, 0.01, -33);
    scene.add(hpOutline);
    arenaLandmarks.push(hpOutline);
    // Tunnel: rect blue
    const tunOutline = new THREE.Mesh(
        new THREE.PlaneGeometry(28, 24),
        decalMat(0x2a4a5a, 0.1)
    );
    tunOutline.rotation.x = -Math.PI / 2;
    tunOutline.position.set(-44, 0.01, 44);
    scene.add(tunOutline);
    arenaLandmarks.push(tunOutline);
    // Treasure: small gold circles at platform centers
    [[40, 40], [46, 44], [42, 50], [50, 46]].forEach(([x, z]) => {
        const gold = new THREE.Mesh(
            new THREE.CircleGeometry(2.5, 16),
            decalMat(0xaa8844, 0.2)
        );
        gold.rotation.x = -Math.PI / 2;
        gold.position.set(x, 0.01, z);
        scene.add(gold);
        arenaLandmarks.push(gold);
    });
    // Slalom: S-band teal
    const slalomDecal = new THREE.Mesh(
        new THREE.PlaneGeometry(46, 38),
        decalMat(0x2a5a5a, 0.1)
    );
    slalomDecal.rotation.x = -Math.PI / 2;
    slalomDecal.position.set(0, 0.01, 90);
    scene.add(slalomDecal);
    arenaLandmarks.push(slalomDecal);
}

// Arena 1 landmarks - visual-only orientation aids
function addArena1Landmarks() {
    // Center reset pad marker (visual-only) - psychological "home base" anchor
    // Matches Arena 1 plan: radius 12, subtle blue tint, slightly above ground to avoid z-fighting
    const resetPad = new THREE.Mesh(
        new THREE.CircleGeometry(12, 32),
        new THREE.MeshBasicMaterial({
            color: 0x3a3a5a,
            transparent: true,
            opacity: 0.2,
            side: THREE.DoubleSide
        })
    );
    resetPad.rotation.x = -Math.PI / 2;
    resetPad.position.y = 0.02;
    scene.add(resetPad);
    arenaLandmarks.push(resetPad);
    
    // Cardinal direction lines - subtle orientation guides
    const lineMat = new THREE.MeshBasicMaterial({
        color: 0x3a3a5a,
        transparent: true,
        opacity: 0.2
    });
    
    for (let i = 0; i < 4; i++) {
        const lineGeom = new THREE.PlaneGeometry(2, 40);
        const line = new THREE.Mesh(lineGeom, lineMat);
        line.rotation.x = -Math.PI / 2;
        line.rotation.z = (i / 4) * Math.PI * 2;
        line.position.y = 0.01;
        scene.add(line);
        arenaLandmarks.push(line);
    }
    
    // Corner warning zones - visual danger indicators
    const cornerMat = new THREE.MeshBasicMaterial({
        color: 0x4a2a2a,  // Slightly red tint
        transparent: true,
        opacity: 0.2,
        side: THREE.DoubleSide
    });
    
    const cornerPositions = [[-40, -40], [40, -40], [-40, 40], [40, 40]];
    cornerPositions.forEach(([x, z]) => {
        const warningGeom = new THREE.CircleGeometry(5, 16);
        const warning = new THREE.Mesh(warningGeom, cornerMat);
        warning.rotation.x = -Math.PI / 2;
        warning.position.set(x, 0.01, z);
        scene.add(warning);
        arenaLandmarks.push(warning);
    });
    
    // Pufferkeep Castle - King Red Puffer's throne backdrop
    addPufferkeepCastle();
}

export function createObstacle(x, z, sizeX, height, sizeZ, material) {
    const geometry = new THREE.BoxGeometry(sizeX, height, sizeZ);
    const obstacle = new THREE.Mesh(geometry, material);
    obstacle.position.set(x, height / 2, z);
    obstacle.castShadow = true;
    obstacle.receiveShadow = true;
    obstacle.collisionData = {
        minX: x - sizeX / 2,
        maxX: x + sizeX / 2,
        minZ: z - sizeZ / 2,
        maxZ: z + sizeZ / 2,
        height: height,
        topY: height
    };
    scene.add(obstacle);
    obstacles.push(obstacle);
    return obstacle;
}

export function createHazardZone(x, z, radius, duration) {
    const geometry = new THREE.CircleGeometry(radius, 24);
    const material = new THREE.MeshBasicMaterial({
        color: 0x44ff44,
        transparent: true,
        opacity: 0.4,
        side: THREE.DoubleSide
    });
    const hazard = new THREE.Mesh(geometry, material);
    hazard.rotation.x = -Math.PI / 2;
    hazard.position.set(x, 0.05, z);
    hazard.radius = radius;
    hazard.duration = duration;
    // Frame-based damage: 15 DPS at 60fps = 1.5 damage per 6-frame tick
    hazard.damagePerTick = 1.5;
    hazard.damageTickInterval = 6;  // Apply damage every 6 frames (~100ms at 60fps)
    hazard.tickTimer = 0;
    scene.add(hazard);
    hazardZones.push(hazard);
    return hazard;
}

function createBoundaryWalls(arenaNumber) {
    const bound = getArenaBounds(arenaNumber);
    const wallMat = new THREE.MeshStandardMaterial({
        color: 0x3a3a5a,
        transparent: true,
        opacity: 0.3
    });
    const wallHeight = 8;
    const thickness = 2;
    const length = 2 * bound;  // Full side length so walls meet at corners

    for (let i = 0; i < 4; i++) {
        const wallGeom = new THREE.BoxGeometry(
            i < 2 ? length : thickness,
            wallHeight,
            i < 2 ? thickness : length
        );
        const wall = new THREE.Mesh(wallGeom, wallMat);
        wall.position.y = wallHeight / 2;

        if (i === 0) wall.position.set(0, wallHeight / 2, -bound);   // North
        else if (i === 1) wall.position.set(0, wallHeight / 2, bound); // South
        else if (i === 2) wall.position.set(-bound, wallHeight / 2, 0); // West
        else wall.position.set(bound, wallHeight / 2, 0);               // East

        scene.add(wall);
        arenaWalls.push(wall);
    }
}

export function updateHazardZones() {
    for (let i = hazardZones.length - 1; i >= 0; i--) {
        const hz = hazardZones[i];
        if (hz.duration > 0) {
            hz.duration--;
            if (hz.duration < 60) {
                hz.material.opacity = (hz.duration / 60) * 0.4;
            }
            if (hz.duration <= 0) {
                hz.geometry.dispose();
                hz.material.dispose();
                scene.remove(hz);
                hazardZones.splice(i, 1);
            }
        }
    }
}
