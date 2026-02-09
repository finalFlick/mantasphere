import { STORAGE_PREFIX } from '../config/constants.js';
import { safeLocalStorageGet, safeLocalStorageSet } from '../utils/storage.js';

const STORAGE_KEY = STORAGE_PREFIX + 'audioSettings';

export const DEFAULT_AUDIO_SETTINGS = Object.freeze({
    // Percent (0-100). Defaults are aligned to PulseMusic.init() gain defaults.
    masterPercent: 60,
    musicPercent: 50,
    sfxPercent: 50
});

function clampPercent(value, fallback) {
    const n = Number(value);
    if (!Number.isFinite(n)) return fallback;
    return Math.max(0, Math.min(100, Math.round(n)));
}

function sanitizeAudioSettings(settings) {
    const s = (settings && typeof settings === 'object') ? settings : {};
    return {
        masterPercent: clampPercent(s.masterPercent, DEFAULT_AUDIO_SETTINGS.masterPercent),
        musicPercent: clampPercent(s.musicPercent, DEFAULT_AUDIO_SETTINGS.musicPercent),
        sfxPercent: clampPercent(s.sfxPercent, DEFAULT_AUDIO_SETTINGS.sfxPercent)
    };
}

export function loadAudioSettings() {
    const saved = safeLocalStorageGet(STORAGE_KEY, null);
    const merged = {
        ...DEFAULT_AUDIO_SETTINGS,
        ...(saved && typeof saved === 'object' ? saved : null)
    };
    return sanitizeAudioSettings(merged);
}

export function saveAudioSettings(settings) {
    const sanitized = sanitizeAudioSettings(settings);
    safeLocalStorageSet(STORAGE_KEY, sanitized);
    return sanitized;
}

