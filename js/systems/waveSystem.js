import { gameState } from '../core/gameState.js';
import { enemies, getCurrentBoss, setCurrentBoss } from '../core/entities.js';
import { player } from '../entities/player.js';
import { spawnWaveEnemy } from '../entities/enemies.js';
import { spawnBoss, spawnIntroMinions, triggerDemoAbility, endDemoMode, prepareBossForCutscene, endCutsceneAndRepositionPlayer } from '../entities/boss.js';
import { clearAllPickups, updateArenaPortal, clearArenaPortal, spawnBossEntrancePortal, freezeBossEntrancePortal, updateBossEntrancePortal } from './pickups.js';
import { WAVE_STATE, WAVE_CONFIG, ENEMY_CAPS, THREAT_BUDGET, PACING_CONFIG, WAVE_MODIFIERS, COGNITIVE_LIMITS, BOSS_INTRO_CINEMATIC_DURATION, BOSS_INTRO_SLOWMO_DURATION, BOSS_INTRO_SLOWMO_SCALE, BOSS1_INTRO_DEMO, BOSS_INTRO_TOTAL_DURATION, SPAWN_CHOREOGRAPHY } from '../config/constants.js';
import { ARENA_CONFIG, getArenaWaves } from '../config/arenas.js';
import { ENEMY_TYPES } from '../config/enemies.js';
import { generateArena } from '../arena/generator.js';
import { awardArenaBadge } from './badges.js';
import { PulseMusic } from './pulseMusic.js';
import { 
    showWaveAnnouncement, 
    hideWaveAnnouncement, 
    showBossAnnouncement, 
    hideBossAnnouncement,
    hideBossHealthBar,
    showUnlockNotification,
    showBadgeUnlock,
    showModifierAnnouncement,
    showTutorialCallout,
    updateUI 
} from '../ui/hud.js';
import { scene } from '../core/scene.js';
import { startCinematic, triggerSlowMo, endCinematic } from './visualFeedback.js';
import { log, logOnce, logThrottled, assert } from './debugLog.js';

// Timing constants (in frames at 60fps) - 3x longer for readability
const WAVE_INTRO_FRAMES = 360;       // 6 seconds (3x original)
const WAVE_CLEAR_FRAMES = 270;       // 4.5 seconds (3x original)
const BOSS_INTRO_FRAMES = 540;       // 9 seconds (3x original)
const BOSS_DEFEATED_FRAMES = 180;    // 3 seconds
const ARENA_TRANSITION_FRAMES = 60;  // 1 second

export function updateWaveSystem() {
    switch (gameState.waveState) {
        case WAVE_STATE.WAVE_INTRO: handleWaveIntro(); break;
        case WAVE_STATE.WAVE_ACTIVE: handleWaveActive(); break;
        case WAVE_STATE.WAVE_CLEAR: handleWaveClear(); break;
        case WAVE_STATE.BOSS_INTRO: handleBossIntro(); break;
        case WAVE_STATE.BOSS_ACTIVE: handleBossActive(); break;
        case WAVE_STATE.BOSS_RETREAT: handleBossRetreat(); break;  // Arena 1 chase
        case WAVE_STATE.BOSS_DEFEATED: handleBossDefeated(); break;
        case WAVE_STATE.ARENA_TRANSITION: handleArenaTransition(); break;
    }
}

// Get max waves for current arena (tiered progression)
function getMaxWaves() {
    return getArenaWaves(gameState.currentArena);
}

