import { STORAGE_PREFIX, THREAT_BUDGET, PACING_CONFIG } from './constants.js';
import { safeLocalStorageGet, safeLocalStorageSet } from '../utils/storage.js';
import { gameState } from '../core/gameState.js';
import { ENEMY_TYPES } from './enemies.js';
import { MODULE_CONFIG } from './modules.js';
import { BOSS_CONFIG } from './bosses.js';

const BALANCE_STORAGE_KEY = STORAGE_PREFIX + 'balanceOverridesV1';

function clampNumber(value, min, max) {
    if (typeof value !== 'number' || Number.isNaN(value) || !Number.isFinite(value)) return null;
    if (typeof min === 'number') value = Math.max(min, value);
    if (typeof max === 'number') value = Math.min(max, value);
    return value;
}

function readOverrides() {
    const raw = safeLocalStorageGet(BALANCE_STORAGE_KEY, {});
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
    return raw;
}

function writeOverrides(overrides) {
    safeLocalStorageSet(BALANCE_STORAGE_KEY, overrides || {});
}

// In-memory cache to reduce localStorage churn when dragging sliders
let overrideCache = readOverrides();

function setOverride(key, value) {
    overrideCache[key] = value;
    writeOverrides(overrideCache);
}

function clearOverride(key) {
    if (overrideCache && Object.prototype.hasOwnProperty.call(overrideCache, key)) {
        delete overrideCache[key];
        writeOverrides(overrideCache);
    }
}

function resetAllOverridesStorage() {
    overrideCache = {};
    writeOverrides(overrideCache);
}

function updateDashStrikeDescForLevel(level) {
    const cfg = MODULE_CONFIG?.unlockable?.dashStrike;
    if (!cfg) return;
    const effects = cfg.effectsByLevel?.[level];
    if (!effects) return;
    const dist = effects.dashDistance;
    const cdFrames = effects.cooldown;
    const cdSeconds = Math.max(0, Math.round((cdFrames / 60) * 10) / 10);
    cfg.desc[level] = `Dash attack (${dist} range, ${cdSeconds}s CD)`;
}

// Param builder helpers
function numberParam({ key, category, label, min, max, step, getDefault, apply }) {
    return {
        key,
        category,
        label,
        type: 'number',
        min,
        max,
        step,
        getDefault,
        apply
    };
}

// ==================== PARAM REGISTRY ====================
// Each param: getDefault() reads the baseline value; apply(value) mutates live runtime/config objects.
const BALANCE_PARAMS = [];

// Player runtime stats (affects current run; re-applied at start/restart)
BALANCE_PARAMS.push(
    numberParam({
        key: 'player.damage',
        category: 'Player',
        label: 'Base damage',
        min: 1,
        max: 200,
        step: 1,
        getDefault: () => gameState.stats.damage,
        apply: (v) => { gameState.stats.damage = v; }
    }),
    numberParam({
        key: 'player.moveSpeed',
        category: 'Player',
        label: 'Move speed',
        min: 0.01,
        max: 1.0,
        step: 0.005,
        getDefault: () => gameState.stats.moveSpeed,
        apply: (v) => { gameState.stats.moveSpeed = v; }
    }),
    numberParam({
        key: 'player.attackSpeed',
        category: 'Player',
        label: 'Attack speed (shots/frame)',
        min: 0.01,
        max: 1.0,
        step: 0.01,
        getDefault: () => gameState.stats.attackSpeed,
        apply: (v) => { gameState.stats.attackSpeed = v; }
    }),
    numberParam({
        key: 'player.projectileSpeed',
        category: 'Player',
        label: 'Projectile speed',
        min: 0.05,
        max: 5.0,
        step: 0.05,
        getDefault: () => gameState.stats.projectileSpeed,
        apply: (v) => { gameState.stats.projectileSpeed = v; }
    }),
    numberParam({
        key: 'player.maxHealth',
        category: 'Player',
        label: 'Max health',
        min: 10,
        max: 999,
        step: 5,
        getDefault: () => gameState.stats.maxHealth,
        apply: (v) => {
            gameState.stats.maxHealth = v;
            gameState.maxHealth = v;
            gameState.health = Math.min(gameState.health, gameState.maxHealth);
        }
    }),
    numberParam({
        key: 'player.pickupRange',
        category: 'Player',
        label: 'Pickup range',
        min: 0.5,
        max: 20,
        step: 0.1,
        getDefault: () => gameState.stats.pickupRange,
        apply: (v) => { gameState.stats.pickupRange = v; }
    })
);

