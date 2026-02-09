import { WAVE_STATE, DEFAULT_LIVES, STORAGE_PREFIX, DIFFICULTY_CONFIG } from '../config/constants.js';
import { safeLocalStorageGet, safeLocalStorageSet } from '../utils/storage.js';

// Central game state management
export const gameState = {
    running: false,
    paused: false,
    announcementPaused: false,
    introCinematicActive: false,
    health: 100,
    maxHealth: 100,
    lives: DEFAULT_LIVES,
    xp: 0,
    xpToLevel: 10,
    level: 1,
    kills: 0,
    score: 0,
    pendingLevelUps: 0,
    currentArena: 1,
    currentWave: 1,
    waveState: WAVE_STATE.WAVE_INTRO,
    waveTimer: 0,
    enemiesToSpawn: 0,
    waveEnemiesRemaining: 0,
    waveSpawnTimer: 0,  // Frame-based spawn cooldown counter
    waveFrameCounter: 0,  // Frames since wave start (for speed bonus)
    bossActive: false,
    unlockedMechanics: {
        pillars: false,
        ramps: false,
        platforms: false,
        tunnels: false,
        hybridChaos: false
    },
    unlockedEnemyBehaviors: {
        jumping: false,
        ambush: false,
        multiLevel: false
    },
    stats: {
        damage: 10,
        attackSpeed: 0.2,  // 3x slower initial fire rate - emphasizes positioning
        projectileCount: 1,
        projectileSpeed: 0.5,  // Reduced from 0.8 - slower bullets early game
        moveSpeed: 0.12,
        maxHealth: 100,
        pickupRange: 3,
        xpMultiplier: 1
    },
    debug: {
        enabled: false,
        noEnemies: false,
        invincible: false,
        showHitboxes: false,  // DEBUG-only: visualize collision boxes
        placementMode: false   // DEBUG-only: level layout placement (click to place, export JSON)
    },
    
    // Dash Strike ability state (unlocked via Boss 1 module)
    dashStrikeEnabled: false,
    dashStrikeLevel: 0,
    dashStrikeConfig: null,  // { distance, cooldown, damage }
    dashStrikeCooldownTimer: 0,
    
    // Siphon ability state (blueprint: pull all XP orbs on key press)
    siphonCooldownTimer: 0,
    
    // Cutscene state - prevents damage and boss AI during transitions
    cutsceneActive: false,
    cutsceneInvincible: false,
    interactiveDodgeTutorial: false,  // Allows player movement during dodge tutorial
    
    // Boss intro/cutscene tracking
    bossIntroDemoPhase: 0,
    introMinions: [],
    currentBossRef: null,
    
    // Frame-based post-defeat timers (run even after boss removed)
    xpVacuumTimer: 0,
    portalSpawnTimer: 0,
    portalSpawnPos: null,
    victoryParticleWave: undefined,  // undefined = not active, 0-2 = active waves
    victoryParticleTimer: 0,
    victoryParticlePos: null,
    combatStats: {
        damageDealt: 0,
        damageTaken: 0,
        kills: {},
        perfectWaves: 0,
        waveDamageTaken: 0,
        bossesDefeated: 0
    },
    shownModifiers: {},
    
    // Visual settings
    settings: {
        ambienceEnabled: true,      // Master toggle for underwater ambience
        ambienceBubbles: true,      // Sub-toggle: bubble particles
        ambienceKelp: true,         // Sub-toggle: decorative kelp
        ambienceFish: true,         // Sub-toggle: distant fish silhouettes
        bloomEnabled: false,       // In-game bloom (0.4.x had none); enable in Debug Visual or settings for glow
    },
    
    // Frame counter for cooldown tracking
    frameCount: 0,
    
    // Anti-kite system: retreat tracking
    retreatTimer: 0,  // Frame counter for continuous backward movement

    // Time tracking (seconds)
    time: {
        simSeconds: 0,
        realSeconds: 0,
        runSeconds: 0
    },
    
    // Projectile-modifying items (collected from chests)
    heldItems: [],  // Array of item id strings (e.g., ['pierce', 'chain'])
    
    // Per-arena upgrade tracking (for caps enforcement)
    upgradeCountsByArena: {},  // { arena: { damage: 0, attackSpeed: 0, ... } }
    
    // Blueprint system: chest items that require level-up to activate
    blueprints: {
        pending: new Set(),   // Collected but inactive: 'pierce', 'chain', 'explosion'
        unlocked: new Set()   // Active for the run
    },
    
    // Arena 1 Boss Chase state - boss appears multiple times across waves
    arena1ChaseState: null,  // Initialized when Arena 1 starts
    
    // Treasure Runner spawn tracking
    treasureRunner: {
        spawnedThisWave: false,
        spawnedThisRun: 0,
        maxPerWave: 1,
        maxPerRun: 2
    },
    
    // Kraken's Pulse proc state
    krakensPulse: {
        nextRollSimSeconds: 0,
        state: 'IDLE',     // IDLE | TELL | PULSE | AFTERMATH
        stateTimer: 0,     // frames in current state
        hellfireRing: null,  // Active ring mesh (if any)
        playerOriginalEmissive: null,  // Store original player emissive for restoration
    },
    
    // Difficulty mode (persists to localStorage)
    currentDifficulty: 'normal'
};