function handleWaveIntro() {
    if (gameState.waveTimer === 0) {
        showWaveAnnouncement();
        PulseMusic.onWaveStart(gameState.currentWave);
        gameState.announcementPaused = true;  // Pause during announcement
    }
    gameState.waveTimer++;
    
    if (gameState.waveTimer > WAVE_INTRO_FRAMES) {
        gameState.waveState = WAVE_STATE.WAVE_ACTIVE;
        gameState.waveTimer = 0;
        gameState.announcementPaused = false;  // Unpause when announcement ends
        
        const maxWaves = getMaxWaves();
        const isLessonWave = (gameState.currentWave === 1);
        const isExamWave = (gameState.currentWave === maxWaves);
        
        // Determine wave type and base budget
        let waveType = 'integration';
        if (isLessonWave) waveType = 'lesson';
        else if (isExamWave) waveType = 'exam';
        
        // Check for arena-specific budget overrides
        const arenaOverrides = THREAT_BUDGET.arenaBudgetOverrides?.[gameState.currentArena]?.[waveType];
        const baseBudget = {
            ...THREAT_BUDGET.waveBudgets[waveType],
            ...arenaOverrides  // Override with arena-specific values if present
        };
        const arenaScale = THREAT_BUDGET.arenaScaling[gameState.currentArena] || 1.0;
        
        // Select wave modifier (if any)
        gameState.waveModifier = selectWaveModifier(gameState.currentArena, gameState.currentWave, maxWaves, isLessonWave);
        const modifierMult = gameState.waveModifier ? (WAVE_MODIFIERS[gameState.waveModifier].budgetMult || 1.0) : 1.0;
        
        // Announce modifier to player (only once per arena)
        if (gameState.waveModifier && WAVE_MODIFIERS[gameState.waveModifier]) {
            const arena = gameState.currentArena;
            
            // Initialize arena's shown modifiers set if needed
            if (!gameState.shownModifiers[arena]) {
                gameState.shownModifiers[arena] = new Set();
            }
            
            // Only show announcement if not previously shown in this arena
            if (!gameState.shownModifiers[arena].has(gameState.waveModifier)) {
                const modifier = WAVE_MODIFIERS[gameState.waveModifier];
                const announcement = modifier.announcement || modifier.name;
                showModifierAnnouncement(announcement);
                gameState.shownModifiers[arena].add(gameState.waveModifier);
            }
            
            // Trigger breather music mode for breather waves (always, even if not announced)
            if (gameState.waveModifier === 'breather') {
                PulseMusic.onBreatherStart();
            }
        }
        
        // Initialize threat budget
        gameState.waveBudgetRemaining = Math.floor(baseBudget.total * arenaScale * modifierMult);
        
        // Apply cognitive cap from modifier if specified (breather waves have lower cognitive load)
        const modifierConfig = gameState.waveModifier ? WAVE_MODIFIERS[gameState.waveModifier] : null;
        gameState.waveCognitiveMax = modifierConfig?.cognitiveMax || baseBudget.maxCognitive;
        gameState.waveCognitiveUsed = 0;
        gameState.waveSpawnCount = 0;
        gameState.lastWaveSpawn = 0;
        
        // Micro-breather tracking
        gameState.microBreatherActive = false;
        gameState.microBreatherTimer = 0;
        gameState.stressPauseActive = false;
        gameState.waveSpawnWarned = false; // Reset spawn warning flag
        
        // Initialize enemy pool for cognitive caps
        initializeWaveEnemyPool();
        
        // Initialize spawn choreography for this wave
        initializeWaveChoreography();
        
        // Track wave start time for speed bonus calculation
        gameState.waveStartTime = Date.now();
        
        // Log wave start with full context
        log('WAVE', 'start', {
            wave: gameState.currentWave,
            budget: gameState.waveBudgetRemaining,
            cognitiveMax: gameState.waveCognitiveMax,
            modifier: gameState.waveModifier || 'none',
            waveType: getWaveType(gameState.currentWave, getMaxWaves())
        });
        
        // Legacy compatibility - estimate enemy count for UI
        const avgCost = 20;
        gameState.enemiesToSpawn = Math.ceil(gameState.waveBudgetRemaining / avgCost);
        gameState.waveEnemiesRemaining = gameState.enemiesToSpawn;
        
        hideWaveAnnouncement();
    }
}

// Initialize spawn choreography for the wave
function initializeWaveChoreography() {
    const arena = gameState.currentArena;
    const wave = gameState.currentWave;
    
    // Check if choreography is enabled and configured for this arena/wave
    const arenaConfig = SPAWN_CHOREOGRAPHY[`arena${arena}`];
    const choreographyType = arenaConfig?.[wave] || 'random';
    
    gameState.waveChoreography = {
        type: choreographyType,
        primaryDirection: null,
        secondaryDirection: null
    };
    
    if (choreographyType === 'random' || !SPAWN_CHOREOGRAPHY.enabled) {
        return; // No choreography needed
    }
    
    const directions = SPAWN_CHOREOGRAPHY.directions;
    
    if (choreographyType === 'lane') {
        // Pick a random direction for the lane flood
        gameState.waveChoreography.primaryDirection = directions[Math.floor(Math.random() * directions.length)];
    } else if (choreographyType === 'pincer') {
        // Pick two opposite directions
        const primaryIndex = Math.floor(Math.random() * 2); // 0 = north/south, 1 = east/west
        if (primaryIndex === 0) {
            gameState.waveChoreography.primaryDirection = 'north';
            gameState.waveChoreography.secondaryDirection = 'south';
        } else {
            gameState.waveChoreography.primaryDirection = 'east';
            gameState.waveChoreography.secondaryDirection = 'west';
        }
    }
    
    // Log wave spawn pattern
    log('SPAWN', 'choreography_init', {
        pattern: choreographyType,
        primary: gameState.waveChoreography.primaryDirection,
        secondary: gameState.waveChoreography.secondaryDirection
    });
}

