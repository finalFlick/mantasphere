/**
 * Projectile-modifying item definitions.
 * Items drop from chests that spawn on wave clear.
 *
 * Combination rule:
 *   Pierce + Chain → "Razor Swarm" (piercing chain projectiles)
 */

export const ITEM_CONFIG = {
    // Chance a chest spawns on wave clear (0..1). Does NOT apply to wave 1 (lesson wave).
    chestDropChance: 0.35,

    // Collection radius (units) – player walks over chest to open
    chestCollectionRadius: 2.0,

    // Time-to-live for chest (frames at 60fps). 0 = no expiry.
    chestTTL: 0,
};

export const PROJECTILE_ITEMS = {
    pierce: {
        id: 'pierce',
        name: 'Pierce',
        description: 'Projectiles pass through 1 extra target.',
        color: 0x44ddff,
        // Extra targets a projectile can pass through
        extraPierceTargets: 1,
    },
    chain: {
        id: 'chain',
        name: 'Chain',
        description: 'On hit, a bolt arcs to 1 nearby enemy.',
        color: 0xffaa22,
        // Max chain targets per hit
        chainTargets: 1,
        // Max chain range (units)
        chainRange: 12,
        // Chain damage multiplier (relative to original projectile)
        chainDamageMult: 0.5,
    },
    explosion: {
        id: 'explosion',
        name: 'Explosion',
        description: 'Hits explode for AoE damage.',
        color: 0xff4444,
        // Explosion radius (units)
        explosionRadius: 3,
        // Damage multiplier for AoE (relative to hit damage)
        explosionDamageMult: 0.4,
    },
};

/**
 * Combination rules. Key = sorted item ids joined by '+'.
 * Value = display metadata (the mechanical effects stack from both items).
 */
export const ITEM_COMBINATIONS = {
    'chain+pierce': {
        name: 'Razor Swarm',
        description: 'Piercing chain bolts shred groups.',
        color: 0x88ffaa,
    },
};

/**
 * Get active combination (if any) from a set of held item ids.
 * @param {string[]} heldIds - Array of item ids the player currently holds
 * @returns {Object|null} Combination metadata or null
 */
export function getActiveCombination(heldIds) {
    if (heldIds.length < 2) return null;
    const sorted = [...heldIds].sort();
    // Check all pairs
    for (let i = 0; i < sorted.length; i++) {
        for (let j = i + 1; j < sorted.length; j++) {
            const key = sorted[i] + '+' + sorted[j];
            if (ITEM_COMBINATIONS[key]) return ITEM_COMBINATIONS[key];
        }
    }
    return null;
}
