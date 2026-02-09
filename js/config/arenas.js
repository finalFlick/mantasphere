// Progressive Arena Configuration with Lore and Tiered Waves

// Arena 1 uses a special "Boss Chase" system:
// - Segment 1: Waves 1-3 → Boss Phase 1 (retreats)
// - Segment 2: Waves 4-5 → Boss Phase 2 (retreats)
// - Segment 3: Waves 6-7 → Boss Phase 3 (final)
// Total: 7 wave encounters before boss completion

export const ARENA_CONFIG = {
    arenas: {
        1: {
            name: 'The Training Grounds',
            waves: 7,  // 3 segments: (3 waves + Boss P1) + (2 waves + Boss P2) + (2 waves + Boss P3)
            features: ['flat', 'landmarks'],
            color: 0x2a2a4a,
            lore: 'You are a new recruit learning the basics.',
            teaches: 'Move, shoot, dodge - fundamentals under pressure',
            bossLesson: 'Simple patterns teach timing and spacing',
            // Arena-specific spawn config to discourage edge-kiting
            spawnConfig: {
                antiEdgeBias: true,
                minDistFromCorner: 15
            }
        },
    2: {
        name: 'Shields & Cover',
        waves: 5,
        features: ['flat', 'pillars'],
        color: 0x2a3a4a,
        lore: 'Shield-focused combat with tactical cover.',
        teaches: 'Target priority, shield break mechanics, repositioning',
        bossLesson: 'Cover is temporary advantage - keep moving',
        lessonEnemy: 'shielded',
        shieldedRatio: 0.7,  // 70% of enemies should be shielded
        // Geometry configuration for anti-camping asymmetric layout
        geometryConfig: {
            pillarSymmetry: 'asymmetric',  // Breaks "solved loop" kiting
            coverBlockOffset: true,         // Staggered cover prevents camping
            innerPillarCount: 3             // Odd count breaks rotational symmetry
        }
    },
    3: {
        name: 'Vertical Loop',
        waves: 6,
        features: ['flat', 'pillars', 'vertical', 'ramps'],
        color: 0x3a2a4a,
        lore: 'Elevation test - climb to engage enemies.',
        teaches: 'Vertical awareness, climbing, repositioning under threat',
        bossLesson: 'Teleportation and platform pressure',
        lessonEnemy: 'pillarPolice',
        // Vertical-specific config for Pillar Police behavior
        pillarConfig: {
            gracePeriod: 1500,           // 1.5s grace before PP hunts after landing
            cornerAccessRamps: true       // CP4 has stepping stone access
        }
    },
    4: {
        name: 'Platform Gardens',
        waves: 8,
        features: ['flat', 'pillars', 'vertical', 'platforms', 'multiLevel'],
        color: 0x2a4a3a,
        lore: 'Multi-level combat arena with strategic vantage points.',
        teaches: 'Movement planning, platform control, bouncer tracking',
        bossLesson: 'Lane control foreshadowing tunnels',
        lessonEnemy: 'fastBouncer',
        // Platform and bouncer configuration
        platformConfig: {
            bridgeMinWidth: 5,
            resetPadCount: 4,
            heightIndicators: true
        }
    },
    5: {
        name: 'The Labyrinth',
        waves: 8,
        features: ['flat', 'pillars', 'vertical', 'platforms', 'tunnels'],
        color: 0x4a2a3a,
        lore: 'Narrow corridors and chokepoints test your nerve.',
        teaches: 'Priority targeting, corridor control, crowd management',
        bossLesson: 'Burrow mechanics and hazard introduction',
        lessonEnemy: 'splitter'
    },
    6: {
        name: 'Chaos Realm',
        waves: 10,
        features: ['flat', 'pillars', 'vertical', 'platforms', 'tunnels', 'hazards'],
        color: 0x3a3a3a,
        lore: 'Everything you learned converges here.',
        teaches: 'Reaction, threat reading, adapting under layered pressure',
        bossLesson: 'Pattern mastery, multi-mechanic synthesis',
        lessonEnemy: 'teleporter',
        breatherWaves: [3, 6, 9]  // Waves with reduced pressure
    }
    }
};