// Select wave modifier based on arena and wave
function selectWaveModifier(arena, wave, maxWaves, isLessonWave) {
    // No modifiers on lesson waves
    if (isLessonWave) return null;
    
    // Check for breather waves from arena config (takes priority)
    const arenaConfig = ARENA_CONFIG.arenas[arena];
    if (arenaConfig?.breatherWaves?.includes(wave)) {
        return 'breather';
    }
    
    // Final wave before boss always gets harbingers (if unlocked enemies exist)
    if (wave === maxWaves && arena >= 3) {
        return 'harbingers';
    }
    
    // Chance of modifier increases with arena
    const modifierChance = 0.10 + arena * 0.05;
    if (Math.random() > modifierChance) return null;
    
    // Select random modifier
    const options = ['elite', 'rush', 'swarm'];
    return options[Math.floor(Math.random() * options.length)];
}

// Initialize the enemy pool for this wave (cognitive caps)
function initializeWaveEnemyPool() {
    const arena = gameState.currentArena;
    const maxTypes = COGNITIVE_LIMITS.maxTypesPerWave[arena] || 4;
    const arenaConfig = ARENA_CONFIG.arenas[arena];
    const lessonEnemy = arenaConfig?.lessonEnemy || 'grunt';
    
    // Check if modifier forces specific types
    if (gameState.waveModifier && WAVE_MODIFIERS[gameState.waveModifier].forceTypes) {
        gameState.waveEnemyPool = WAVE_MODIFIERS[gameState.waveModifier].forceTypes;
        return;
    }
    
    // Always include the arena's featured enemy
    const pool = [lessonEnemy];
    
    // Get all available enemy types for this arena
    const available = getAvailableEnemyTypesForArena(arena);
    const others = available.filter(t => t !== lessonEnemy);
    
    // Shuffle and fill remaining slots
    shuffleArray(others);
    while (pool.length < maxTypes && others.length > 0) {
        pool.push(others.pop());
    }
    
    gameState.waveEnemyPool = pool;
}

// Get enemy types available in this arena
function getAvailableEnemyTypesForArena(arena) {
    const types = [];
    
    for (const [name, data] of Object.entries(ENEMY_TYPES)) {
        if (data.spawnWeight <= 0) continue;
        if (data.arenaIntro && data.arenaIntro > arena) continue;
        if (data.maxArena && data.maxArena < arena) continue;
        types.push(name);
    }
    
    return types;
}

// Fisher-Yates shuffle
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}