// Dash Strike module tuning (affects module config + current run if active)
for (const level of [1, 2, 3]) {
    BALANCE_PARAMS.push(
        numberParam({
            key: `dashStrike.L${level}.distance`,
            category: 'DashStrike',
            label: `Dash distance (L${level})`,
            min: 4,
            max: 60,
            step: 1,
            getDefault: () => MODULE_CONFIG.unlockable.dashStrike.effectsByLevel[level].dashDistance,
            apply: (v) => {
                MODULE_CONFIG.unlockable.dashStrike.effectsByLevel[level].dashDistance = v;
                updateDashStrikeDescForLevel(level);
                if (gameState.dashStrikeEnabled && gameState.dashStrikeLevel === level && gameState.dashStrikeConfig) {
                    gameState.dashStrikeConfig.distance = v;
                }
            }
        }),
        numberParam({
            key: `dashStrike.L${level}.cooldown`,
            category: 'DashStrike',
            label: `Cooldown frames (L${level})`,
            min: 0,
            max: 1200,
            step: 5,
            getDefault: () => MODULE_CONFIG.unlockable.dashStrike.effectsByLevel[level].cooldown,
            apply: (v) => {
                MODULE_CONFIG.unlockable.dashStrike.effectsByLevel[level].cooldown = v;
                updateDashStrikeDescForLevel(level);
                if (gameState.dashStrikeEnabled && gameState.dashStrikeLevel === level && gameState.dashStrikeConfig) {
                    gameState.dashStrikeConfig.cooldown = v;
                }
            }
        }),
        numberParam({
            key: `dashStrike.L${level}.damage`,
            category: 'DashStrike',
            label: `Damage (L${level})`,
            min: 0,
            max: 200,
            step: 1,
            getDefault: () => MODULE_CONFIG.unlockable.dashStrike.effectsByLevel[level].damage,
            apply: (v) => {
                MODULE_CONFIG.unlockable.dashStrike.effectsByLevel[level].damage = v;
                if (gameState.dashStrikeEnabled && gameState.dashStrikeLevel === level && gameState.dashStrikeConfig) {
                    gameState.dashStrikeConfig.damage = v;
                }
            }
        })
    );
}

// Enemy type tuning (config-time)
for (const [enemyId, enemyCfg] of Object.entries(ENEMY_TYPES)) {
    const name = enemyCfg?.name || enemyId;
    BALANCE_PARAMS.push(
        numberParam({
            key: `enemy.${enemyId}.health`,
            category: 'Enemies',
            label: `${name} health`,
            min: 1,
            max: 9999,
            step: 1,
            getDefault: () => ENEMY_TYPES[enemyId].health,
            apply: (v) => { ENEMY_TYPES[enemyId].health = v; }
        }),
        numberParam({
            key: `enemy.${enemyId}.speed`,
            category: 'Enemies',
            label: `${name} speed`,
            min: 0,
            max: 1.0,
            step: 0.005,
            getDefault: () => ENEMY_TYPES[enemyId].speed,
            apply: (v) => { ENEMY_TYPES[enemyId].speed = v; }
        }),
        numberParam({
            key: `enemy.${enemyId}.damage`,
            category: 'Enemies',
            label: `${name} contact damage`,
            min: 0,
            max: 200,
            step: 1,
            getDefault: () => ENEMY_TYPES[enemyId].damage,
            apply: (v) => { ENEMY_TYPES[enemyId].damage = v; }
        }),
        numberParam({
            key: `enemy.${enemyId}.xpValue`,
            category: 'Enemies',
            label: `${name} XP value`,
            min: 0,
            max: 1000,
            step: 0.5,
            getDefault: () => ENEMY_TYPES[enemyId].xpValue,
            apply: (v) => { ENEMY_TYPES[enemyId].xpValue = v; }
        })
    );
}

