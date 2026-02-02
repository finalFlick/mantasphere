// Shared localStorage utility functions with error handling

/**
 * Safely read from localStorage with error handling
 * @param {string} key - Storage key
 * @param {*} defaultValue - Value to return if read fails
 * @returns {*} Parsed value or defaultValue
 */
export function safeLocalStorageGet(key, defaultValue = null) {
    try {
        const item = localStorage.getItem(key);
        return item ? JSON.parse(item) : defaultValue;
    } catch (e) {
        console.warn(`Failed to read ${key}:`, e);
        return defaultValue;
    }
}

/**
 * Safely write to localStorage with error handling
 * @param {string} key - Storage key
 * @param {*} value - Value to store (will be JSON.stringified)
 * @returns {boolean} True if successful, false otherwise
 */
export function safeLocalStorageSet(key, value) {
    try {
        localStorage.setItem(key, JSON.stringify(value));
        return true;
    } catch (e) {
        console.warn(`Failed to write ${key}:`, e);
        return false;
    }
}

/**
 * Safely remove from localStorage with error handling
 * @param {string} key - Storage key
 * @returns {boolean} True if successful, false otherwise
 */
export function safeLocalStorageRemove(key) {
    try {
        localStorage.removeItem(key);
        return true;
    } catch (e) {
        console.warn(`Failed to remove ${key}:`, e);
        return false;
    }
}