function handleWaveActive() {
    // Skip enemy spawning if debug mode is enabled with noEnemies flag
    if (gameState.debug && gameState.debug.noEnemies) {
        return;
    }
    
    const now = Date.now();
    const maxWaves = getMaxWaves();
    const isLessonWave = (gameState.currentWave === 1);
    const isExamWave = (gameState.currentWave === maxWaves);
    
    // Check for stress pause (too many enemies alive)
    if (enemies.length >= PACING_CONFIG.stressPauseThreshold) {
        if (!gameState.stressPauseActive) {
            gameState.stressPauseActive = true;
            // Optional: signal music to dip
        }
        // Don't spawn more until player clears some
        checkWaveComplete();
        return;
    }
    gameState.stressPauseActive = false;
    
    // Check for micro-breather
    if (gameState.waveSpawnCount > 0 && 
        gameState.waveSpawnCount % PACING_CONFIG.microBreatherInterval === 0 && 
        !gameState.microBreatherActive &&
        gameState.waveBudgetRemaining > 0) {
        
        gameState.microBreatherActive = true;
        gameState.microBreatherTimer = 0;
        PulseMusic.onBreatherStart();
    }
    
    // Handle micro-breather duration
    if (gameState.microBreatherActive) {
        gameState.microBreatherTimer++;
        if (gameState.microBreatherTimer < PACING_CONFIG.microBreatherDuration) {
            checkWaveComplete();
            return; // Pause spawning
        }
        // Breather complete
        gameState.microBreatherActive = false;
        gameState.microBreatherTimer = 0;
        PulseMusic.onBreatherEnd();
    }
    
    // Determine spawn interval based on wave type
    let spawnInterval;
    let burstChance;
    
    if (isLessonWave) {
        spawnInterval = WAVE_CONFIG.lessonWave.interval;
        burstChance = WAVE_CONFIG.lessonWave.burstChance;
    } else if (isExamWave) {
        spawnInterval = WAVE_CONFIG.examWave.interval;
        burstChance = WAVE_CONFIG.examWave.burstChance;
    } else {
        // Integration wave
        spawnInterval = Math.max(
            WAVE_CONFIG.integrationWave.intervalMin,
            WAVE_CONFIG.integrationWave.intervalBase - gameState.currentWave * 30
        );
        burstChance = Math.min(
            WAVE_CONFIG.integrationWave.burstChanceMax,
            WAVE_CONFIG.integrationWave.burstChanceBase + gameState.currentWave * 0.02
        );
    }
    
    // Apply modifier effects
    if (gameState.waveModifier && WAVE_MODIFIERS[gameState.waveModifier]) {
        const modifier = WAVE_MODIFIERS[gameState.waveModifier];
        if (modifier.intervalMult) {
            spawnInterval *= modifier.intervalMult;
        }
        // Breather waves have no burst spawns
        if (gameState.waveModifier === 'breather') {
            burstChance = 0;
        }
    }
    
    // Arena 5 special: reduce burst chance (tunnels amplify unfairness)
    if (gameState.currentArena === 5) {
        burstChance *= 0.5;
    }
    
    // Budget-based spawning
    if (gameState.waveBudgetRemaining > 0 && now - gameState.lastWaveSpawn > spawnInterval) {
        // Burst spawns
        const shouldBurst = Math.random() < burstChance;
        const burstCount = shouldBurst ? (2 + Math.floor(Math.random() * 2)) : 1;
        
        for (let i = 0; i < burstCount && gameState.waveBudgetRemaining > 0; i++) {
            const spawned = spawnWaveEnemy();
            if (!spawned) {
                // No affordable enemy available - exhaust budget to prevent infinite loop
                // Rate-limit warning to avoid console spam (only warn once per wave)
                if (gameState.waveBudgetRemaining > 0 && !gameState.waveSpawnWarned) {
                    logOnce(`wave-${gameState.currentWave}-no-affordable`, 'SAFETY', 'no_affordable_enemy', {
                        budget: gameState.waveBudgetRemaining,
                        cognitiveUsed: gameState.waveCognitiveUsed,
                        cognitiveMax: gameState.waveCognitiveMax
                    });
                    gameState.waveSpawnWarned = true;
                }
                gameState.waveBudgetRemaining = 0;
                break;
            }
            
            // Deduct cost from budget
            const cost = getEnemyThreatCost(spawned.enemyType);
            gameState.waveBudgetRemaining -= cost;
            gameState.waveCognitiveUsed += THREAT_BUDGET.costs[spawned.enemyType]?.cognitive || 1;
            gameState.waveSpawnCount++;
            
            // Update legacy counter for UI
            if (gameState.enemiesToSpawn > 0) {
                gameState.enemiesToSpawn--;
            }
        }
        gameState.lastWaveSpawn = now;
    }
    
    checkWaveComplete();
}

// Calculate threat cost for an enemy type
function getEnemyThreatCost(enemyType) {
    const costs = THREAT_BUDGET.costs[enemyType];
    if (!costs) return 20; // Default cost
    return costs.durability + costs.damage;
}

// Check if wave is complete
function checkWaveComplete() {
    const budgetExhausted = gameState.waveBudgetRemaining <= 0;
    const allEnemiesDead = enemies.length === 0;
    
    // Wave completes when all enemies are dead - XP collection not required
    if (budgetExhausted && allEnemiesDead && !getCurrentBoss()) {
        gameState.waveState = WAVE_STATE.WAVE_CLEAR;
        gameState.waveTimer = 0;
    }
}