export function resetGameState() {
    Object.assign(gameState, {
        health: 100,
        maxHealth: 100,
        lives: DEFAULT_LIVES,
        xp: 0,
        xpToLevel: 10,
        level: 1,
        kills: 0,
        score: 0,
        paused: false,
        announcementPaused: false,
        introCinematicActive: false,
        cutsceneActive: false,
        cutsceneInvincible: false,
        interactiveDodgeTutorial: false,
        currentArena: 1,
        currentWave: 1,
        waveState: WAVE_STATE.WAVE_INTRO,
        waveTimer: 0,
        bossActive: false,
        pendingLevelUps: 0,
        // Boss intro/cutscene tracking
        bossIntroDemoPhase: 0,
        introMinions: [],
        currentBossRef: null,
        // Frame-based post-defeat timers
        xpVacuumTimer: 0,
        portalSpawnTimer: 0,
        portalSpawnPos: null,
        victoryParticleWave: undefined,
        victoryParticleTimer: 0,
        victoryParticlePos: null,
        // Items
        heldItems: [],
        // Blueprints
        blueprints: {
            pending: new Set(),
            unlocked: new Set()
        },
        // Upgrade tracking
        upgradeCountsByArena: {}
    });
    gameState.unlockedMechanics = {
        pillars: false,
        ramps: false,
        platforms: false,
        tunnels: false,
        hybridChaos: false
    };
    gameState.unlockedEnemyBehaviors = {
        jumping: false,
        ambush: false,
        multiLevel: false
    };
    gameState.stats = {
        damage: 10,
        attackSpeed: 0.2,  // 3x slower initial fire rate - emphasizes positioning
        projectileCount: 1,
        projectileSpeed: 0.5,  // Reduced from 0.8 - slower bullets early game
        moveSpeed: 0.12,
        maxHealth: 100,
        pickupRange: 3,
        xpMultiplier: 1
    };
    gameState.debug = {
        enabled: false,
        noEnemies: false,
        invincible: false,
        showHitboxes: false,  // DEBUG-only: visualize collision boxes
        krakensPulseChance: 0.01,       // 0..0.99 (default 1%)
        krakensPulseInterval: 10,       // seconds between rolls (default 10s)
        krakensPulseForceEnabled: false  // Force-enable without chest pickup (debug only)
    };
    
    // Reset Dash Strike ability state
    gameState.dashStrikeEnabled = false;
    gameState.dashStrikeLevel = 0;
    gameState.dashStrikeConfig = null;
    gameState.dashStrikeCooldownTimer = 0;
    
    // Reset Siphon ability state
    gameState.siphonCooldownTimer = 0;
    
    gameState.combatStats = {
        damageDealt: 0,
        damageTaken: 0,
        kills: {},
        perfectWaves: 0,
        waveDamageTaken: 0,
        bossesDefeated: 0
    };
    gameState.shownModifiers = {};
    gameState.frameCount = 0;
    gameState.retreatTimer = 0;
    gameState.arena1ChaseState = null;
    gameState.treasureRunner = {
        spawnedThisWave: false,
        spawnedThisRun: 0,
        maxPerWave: 1,
        maxPerRun: 2
    };
    gameState.krakensPulse = {
        nextRollSimSeconds: 0,
        state: 'IDLE',
        stateTimer: 0,
        hellfireRing: null,
        playerOriginalEmissive: null,
    };
    gameState.time = {
        simSeconds: 0,
        realSeconds: 0,
        runSeconds: 0
    };
    
    // Load saved Kraken Pulse debug settings (after defaults are set)
    loadKrakenPulseDebug();
}

