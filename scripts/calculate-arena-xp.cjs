const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');

const DEFAULT_SAMPLES = 250;
const DEFAULT_SEED = 1337;
const DEFAULT_OUTPUT = path.join(__dirname, '..', 'js', 'config', 'arenaXP.js');

function parseArgs() {
    const args = process.argv.slice(2);
    const opts = {
        samples: DEFAULT_SAMPLES,
        seed: DEFAULT_SEED,
        output: DEFAULT_OUTPUT
    };

    for (let i = 0; i < args.length; i++) {
        const arg = args[i];
        if (arg === '--samples') {
            opts.samples = Math.max(1, Number(args[i + 1]) || DEFAULT_SAMPLES);
            i++;
        } else if (arg === '--seed') {
            opts.seed = Number(args[i + 1]) || DEFAULT_SEED;
            i++;
        } else if (arg === '--output') {
            opts.output = args[i + 1] || DEFAULT_OUTPUT;
            i++;
        }
    }

    return opts;
}

function createRng(seed) {
    let state = seed >>> 0;
    return () => {
        state = (state * 1664525 + 1013904223) >>> 0;
        return state / 0x100000000;
    };
}

function floorWithMultiplier(base, mult) {
    return Math.floor(base * mult);
}

function getEnemyThreatCost(THREAT_BUDGET, enemyType) {
    const costs = THREAT_BUDGET.costs[enemyType];
    if (!costs) return 20;
    return costs.durability + costs.damage;
}

function getAvailableEnemyTypesForArena(ENEMY_TYPES, arena, wave) {
    const types = [];
    for (const [name, data] of Object.entries(ENEMY_TYPES)) {
        if (data.spawnWeight <= 0) continue;
        if (data.arenaIntro && data.arenaIntro > arena) continue;
        if (data.maxArena && data.maxArena < arena) continue;
        if (wave !== null && data.minWave && wave < data.minWave) continue;
        types.push(name);
    }
    return types;
}

function initializeWaveEnemyPool({ ENEMY_TYPES, ARENA_CONFIG, COGNITIVE_LIMITS, WAVE_MODIFIERS }, arena, wave, waveModifier, rng) {
    const maxTypes = COGNITIVE_LIMITS.maxTypesPerWave[arena] || 4;
    const arenaConfig = ARENA_CONFIG.arenas[arena];
    const lessonEnemy = arenaConfig?.lessonEnemy || 'grunt';

    if (waveModifier && WAVE_MODIFIERS[waveModifier]?.forceTypes) {
        return [...WAVE_MODIFIERS[waveModifier].forceTypes];
    }

    const available = getAvailableEnemyTypesForArena(ENEMY_TYPES, arena, wave);
    const pool = [];
    if (available.includes(lessonEnemy)) {
        pool.push(lessonEnemy);
    }

    const others = available.filter((type) => type !== lessonEnemy);
    for (let i = others.length - 1; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1));
        [others[i], others[j]] = [others[j], others[i]];
    }

    while (pool.length < maxTypes && others.length > 0) {
        pool.push(others.pop());
    }

    return pool;
}

function selectWaveModifier({ ARENA_CONFIG, WAVE_MODIFIERS }, arena, wave, maxWaves, isLessonWave, rng) {
    if (isLessonWave) return null;

    const arenaConfig = ARENA_CONFIG.arenas[arena];
    if (arenaConfig?.breatherWaves?.includes(wave)) {
        return 'breather';
    }

    if (wave === maxWaves && arena >= 3) {
        return 'harbingers';
    }

    const modifierChance = 0.10 + arena * 0.05;
    if (rng() > modifierChance) return null;

    const options = ['elite', 'rush', 'swarm'];
    return options[Math.floor(rng() * options.length)];
}