function handleWaveClear() {
    if (gameState.waveTimer === 0) {
        PulseMusic.onWaveClear();
        
        // End breather music mode if this was a breather wave
        if (gameState.waveModifier === 'breather') {
            PulseMusic.onBreatherEnd();
        }
        
        // Calculate and award speed bonus for fast wave clear
        if (gameState.waveStartTime) {
            const clearTimeSeconds = (Date.now() - gameState.waveStartTime) / 1000;
            // Bonus formula: up to 300 points for sub-10s clear, 0 for 30s+
            const speedBonus = Math.max(0, Math.floor((30 - clearTimeSeconds) * 10));
            
            log('SCORE', 'speed_bonus', {
                wave: gameState.currentWave,
                clearTime: parseFloat(clearTimeSeconds.toFixed(1)),
                bonus: speedBonus
            });
            
            if (speedBonus > 0) {
                gameState.score += speedBonus;
            }
        }
        
        // Log wave clear
        log('WAVE', 'clear', {
            wave: gameState.currentWave,
            budgetRemaining: gameState.waveBudgetRemaining,
            modifier: gameState.waveModifier || 'none'
        });
        
        // Track perfect wave (no damage taken)
        if (gameState.combatStats && gameState.combatStats.waveDamageTaken === 0) {
            gameState.combatStats.perfectWaves++;
        }
        // Reset wave damage tracker for next wave
        if (gameState.combatStats) {
            gameState.combatStats.waveDamageTaken = 0;
        }
    }
    gameState.waveTimer++;
    
    if (gameState.waveTimer > WAVE_CLEAR_FRAMES) {
        // Check for Arena 1 boss chase - boss returns after segment waves
        if (shouldBossReturn()) {
            // Prepare next boss phase
            const chase = gameState.arena1ChaseState;
            chase.bossPhaseToSpawn = chase.bossEncounterCount + 1;
            
            log('BOSS', 'return_triggered', {
                phase: chase.bossPhaseToSpawn,
                persistentHP: chase.persistentBossHealth,
                segment: chase.segment,
                encounters: chase.bossEncounterCount
            });
            
            gameState.waveState = WAVE_STATE.BOSS_INTRO;
            gameState.waveTimer = 0;
            updateUI();
            return;
        }
        
        // Normal wave progression
        const maxWaves = getMaxWaves();
        if (gameState.currentWave >= maxWaves) {
            gameState.waveState = WAVE_STATE.BOSS_INTRO;
        } else {
            gameState.currentWave++;
            gameState.waveState = WAVE_STATE.WAVE_INTRO;
        }
        gameState.waveTimer = 0;
        updateUI();
    }
}