// Helper to get waves for an arena
export function getArenaWaves(arenaNumber) {
    const arena = ARENA_CONFIG.arenas[Math.min(arenaNumber, 6)];
    return arena ? arena.waves : 10;
}

// Arena bounds configuration (for movement/spawn clamping)
// Arena 1 is effectively boundless (very large bounds)
// Other arenas use standard ±42 bounds
export function getArenaBounds(arenaNumber) {
    if (arenaNumber === 1) {
        return 200;  // Very large bounds for Arena 1 (allows 50-80 unit spawns)
    }
    return 42;  // Standard bounds for other arenas
}

// Speed bowls: concave zones outside 40x40 (|x|,|z| <= 20). Slide in = pull toward center; exit = speed boost.
// Each bowl: { cx, cz, R, exitBoostMagnitude, exitBoostFrames }. Slightly launchy for skate-park feel.
const BOWL_EXIT_BOOST_MAGNITUDE = 0.14;
const BOWL_EXIT_BOOST_FRAMES = 18;
const BOWL_ZONE_RADIUS = 10;
const BOWL_PULL_STRENGTH = 0.02;

/** Visual radius of Arena 1 bowl geometry (generator.js bowlRadius); used for surface height. */
const BOWL_VISUAL_RADIUS = 12;
/** Hole radius for ground shape and bowl floor mesh (floor must cover hole so player cannot see through). */
export const BOWL_HOLE_RADIUS = 14;
/** Rim height in local bowl geometry (bowlRadius * cos(phiLength)); sphere center y in world. */
const BOWL_RIM_Y = BOWL_VISUAL_RADIUS * Math.cos(0.38 * Math.PI);

function makeBowl(cx, cz, R = BOWL_ZONE_RADIUS) {
    return { cx, cz, R, exitBoostMagnitude: BOWL_EXIT_BOOST_MAGNITUDE, exitBoostFrames: BOWL_EXIT_BOOST_FRAMES };
}

export function getSpeedBowlsForArena(arenaNumber) {
    const arena = Math.min(arenaNumber ?? 1, 6);
    if (arena === 1) {
        const radius = 62;
        return [
            makeBowl(radius * Math.cos(Math.PI * 0.25), radius * Math.sin(Math.PI * 0.25)),
            makeBowl(radius * Math.cos(Math.PI * 0.75), radius * Math.sin(Math.PI * 0.75)),
            makeBowl(radius * Math.cos(Math.PI * 1.25), radius * Math.sin(Math.PI * 1.25)),
            makeBowl(radius * Math.cos(Math.PI * 1.75), radius * Math.sin(Math.PI * 1.75))
        ];
    }
    if (arena === 2 || arena === 3) {
        const r = 33;
        return [
            makeBowl(r * Math.cos(Math.PI * 0.5), r * Math.sin(Math.PI * 0.5)),
            makeBowl(r * Math.cos(Math.PI * 1.5), r * Math.sin(Math.PI * 1.5))
        ];
    }
    return [];
}

/**
 * Returns the bowl surface height (world Y) at (x, z) if inside any bowl, else null.
 * Used so player and enemies can move down into bowl depressions. Only Arena 1 has bowl geometry.
 */
export function getBowlSurfaceYAt(arenaNumber, x, z) {
    if (arenaNumber !== 1) return null;
    const bowls = getSpeedBowlsForArena(1);
    for (let i = 0; i < bowls.length; i++) {
        const b = bowls[i];
        const dx = x - b.cx;
        const dz = z - b.cz;
        const distSq = dx * dx + dz * dz;
        const rSq = BOWL_VISUAL_RADIUS * BOWL_VISUAL_RADIUS;
        if (distSq < rSq) {
            const y = BOWL_RIM_Y - Math.sqrt(rSq - distSq);
            return y;
        }
    }
    return null;
}