function selectEnemyByBudget({
    ENEMY_TYPES,
    THREAT_BUDGET,
    ARENA_CONFIG,
    COGNITIVE_LIMITS
}, arena, wave, pool, budgetRemaining, cognitiveMax, cognitiveUsed, rng) {
    const availableTypes = [];
    let totalWeight = 0;

    for (const [typeName, typeData] of Object.entries(ENEMY_TYPES)) {
        if (typeData.spawnWeight === 0) continue;
        if (typeData.isBossMinion) continue;
        if (typeData.maxArena && arena > typeData.maxArena) continue;
        if (typeData.minWave && wave < typeData.minWave) continue;
        if (pool && pool.length > 0 && !pool.includes(typeName)) continue;

        const costs = THREAT_BUDGET.costs[typeName] || { durability: 20, damage: 10, cognitive: 2 };
        const totalCost = costs.durability + costs.damage;
        if (totalCost > budgetRemaining) continue;
        if (cognitiveUsed + costs.cognitive > cognitiveMax) continue;
        if (typeData.arenaIntro && typeData.arenaIntro > arena) continue;

        availableTypes.push({ name: typeName, data: typeData, cost: totalCost, cognitive: costs.cognitive });
        const arenaConfigRef = ARENA_CONFIG.arenas[arena];
        const featured = arenaConfigRef?.lessonEnemy;
        let weight = typeData.spawnWeight;
        if (typeName === featured) {
            weight *= COGNITIVE_LIMITS.featuredTypeBonus;
        }
        totalWeight += weight;
    }

    if (availableTypes.length === 0) return null;

    let roll = rng() * totalWeight;
    const arenaConfigRef = ARENA_CONFIG.arenas[arena];
    const featured = arenaConfigRef?.lessonEnemy;
    for (const type of availableTypes) {
        let weight = type.data.spawnWeight;
        if (type.name === featured) {
            weight *= COGNITIVE_LIMITS.featuredTypeBonus;
        }
        roll -= weight;
        if (roll <= 0) return type;
    }

    return availableTypes[0];
}

function getSchoolChance(SCHOOL_CONFIG, arena, wave) {
    const arenaConfig = SCHOOL_CONFIG.chanceByWave[`arena${arena}`] || SCHOOL_CONFIG.chanceByWave.default;
    const waveChance = arenaConfig[wave];
    if (waveChance !== undefined) return waveChance;
    return arenaConfig[3] || 0;
}

function canSchoolType(SCHOOL_CONFIG, typeName) {
    if (!SCHOOL_CONFIG.enabled) return false;
    return !SCHOOL_CONFIG.excludeTypes.includes(typeName);
}

function simulateWave({
    ENEMY_TYPES,
    THREAT_BUDGET,
    ARENA_CONFIG,
    COGNITIVE_LIMITS,
    WAVE_MODIFIERS,
    SCHOOL_CONFIG
}, arena, wave, maxWaves, rng) {
    const isLessonWave = wave === 1;
    const isExamWave = wave === maxWaves;
    let waveType = 'integration';
    if (isLessonWave) waveType = 'lesson';
    else if (isExamWave) waveType = 'exam';

    const arenaOverrides = THREAT_BUDGET.arenaBudgetOverrides?.[arena]?.[waveType];
    const baseBudget = {
        ...THREAT_BUDGET.waveBudgets[waveType],
        ...arenaOverrides
    };
    const arenaScale = THREAT_BUDGET.arenaScaling[arena] || 1.0;
    const waveModifier = selectWaveModifier({ ARENA_CONFIG, WAVE_MODIFIERS }, arena, wave, maxWaves, isLessonWave, rng);
    const modifierConfig = waveModifier ? WAVE_MODIFIERS[waveModifier] : null;
    const modifierMult = modifierConfig?.budgetMult || 1.0;

    const waveBudgetTotal = Math.floor(baseBudget.total * arenaScale * modifierMult);
    let budgetRemaining = waveBudgetTotal;
    let cognitiveUsed = 0;
    const cognitiveMax = modifierConfig?.cognitiveMax || baseBudget.maxCognitive;
    const wavePool = initializeWaveEnemyPool({ ENEMY_TYPES, ARENA_CONFIG, COGNITIVE_LIMITS, WAVE_MODIFIERS }, arena, wave, waveModifier, rng);

    const xpMult = modifierConfig?.xpMult || 1.0;
    const waveBonus = 1 + (wave - 1) * 0.15;
    const schoolChance = getSchoolChance(SCHOOL_CONFIG, arena, wave);

    let totalXp = 0;
    while (budgetRemaining > 0) {
        const enemyType = selectEnemyByBudget({
            ENEMY_TYPES,
            THREAT_BUDGET,
            ARENA_CONFIG,
            COGNITIVE_LIMITS
        }, arena, wave, wavePool, budgetRemaining, cognitiveMax, cognitiveUsed, rng);

        if (!enemyType) break;

        const cost = enemyType.cost;
        const cognitive = enemyType.cognitive || 1;
        const baseXp = floorWithMultiplier(enemyType.data.xpValue, xpMult);
        const xpPerEnemy = Math.floor(baseXp * waveBonus);

        let spawnCount = 1;
        if (canSchoolType(SCHOOL_CONFIG, enemyType.name) && rng() < schoolChance) {
            const { min, max } = SCHOOL_CONFIG.schoolSize;
            const schoolSize = min + Math.floor(rng() * (max - min + 1));
            const affordableCount = Math.min(schoolSize, Math.floor(budgetRemaining / cost));
            if (affordableCount >= 3) {
                spawnCount = affordableCount;
            }
        }

        const totalCost = cost * spawnCount;
        budgetRemaining -= totalCost;
        cognitiveUsed += cognitive * spawnCount;
        totalXp += xpPerEnemy * spawnCount;

        if (budgetRemaining <= 0) break;
    }

    return totalXp;
}