// Boss 1 tuning (config-time)
if (BOSS_CONFIG && BOSS_CONFIG[1]) {
    BALANCE_PARAMS.push(
        numberParam({
            key: 'boss1.health',
            category: 'Boss1',
            label: 'Boss 1 health',
            min: 1,
            max: 99999,
            step: 25,
            getDefault: () => BOSS_CONFIG[1].health,
            apply: (v) => { BOSS_CONFIG[1].health = v; }
        }),
        numberParam({
            key: 'boss1.damage',
            category: 'Boss1',
            label: 'Boss 1 damage',
            min: 0,
            max: 500,
            step: 1,
            getDefault: () => BOSS_CONFIG[1].damage,
            apply: (v) => { BOSS_CONFIG[1].damage = v; }
        }),
        numberParam({
            key: 'boss1.speed',
            category: 'Boss1',
            label: 'Boss 1 speed',
            min: 0,
            max: 1.0,
            step: 0.005,
            getDefault: () => BOSS_CONFIG[1].speed,
            apply: (v) => { BOSS_CONFIG[1].speed = v; }
        }),
        numberParam({
            key: 'boss1.shieldDR',
            category: 'Boss1',
            label: 'Shield damage reduction',
            min: 0,
            max: 0.99,
            step: 0.01,
            getDefault: () => BOSS_CONFIG[1].shieldConfig?.damageReduction ?? 0.75,
            apply: (v) => {
                if (!BOSS_CONFIG[1].shieldConfig) BOSS_CONFIG[1].shieldConfig = {};
                BOSS_CONFIG[1].shieldConfig.damageReduction = v;
            }
        }),
        numberParam({
            key: 'boss1.chargeRecoveryP1',
            category: 'Boss1',
            label: 'Charge recovery (Phase 1 frames)',
            min: 0,
            max: 600,
            step: 5,
            getDefault: () => BOSS_CONFIG[1].chargeRecovery?.phase1 ?? 120,
            apply: (v) => {
                if (!BOSS_CONFIG[1].chargeRecovery) BOSS_CONFIG[1].chargeRecovery = {};
                BOSS_CONFIG[1].chargeRecovery.phase1 = v;
            }
        }),
        numberParam({
            key: 'boss1.exposedDurationP1',
            category: 'Boss1',
            label: 'Exposed duration (Phase 1 frames)',
            min: 0,
            max: 2000,
            step: 10,
            getDefault: () => BOSS_CONFIG[1].exposedConfig?.durationByPhase?.[1] ?? 600,
            apply: (v) => {
                if (!BOSS_CONFIG[1].exposedConfig) BOSS_CONFIG[1].exposedConfig = {};
                if (!BOSS_CONFIG[1].exposedConfig.durationByPhase) BOSS_CONFIG[1].exposedConfig.durationByPhase = {};
                BOSS_CONFIG[1].exposedConfig.durationByPhase[1] = v;
            }
        })
    );
}

// Wave tuning (config-time)
BALANCE_PARAMS.push(
    numberParam({
        key: 'waves.budget.lessonTotal',
        category: 'Waves',
        label: 'Lesson wave budget total',
        min: 0,
        max: 20000,
        step: 50,
        getDefault: () => THREAT_BUDGET.waveBudgets.lesson.total,
        apply: (v) => { THREAT_BUDGET.waveBudgets.lesson.total = v; }
    }),
    numberParam({
        key: 'waves.budget.integrationTotal',
        category: 'Waves',
        label: 'Integration wave budget total',
        min: 0,
        max: 40000,
        step: 50,
        getDefault: () => THREAT_BUDGET.waveBudgets.integration.total,
        apply: (v) => { THREAT_BUDGET.waveBudgets.integration.total = v; }
    }),
    numberParam({
        key: 'waves.budget.examTotal',
        category: 'Waves',
        label: 'Exam wave budget total',
        min: 0,
        max: 60000,
        step: 50,
        getDefault: () => THREAT_BUDGET.waveBudgets.exam.total,
        apply: (v) => { THREAT_BUDGET.waveBudgets.exam.total = v; }
    }),
    numberParam({
        key: 'waves.pacing.stressPauseThreshold',
        category: 'Waves',
        label: 'Stress pause threshold (enemies alive)',
        min: 0,
        max: 50,
        step: 1,
        getDefault: () => PACING_CONFIG.stressPauseThreshold,
        apply: (v) => { PACING_CONFIG.stressPauseThreshold = v; }
    }),
    numberParam({
        key: 'waves.pacing.stressPauseDuration',
        category: 'Waves',
        label: 'Stress pause duration (frames)',
        min: 0,
        max: 2000,
        step: 10,
        getDefault: () => PACING_CONFIG.stressPauseDuration,
        apply: (v) => { PACING_CONFIG.stressPauseDuration = v; }
    })
);

