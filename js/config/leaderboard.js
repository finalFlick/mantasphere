// Leaderboard Configuration
import { STORAGE_PREFIX } from './constants.js';

export const LEADERBOARD_CONFIG = {
    maxEntries: 10,
    storageKey: STORAGE_PREFIX + 'leaderboard',
    persistentBadgesKey: STORAGE_PREFIX + 'badges'
};

// Leaderboard entry structure
export function createLeaderboardEntry(name, score, arena, wave, level, badges, time, difficulty = 'normal') {
    return {
        name: name.substring(0, 3).toUpperCase(),  // 3 char max
        score: score,
        arena: arena,
        wave: wave,
        level: level,
        badges: badges || [],
        time: time,
        difficulty: difficulty,
        date: new Date().toISOString()
    };
}