function handleBossIntro() {
    if (gameState.waveTimer === 0) {
        showBossAnnouncement();
        PulseMusic.onBossStart(gameState.currentArena);
        gameState.announcementPaused = true;  // Pause during announcement
        gameState.bossIntroDemoPhase = 0;     // Track demo sequence progress
        gameState.introMinions = [];           // Track demo minions for cleanup
    }
    gameState.waveTimer++;
    
    // Spawn entrance portal 3 seconds before boss (180 frames)
    const PORTAL_SPAWN_FRAMES = BOSS_INTRO_FRAMES - 180;
    if (gameState.waveTimer === PORTAL_SPAWN_FRAMES) {
        // Spawn entrance portal near the wall (original boss spawn location)
        spawnBossEntrancePortal(new THREE.Vector3(0, 0, -35));
    }
    
    // Update entrance portal animation during intro
    if (gameState.waveTimer > PORTAL_SPAWN_FRAMES && gameState.waveTimer <= BOSS_INTRO_FRAMES) {
        updateBossEntrancePortal();
    }
    
    // Phase 1: Wait for announcement, then spawn boss
    if (gameState.waveTimer === BOSS_INTRO_FRAMES) {
        // Clear any remaining pickups before boss fight
        clearAllPickups();
        
        const boss = spawnBoss(gameState.currentArena);
        gameState.currentBossRef = boss;  // Store reference for demo sequence
        hideBossAnnouncement();
        
        // Freeze the entrance portal now that boss has emerged
        freezeBossEntrancePortal();
        
        // Trigger cinematic camera focus on boss
        if (boss) {
            // Player visible and controllable for interactive dodge tutorial (Arena 1)
            // Still invincible during demo via cutsceneInvincible flag
            if (player) {
                player.visible = true;  // Player participates in dodge tutorial
            }
            
            // Phase 1 intro: Use intro_showcase state (stays at spawn, actively prowls)
            // Other bosses: Use prepareBossForCutscene (moves to safe position, idle)
            if (gameState.currentArena === 1) {
                // Set cutscene state manually (don't call prepareBossForCutscene - it moves the boss)
                gameState.cutsceneActive = true;
                gameState.cutsceneInvincible = true;
                boss.aiState = 'intro_showcase';  // New active showcase state
                boss.showcaseTimer = 0;
            } else {
                prepareBossForCutscene(boss);
            }
            
            // Extended cinematic duration for Arena 1 demo sequence
            const cinematicDuration = (gameState.currentArena === 1) 
                ? BOSS_INTRO_TOTAL_DURATION 
                : BOSS_INTRO_CINEMATIC_DURATION;
            startCinematic(boss, cinematicDuration, true);
            triggerSlowMo(BOSS_INTRO_SLOWMO_DURATION, BOSS_INTRO_SLOWMO_SCALE);
        }
    }
    
    // Boss 1 (Arena 1) Extended Demo Sequence - teach charge pattern with 3 demos
    // Boss prowls continuously in intro_showcase state between demos
    if (gameState.currentArena === 1 && gameState.waveTimer > BOSS_INTRO_FRAMES) {
        const framesSinceSpawn = gameState.waveTimer - BOSS_INTRO_FRAMES;
        const boss = gameState.currentBossRef || getCurrentBoss();
        
        // Check if boss is currently in a demo ability (don't interrupt)
        const inDemoAbility = boss && (
            boss.aiState === 'demo_dodge_wait' ||
            boss.aiState === 'wind_up' ||
            boss.aiState === 'charging' ||
            boss.aiState === 'wall_impact' ||
            boss.aiState === 'wall_recovery' ||
            boss.aiState === 'cooldown'
        );
        
        // Demo charge #1 (slow, with slow-mo for readability) - 6 seconds
        if (framesSinceSpawn === BOSS1_INTRO_DEMO.CHARGE_DEMO_1 && boss && !inDemoAbility) {
            triggerSlowMo(BOSS1_INTRO_DEMO.CHARGE_1_SLOWMO_DURATION, BOSS1_INTRO_DEMO.CHARGE_1_SLOWMO_SCALE);
            triggerDemoAbility(boss, 'charge');
            gameState.bossIntroDemoPhase = 1;
        }
        
        // Teaching text (after first demo so player sees pattern first) - 10 seconds
        if (framesSinceSpawn === BOSS1_INTRO_DEMO.TEXT_LESSON && boss) {
            showTutorialCallout('introLesson', 'Watch the wind-up → dodge the dash → punish recovery', 3000);
            gameState.bossIntroDemoPhase = 2;
        }
        
        // Demo charge #2 (normal speed, same tells) - 15 seconds
        if (framesSinceSpawn === BOSS1_INTRO_DEMO.CHARGE_DEMO_2 && boss && !inDemoAbility) {
            triggerDemoAbility(boss, 'charge');
            gameState.bossIntroDemoPhase = 3;
        }
        
        // Demo charge #3 (shows pattern repeats) - 20 seconds
        if (framesSinceSpawn === BOSS1_INTRO_DEMO.CHARGE_DEMO_3 && boss && !inDemoAbility) {
            triggerDemoAbility(boss, 'charge');
            gameState.bossIntroDemoPhase = 4;
        }
        
        // Demo charge #4 (reinforces pattern) - 24 seconds
        if (framesSinceSpawn === BOSS1_INTRO_DEMO.CHARGE_DEMO_4 && boss && !inDemoAbility) {
            triggerDemoAbility(boss, 'charge');
            gameState.bossIntroDemoPhase = 5;
        }
        
        // "FIGHT!" text - 28 seconds
        if (framesSinceSpawn === BOSS1_INTRO_DEMO.TEXT_FIGHT && boss) {
            showTutorialCallout('introFight', 'FIGHT!', 1500);
            gameState.bossIntroDemoPhase = 6;
        }
        
        // Demo Complete: Transition to combat - 30 seconds
        if (framesSinceSpawn >= BOSS1_INTRO_DEMO.SEQUENCE_END) {
            if (boss) {
                endDemoMode(boss);
                // Safely reposition player and resume boss AI
                endCutsceneAndRepositionPlayer(boss);
            }
            gameState.bossActive = true;
            gameState.waveState = WAVE_STATE.BOSS_ACTIVE;
            gameState.waveTimer = 0;
            gameState.announcementPaused = false;
            gameState.bossIntroDemoPhase = 0;
            gameState.currentBossRef = null;
            return;
        }
    }
    // Non-Arena 1 bosses: Immediate transition (existing behavior)
    else if (gameState.currentArena !== 1 && gameState.waveTimer > BOSS_INTRO_FRAMES) {
        const boss = gameState.currentBossRef || getCurrentBoss();
        if (boss) {
            // Safely reposition player and resume boss AI
            endCutsceneAndRepositionPlayer(boss);
        }
        gameState.bossActive = true;
        gameState.waveState = WAVE_STATE.BOSS_ACTIVE;
        gameState.waveTimer = 0;
        gameState.announcementPaused = false;
    }
}