// Capture baseline defaults once (before any overrides are applied)
const BASE_DEFAULTS = Object.fromEntries(BALANCE_PARAMS.map(p => [p.key, p.getDefault()]));

function getParamByKey(key) {
    return BALANCE_PARAMS.find(p => p.key === key) || null;
}

function getValueForKey(key) {
    const param = getParamByKey(key);
    if (!param) return null;
    const override = overrideCache?.[key];
    if (typeof override === 'number') return override;
    return BASE_DEFAULTS[key];
}

function applyKey(key, value) {
    const param = getParamByKey(key);
    if (!param) return false;
    const clamped = clampNumber(value, param.min, param.max);
    if (clamped === null) return false;
    param.apply(clamped);
    return true;
}

export function getBalanceParams() {
    return BALANCE_PARAMS.slice();
}

export function getBalanceCategories() {
    const cats = new Set(BALANCE_PARAMS.map(p => p.category));
    return Array.from(cats);
}

export function getBalanceParamsByCategory(category) {
    return BALANCE_PARAMS.filter(p => p.category === category);
}

export function getBalanceOverrideMap() {
    return { ...(overrideCache || {}) };
}

export function getBalanceValue(key) {
    return getValueForKey(key);
}

export function setBalanceValue(key, value) {
    const param = getParamByKey(key);
    if (!param) return { ok: false, reason: 'unknown_key' };
    const clamped = clampNumber(value, param.min, param.max);
    if (clamped === null) return { ok: false, reason: 'invalid_value' };

    setOverride(key, clamped);
    applyKey(key, clamped);
    return { ok: true, value: clamped };
}

export function clearBalanceValue(key) {
    const param = getParamByKey(key);
    if (!param) return { ok: false, reason: 'unknown_key' };

    clearOverride(key);
    applyKey(key, BASE_DEFAULTS[key]);
    return { ok: true };
}

export function resetAllBalanceValues() {
    // Reset live values
    for (const param of BALANCE_PARAMS) {
        applyKey(param.key, BASE_DEFAULTS[param.key]);
    }
    resetAllOverridesStorage();
    return { ok: true };
}

export function applyAllBalanceOverrides() {
    // Always restore baseline first to avoid drift across restarts
    for (const param of BALANCE_PARAMS) {
        applyKey(param.key, BASE_DEFAULTS[param.key]);
    }

    overrideCache = readOverrides();
    for (const [key, value] of Object.entries(overrideCache)) {
        applyKey(key, value);
    }
}

export function exportBalanceOverrides() {
    const payload = {
        version: 1,
        createdAt: Date.now(), // WALL_CLOCK_OK: metadata timestamp
        overrides: getBalanceOverrideMap()
    };
    return JSON.stringify(payload, null, 2);
}

export function importBalanceOverrides(jsonText) {
    let parsed = null;
    try {
        parsed = JSON.parse(jsonText);
    } catch (e) {
        return { ok: false, reason: 'invalid_json' };
    }

    const overrides = parsed?.overrides;
    if (!overrides || typeof overrides !== 'object' || Array.isArray(overrides)) {
        return { ok: false, reason: 'missing_overrides' };
    }

    // Validate & coerce only known keys
    const next = {};
    for (const [key, value] of Object.entries(overrides)) {
        const param = getParamByKey(key);
        if (!param) continue;
        const num = (typeof value === 'number') ? value : Number(value);
        const clamped = clampNumber(num, param.min, param.max);
        if (clamped === null) continue;
        next[key] = clamped;
    }

    overrideCache = next;
    writeOverrides(overrideCache);
    applyAllBalanceOverrides();
    return { ok: true, count: Object.keys(next).length };
}