// Initialize Arena 1 boss chase state
// 
// IMPORTANT: Arena 1 has 7 total waves (not 3) divided into 3 segments:
// - segmentWaves defines waves per segment: {1:3, 2:2, 3:2} = 7 total
// - currentWave increments globally (1→7)
// - segment tracks which boss encounter group we're in (1→3)
// - bossEncounterCount tracks completed boss fights (0→3)
export function initArena1ChaseState() {
    gameState.arena1ChaseState = {
        enabled: true,
        segment: 1,              // 1=pre-P1, 2=between-P1-P2, 3=between-P2-P3, 4=complete
        bossPhaseToSpawn: 1,     // Which phase kit to use (1, 2, or 3)
        bossEncounterCount: 0,   // How many boss fights completed (0, 1, 2, 3)
        persistentBossHealth: null,  // Boss HP carries across encounters
        phaseThresholds: {
            1: 833,  // 66% of 1250 - retreat point for Phase 1
            2: 416   // 33% of 1250 - retreat point for Phase 2
        },
        segmentWaves: {
            1: 3,    // Waves before P1 (waves 1-3)
            2: 2,    // Waves between P1-P2 (waves 4-5)
            3: 2     // Waves between P2-P3 (waves 6-7)
        }
    };
    
    // Chase state initialized - logged at wave system level
}

// Reset Arena 1 chase state (on death/restart)
export function resetArena1ChaseState() {
    gameState.arena1ChaseState = null;
}

// Initialize difficulty from localStorage on module load
const savedDifficulty = safeLocalStorageGet(STORAGE_PREFIX + 'difficulty', 'normal');
if (['easy', 'normal', 'hard', 'nightmare'].includes(savedDifficulty)) {
    gameState.currentDifficulty = savedDifficulty;
} else {
    gameState.currentDifficulty = 'normal';
}

// Save difficulty to localStorage
export function setDifficulty(difficulty) {
    if (['easy', 'normal', 'hard', 'nightmare'].includes(difficulty)) {
        gameState.currentDifficulty = difficulty;
        safeLocalStorageSet(STORAGE_PREFIX + 'difficulty', difficulty);
    }
}

// Get current difficulty config
export function getDifficultyConfig() {
    return DIFFICULTY_CONFIG[gameState.currentDifficulty] || DIFFICULTY_CONFIG.normal;
}

// Kraken Pulse debug settings persistence
const KRAKEN_PULSE_DEBUG_KEY = `${STORAGE_PREFIX}krakenPulseDebug`;

// Load Kraken Pulse debug settings from localStorage
function loadKrakenPulseDebug() {
    const saved = safeLocalStorageGet(KRAKEN_PULSE_DEBUG_KEY, null);
    if (saved) {
        if (typeof saved.chance === 'number') gameState.debug.krakensPulseChance = saved.chance;
        if (typeof saved.interval === 'number') gameState.debug.krakensPulseInterval = saved.interval;
        if (typeof saved.forceEnabled === 'boolean') gameState.debug.krakensPulseForceEnabled = saved.forceEnabled;
    }
}

// Save Kraken Pulse debug settings to localStorage
export function saveKrakenPulseDebug() {
    safeLocalStorageSet(KRAKEN_PULSE_DEBUG_KEY, {
        chance: gameState.debug.krakensPulseChance,
        interval: gameState.debug.krakensPulseInterval,
        forceEnabled: gameState.debug.krakensPulseForceEnabled
    });
}