function handleBossActive() {
    // Update entrance portal animation (frozen state)
    updateBossEntrancePortal();
    
    if (!getCurrentBoss() || !gameState.bossActive) {
        gameState.waveState = WAVE_STATE.BOSS_DEFEATED;
        gameState.waveTimer = 0;
    }
}

// ==================== BOSS CHASE: HELPER FUNCTIONS ====================
// Check if boss should return based on Arena 1 chase state
function shouldBossReturn() {
    const chase = gameState.arena1ChaseState;
    if (!chase?.enabled) return false;
    
    // All encounters complete - use normal boss flow
    if (chase.bossEncounterCount >= 3) return false;
    
    // Calculate waves completed in current segment
    const segmentWaveTarget = getSegmentWaveTarget(chase.segment);
    
    // Boss returns when current wave equals the segment target
    // (Wave numbers: P1 after wave 3, P2 after wave 5, P3 after wave 7)
    const shouldReturn = gameState.currentWave >= segmentWaveTarget;
    
    logOnce(`boss-return-check-w${gameState.currentWave}`, 'BOSS', 'return_check', {
        wave: gameState.currentWave,
        segment: chase.segment,
        target: segmentWaveTarget,
        encounters: chase.bossEncounterCount,
        shouldReturn
    });
    
    return shouldReturn;
}

// Get the wave number that triggers boss return for a segment
function getSegmentWaveTarget(segment) {
    const chase = gameState.arena1ChaseState;
    if (!chase) return 999;
    
    // Sum up waves from previous segments
    let totalWaves = 0;
    for (let s = 1; s <= segment; s++) {
        totalWaves += chase.segmentWaves[s] || 2;
    }
    return totalWaves;
}

// ==================== BOSS CHASE: RETREAT STATE ====================
// Handles boss retreat animation and transition back to waves (Arena 1)
const BOSS_RETREAT_FRAMES = 60;  // 1 second retreat animation

function handleBossRetreat() {
    const boss = getCurrentBoss();
    
    gameState.waveTimer++;
    
    // Animate boss retreat (shrink + rise)
    if (boss && boss.isRetreating) {
        boss.retreatAnimTimer = (boss.retreatAnimTimer || 0) + 1;
        
        // Throttled retreat animation log (avoid spam)
        logThrottled('retreat-anim', 500, 'BOSS', 'retreat_animation', {
            frame: boss.retreatAnimTimer,
            totalFrames: BOSS_RETREAT_FRAMES,
            scale: parseFloat(boss.scale.x.toFixed(2))
        });
        
        // Shrink and float up
        boss.position.y += 0.2;
        boss.scale.multiplyScalar(0.95);
        
        // Spin effect
        boss.rotation.y += 0.1;
    }
    
    // Complete retreat after animation
    if (gameState.waveTimer >= BOSS_RETREAT_FRAMES) {
        completeRetreat(boss);
    }
}

function completeRetreat(boss) {
    // Remove boss from scene
    if (boss) {
        scene.remove(boss);
        const index = enemies.indexOf(boss);
        if (index > -1) enemies.splice(index, 1);
        
        // Clean up boss reference
        setCurrentBoss(null);
    }
    
    // Update chase state
    if (gameState.arena1ChaseState) {
        gameState.arena1ChaseState.segment++;
        gameState.arena1ChaseState.bossEncounterCount++;
        
        log('BOSS', 'retreat_complete', {
            segment: gameState.arena1ChaseState.segment,
            encounters: gameState.arena1ChaseState.bossEncounterCount,
            persistentHP: gameState.arena1ChaseState.persistentBossHealth
        });
    }
    
    // Clear enemies near boss spawn area for safety
    clearEnemiesNearCenter();
    
    // Freeze remaining enemies briefly
    freezeAllEnemies(60);  // 1 second freeze
    
    // Hide boss health bar
    hideBossHealthBar();
    
    // Reset boss active flag
    gameState.bossActive = false;
    
    // Return to waves - advance to next wave
    gameState.currentWave++;
    gameState.waveState = WAVE_STATE.WAVE_INTRO;
    gameState.waveTimer = 0;
    
    log('STATE', 'boss_return_to_waves', { nextWave: gameState.currentWave });
}

