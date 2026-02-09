// Data-driven arena layouts. When a layout exists for an arena, generator builds from objects + prefabs instead of hard-coded code.
// Format: { playerSpawn?, objects[], prefabs?, enemySpawners? }

/**
 * Get layout for an arena number. Return null/undefined to use legacy feature-based generation.
 * @param {number} arenaNumber
 * @returns {Object|undefined} layout or undefined
 */
export function getArenaLayout(arenaNumber) {
    const arenaNum = Math.min(arenaNumber, 6);
    if (arenaNum === 1) return ARENA_1_LAYOUT;
    return undefined;
}

// Arena 1: The Training Grounds — layout drives landmarks, skatepark obstacles, city district, and prefabs.
// Bowls and complex landmarks (Pufferkeep Castle, zone decals) are still added by generator as special types
// or we define them here as type "bowl" / "arena1Decals" / "pufferkeepCastle" and implement in factory.
// For now we use a hybrid: layout for obstacles + simple landmarks + prefabs; generator still runs
// addArena1SkateParkBowls, addArena1Landmarks (reset pad, lines, corners, castle), addArena1SkateparkLayout,
// addArena1CityDistrict when USE_ARENA_1_LAYOUT is false. When true, layout objects below replace the
// obstacle/landmark placement from those functions (see plan: migrate step 3).
export const ARENA_1_LAYOUT = {
    playerSpawn: { x: 0, z: 0 },
    objects: [
        // Central bowl rim (12 segments, 3 gaps at 0, 4, 8)
        { type: 'obstacle', x: 0, z: 19.5, sizeX: 2.2, height: 1.2, sizeZ: 2.5, materialKey: 'wall' },
        { type: 'obstacle', x: 7.2, z: 18, sizeX: 2.2, height: 1.2, sizeZ: 2.5, materialKey: 'wall' },
        { type: 'obstacle', x: 13.5, z: 13.5, sizeX: 2.2, height: 1.2, sizeZ: 2.5, materialKey: 'wall' },
        { type: 'obstacle', x: 18, z: 7.2, sizeX: 2.2, height: 1.2, sizeZ: 2.5, materialKey: 'wall' },
        { type: 'obstacle', x: 19.5, z: 0, sizeX: 2.2, height: 1.2, sizeZ: 2.5, materialKey: 'wall' },
        { type: 'obstacle', x: 18, z: -7.2, sizeX: 2.2, height: 1.2, sizeZ: 2.5, materialKey: 'wall' },
        { type: 'obstacle', x: 13.5, z: -13.5, sizeX: 2.2, height: 1.2, sizeZ: 2.5, materialKey: 'wall' },
        { type: 'obstacle', x: 7.2, z: -18, sizeX: 2.2, height: 1.2, sizeZ: 2.5, materialKey: 'wall' },
        { type: 'obstacle', x: 0, z: -19.5, sizeX: 2.2, height: 1.2, sizeZ: 2.5, materialKey: 'wall' },
        { type: 'obstacle', x: -7.2, z: -18, sizeX: 2.2, height: 1.2, sizeZ: 2.5, materialKey: 'wall' },
        { type: 'obstacle', x: -13.5, z: -13.5, sizeX: 2.2, height: 1.2, sizeZ: 2.5, materialKey: 'wall' },
        { type: 'obstacle', x: -18, z: -7.2, sizeX: 2.2, height: 1.2, sizeZ: 2.5, materialKey: 'wall' },
        // Halfpipe walls
        { type: 'obstacle', x: 37, z: -33, sizeX: 2, height: 2.8, sizeZ: 24, materialKey: 'wall' },
        { type: 'obstacle', x: 51, z: -33, sizeX: 2, height: 2.8, sizeZ: 24, materialKey: 'wall' },
        { type: 'obstacle', x: 44, z: -54, sizeX: 2.5, height: 2.8, sizeZ: 2, materialKey: 'wall' },
        { type: 'obstacle', x: 46.5, z: -54, sizeX: 2.5, height: 2.8, sizeZ: 2, materialKey: 'wall' },
        { type: 'obstacle', x: 49, z: -54, sizeX: 2.5, height: 2.8, sizeZ: 2, materialKey: 'wall' },
        { type: 'obstacle', x: 51.5, z: -54, sizeX: 2.5, height: 2.8, sizeZ: 2, materialKey: 'wall' },
        { type: 'obstacle', x: 54, z: -54, sizeX: 2.5, height: 2.8, sizeZ: 2, materialKey: 'wall' },
        { type: 'obstacle', x: 56.5, z: -54, sizeX: 2.5, height: 2.8, sizeZ: 2, materialKey: 'wall' },
        { type: 'obstacle', x: 59, z: -54, sizeX: 2.5, height: 2.8, sizeZ: 2, materialKey: 'wall' },
        // Ramp walls (east)
        { type: 'obstacle', x: 50, z: -15, sizeX: 2, height: 2.5, sizeZ: 21, materialKey: 'wall' },
        { type: 'obstacle', x: 50, z: 15, sizeX: 2, height: 2.5, sizeZ: 21, materialKey: 'wall' },
        { type: 'obstacle', x: 70, z: -15, sizeX: 2, height: 2.5, sizeZ: 21, materialKey: 'wall' },
        { type: 'obstacle', x: 70, z: 15, sizeX: 2, height: 2.5, sizeZ: 21, materialKey: 'wall' },
        // Tunnel (SW)
        { type: 'obstacle', x: -56, z: 44, sizeX: 3, height: 2.6, sizeZ: 10, materialKey: 'wall' },
        { type: 'obstacle', x: -44, z: 51, sizeX: 12, height: 2.6, sizeZ: 3, materialKey: 'wall' },
        { type: 'obstacle', x: -38, z: 44, sizeX: 3, height: 2.6, sizeZ: 12, materialKey: 'wall' },
        { type: 'obstacle', x: -34, z: 37, sizeX: 14, height: 2.6, sizeZ: 3, materialKey: 'wall' },
        { type: 'obstacle', x: -44, z: 37, sizeX: 3, height: 2.6, sizeZ: 10, materialKey: 'wall' },
        // Treasure platforms
        { type: 'obstacle', x: 40, z: 40, sizeX: 4, height: 1.8, sizeZ: 4, materialKey: 'platform' },
        { type: 'obstacle', x: 46, z: 44, sizeX: 4, height: 1.8, sizeZ: 4, materialKey: 'platform' },
        { type: 'obstacle', x: 42, z: 50, sizeX: 4, height: 1.8, sizeZ: 4, materialKey: 'platform' },
        { type: 'obstacle', x: 50, z: 46, sizeX: 4, height: 1.8, sizeZ: 4, materialKey: 'platform' },
        // Slalom pillars (S-curve z 72–108)
        { type: 'obstacle', x: 0, z: 74, sizeX: 1.8, height: 2.2, sizeZ: 1.8, materialKey: 'slalom' },
        { type: 'obstacle', x: 10.6, z: 78, sizeX: 1.8, height: 2.2, sizeZ: 1.8, materialKey: 'slalom' },
        { type: 'obstacle', x: -10.6, z: 82, sizeX: 1.8, height: 2.2, sizeZ: 1.8, materialKey: 'slalom' },
        { type: 'obstacle', x: 10.6, z: 86, sizeX: 1.8, height: 2.2, sizeZ: 1.8, materialKey: 'slalom' },
        { type: 'obstacle', x: 0, z: 90, sizeX: 1.8, height: 2.2, sizeZ: 1.8, materialKey: 'slalom' },
        { type: 'obstacle', x: -10.6, z: 94, sizeX: 1.8, height: 2.2, sizeZ: 1.8, materialKey: 'slalom' },
        { type: 'obstacle', x: 10.6, z: 98, sizeX: 1.8, height: 2.2, sizeZ: 1.8, materialKey: 'slalom' },
        { type: 'obstacle', x: 0, z: 102, sizeX: 1.8, height: 2.2, sizeZ: 1.8, materialKey: 'slalom' },
        { type: 'obstacle', x: -10.6, z: 106, sizeX: 1.8, height: 2.2, sizeZ: 1.8, materialKey: 'slalom' },
        // City catwalks (ring radius 100)
        { type: 'obstacle', x: 100, z: 0, sizeX: 12, height: 0.5, sizeZ: 5, materialKey: 'catwalk' },
        { type: 'obstacle', x: 70.7, z: 70.7, sizeX: 12, height: 0.5, sizeZ: 5, materialKey: 'catwalk' },
        { type: 'obstacle', x: 0, z: 100, sizeX: 12, height: 0.5, sizeZ: 5, materialKey: 'catwalk' },
        { type: 'obstacle', x: -70.7, z: 70.7, sizeX: 12, height: 0.5, sizeZ: 5, materialKey: 'catwalk' },
        { type: 'obstacle', x: -100, z: 0, sizeX: 12, height: 0.5, sizeZ: 5, materialKey: 'catwalk' },
        { type: 'obstacle', x: -70.7, z: -70.7, sizeX: 12, height: 0.5, sizeZ: 5, materialKey: 'catwalk' },
        { type: 'obstacle', x: 0, z: -100, sizeX: 12, height: 0.5, sizeZ: 5, materialKey: 'catwalk' },
        { type: 'obstacle', x: 70.7, z: -70.7, sizeX: 12, height: 0.5, sizeZ: 5, materialKey: 'catwalk' },
        // Landmarks (visual) — reset pad, cardinal lines, corner warnings; Pufferkeep Castle added by generator
        { type: 'landmark', typeId: 'resetPad', x: 0, z: 0, radius: 12 },
        { type: 'landmark', typeId: 'cardinalLine', x: 0, z: 0, rot: 0 },
        { type: 'landmark', typeId: 'cardinalLine', x: 0, z: 0, rot: Math.PI / 2 },
        { type: 'landmark', typeId: 'cardinalLine', x: 0, z: 0, rot: Math.PI },
        { type: 'landmark', typeId: 'cardinalLine', x: 0, z: 0, rot: (3 * Math.PI) / 2 },
        { type: 'landmark', typeId: 'decal', x: -40, z: -40, radius: 5, color: 0x4a2a2a, opacity: 0.2 },
        { type: 'landmark', typeId: 'decal', x: 40, z: -40, radius: 5, color: 0x4a2a2a, opacity: 0.2 },
        { type: 'landmark', typeId: 'decal', x: -40, z: 40, radius: 5, color: 0x4a2a2a, opacity: 0.2 },
        { type: 'landmark', typeId: 'decal', x: 40, z: 40, radius: 5, color: 0x4a2a2a, opacity: 0.2 },
        // City domes
        { type: 'landmark', typeId: 'dome', x: 88, z: 29, radius: 4 },
        { type: 'landmark', typeId: 'dome', x: 29, z: 88, radius: 4 },
        { type: 'landmark', typeId: 'dome', x: -88, z: -29, radius: 4 },
        { type: 'landmark', typeId: 'dome', x: -29, z: -88, radius: 4 }
    ],
    prefabs: [
        { type: 'coralCluster', x: 56, z: -40, scale: 0.8 },
        { type: 'coralCluster', x: 58, z: -46, scale: 0.8 },
        { type: 'rockCluster', x: -56, z: 44, scale: 0.6 },
        { type: 'rockCluster', x: -58, z: 50, scale: 0.6 },
        { type: 'rockCluster', x: 50, z: 52, scale: 0.6 },
        { type: 'rockCluster', x: 52, z: 48, scale: 0.6 }
    ],
    enemySpawners: [
        { x: 50, z: 0 },
        { x: -50, z: 0 },
        { x: 0, z: 50 },
        { x: 0, z: -50 }
    ]
};