function simulateArena(configs, arena, rng) {
    const { ARENA_CONFIG } = configs;
    const maxWaves = ARENA_CONFIG.arenas[arena]?.waves || 10;
    let totalXp = 0;
    for (let wave = 1; wave <= maxWaves; wave++) {
        totalXp += simulateWave(configs, arena, wave, maxWaves, rng);
    }

    // Boss XP uses runtime formula (boss.xpValue = 15 + arena * 5)
    totalXp += 15 + arena * 5;
    return totalXp;
}

function calculateLevelProgression(totalXp) {
    let xp = totalXp;
    let level = 1;
    let xpToLevel = 10;
    let pendingLevelUps = 0;

    while (xp >= xpToLevel) {
        xp -= xpToLevel;
        pendingLevelUps++;
        xpToLevel = Math.floor(xpToLevel * 1.25);
    }

    level += pendingLevelUps;

    return {
        totalXp,
        finalLevel: level,
        pendingLevelUps,
        xpRemainder: xp,
        xpToLevel
    };
}

async function main() {
    const opts = parseArgs();
    const repoRoot = path.resolve(__dirname, '..');

    const constants = await import(pathToFileURL(path.join(repoRoot, 'js', 'config', 'constants.js')).href);
    const arenas = await import(pathToFileURL(path.join(repoRoot, 'js', 'config', 'arenas.js')).href);
    const enemies = await import(pathToFileURL(path.join(repoRoot, 'js', 'config', 'enemies.js')).href);

    const configs = {
        ENEMY_TYPES: enemies.ENEMY_TYPES,
        ARENA_CONFIG: arenas.ARENA_CONFIG,
        THREAT_BUDGET: constants.THREAT_BUDGET,
        WAVE_MODIFIERS: constants.WAVE_MODIFIERS,
        COGNITIVE_LIMITS: constants.COGNITIVE_LIMITS,
        SCHOOL_CONFIG: constants.SCHOOL_CONFIG
    };

    const arenaIds = Object.keys(configs.ARENA_CONFIG.arenas)
        .map((value) => Number(value))
        .filter((value) => Number.isFinite(value))
        .sort((a, b) => a - b);

    const results = {};
    for (const arena of arenaIds) {
        let totalXp = 0;
        for (let i = 0; i < opts.samples; i++) {
            const rng = createRng(opts.seed + arena * 1000 + i);
            totalXp += simulateArena(configs, arena, rng);
        }
        const averageXp = Math.round(totalXp / opts.samples);
        results[arena] = calculateLevelProgression(averageXp);
    }

    const output = `// Auto-generated by scripts/calculate-arena-xp.cjs\n` +
        `// samples=${opts.samples} seed=${opts.seed}\n` +
        `export const ARENA_XP_REWARDS = ${JSON.stringify(results, null, 4)};\n`;

    fs.writeFileSync(opts.output, output, 'utf8');
    console.log(`Wrote ${opts.output}`);
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});