// Helper: Clear enemies near arena center (boss spawn/despawn safety)
function clearEnemiesNearCenter(radius = 15) {
    let cleared = 0;
    for (let i = enemies.length - 1; i >= 0; i--) {
        const enemy = enemies[i];
        if (enemy.isBoss) continue;
        
        const dist = Math.sqrt(enemy.position.x ** 2 + enemy.position.z ** 2);
        if (dist < radius) {
            scene.remove(enemy);
            enemies.splice(i, 1);
            cleared++;
        }
    }
    log('SAFETY', 'center_cleared', { removed: cleared, radius });
}

// Helper: Freeze all non-boss enemies for a duration
function freezeAllEnemies(frames) {
    let frozenCount = 0;
    for (const enemy of enemies) {
        if (!enemy.isBoss) {
            enemy.frozen = true;
            enemy.frozenTimer = frames;
            frozenCount++;
        }
    }
    log('SAFETY', 'enemies_frozen', { count: frozenCount, frames });
}

function handleBossDefeated() {
    if (gameState.waveTimer === 0) {
        unlockArenaMechanics(gameState.currentArena);
        PulseMusic.onBossDefeat();
        
        // Award persistent arena badge
        const badge = awardArenaBadge(gameState.currentArena);
        if (badge) {
            showBadgeUnlock(badge);
        }
    }
    gameState.waveTimer++;
    
    // Final boss (Arena 6): Auto-transition after celebration (no portal needed - game ends)
    const isFinalBoss = gameState.currentArena === 6;
    if (isFinalBoss && gameState.waveTimer > BOSS_DEFEATED_FRAMES * 3) {
        // Extended celebration time for final boss victory
        gameState.waveState = WAVE_STATE.ARENA_TRANSITION;
        gameState.waveTimer = 0;
        return;
    }
    
    // Other arenas: Wait for player to enter portal
    // Entrance portal unfreezes when boss dies (called from killBoss)
    // updateBossEntrancePortal() handles collision detection and triggers ARENA_TRANSITION
    if (!isFinalBoss && gameState.waveTimer > BOSS_DEFEATED_FRAMES) {
        // Update entrance portal animation (now unfrozen) and check for player entry
        // triggerPortalTransition() in pickups.js sets waveState to ARENA_TRANSITION
        updateBossEntrancePortal();
        
        // Also update arena portal if it exists (fallback for older boss death flow)
        updateArenaPortal();
    }
}

function handleArenaTransition() {
    gameState.waveTimer++;
    
    if (gameState.waveTimer > ARENA_TRANSITION_FRAMES) {
        // Clear portal before transitioning
        clearArenaPortal();
        
        gameState.currentArena++;
        gameState.currentWave = 1;
        generateArena(gameState.currentArena);
        player.position.set(0, 1, 0);
        player.velocity.set(0, 0, 0);
        gameState.waveState = WAVE_STATE.WAVE_INTRO;
        gameState.waveTimer = 0;
        
        // Load new arena music profile
        PulseMusic.onArenaChange(gameState.currentArena);
        
        updateUI();
    }
}

function unlockArenaMechanics(defeatedArena) {
    let unlockMessage = '';
    
    switch (defeatedArena) {
        case 1:
            gameState.unlockedMechanics.pillars = true;
            unlockMessage = 'PILLARS & COVER';
            break;
        case 2:
            gameState.unlockedMechanics.ramps = true;
            gameState.unlockedEnemyBehaviors.jumping = true;
            unlockMessage = 'VERTICALITY - Enemies can jump!';
            break;
        case 3:
            gameState.unlockedMechanics.platforms = true;
            gameState.unlockedEnemyBehaviors.multiLevel = true;
            unlockMessage = 'MULTI-PLATFORM COMBAT';
            break;
        case 4:
            gameState.unlockedMechanics.tunnels = true;
            gameState.unlockedEnemyBehaviors.ambush = true;
            unlockMessage = 'TUNNELS & AMBUSHES';
            break;
        case 5:
            gameState.unlockedMechanics.hybridChaos = true;
            unlockMessage = 'CHAOS MODE UNLOCKED';
            break;
    }
    
    if (unlockMessage) showUnlockNotification(unlockMessage);
}
