// Material utility functions - reduces code duplication for common material operations

import { TUNING } from '../config/tuning.js';

// Frame-based flash queue (replaces setTimeout for pause-safe timing)
const flashQueue = [];

/**
 * Scale factor for emissive (from TUNING). Use when setting emissiveIntensity at runtime.
 * @returns {number}
 */
export function getEmissiveMultiplier() {
    return Number(TUNING.emissiveMultiplier ?? 0.35);
}

/**
 * Set material emissive intensity so it respects global emissive multiplier.
 * Updates userData.baseEmissiveIntensity so applyEmissiveMultiplier(scene) keeps it in sync.
 * @param {THREE.Material} mat
 * @param {number} baseValue - intended intensity before global scale
 */
export function setEmissiveIntensity(mat, baseValue) {
    if (!mat || typeof mat.emissiveIntensity !== 'number') return;
    mat.userData.baseEmissiveIntensity = baseValue;
    mat.emissiveIntensity = baseValue * getEmissiveMultiplier();
}

/**
 * Apply global emissive multiplier to all materials under root (e.g. scene).
 * Stores baseEmissiveIntensity in material.userData on first visit so slider changes don't compound.
 * Call after arena generation and when emissive slider changes.
 * @param {THREE.Object3D} rootObject3D
 */
export function applyEmissiveMultiplier(rootObject3D) {
    if (!rootObject3D) return;
    const mult = Number(TUNING.emissiveMultiplier ?? 0.35);
    rootObject3D.traverse((obj) => {
        if (!obj.isMesh) return;
        const materials = Array.isArray(obj.material) ? obj.material : (obj.material ? [obj.material] : []);
        for (const mat of materials) {
            if (!mat || mat.disposed) continue;
            if (typeof mat.emissiveIntensity !== 'number') continue;
            if (mat.userData.baseEmissiveIntensity === undefined) {
                mat.userData.baseEmissiveIntensity = mat.emissiveIntensity;
            }
            mat.emissiveIntensity = mat.userData.baseEmissiveIntensity * mult;
        }
    });
}

/**
 * Safely flash a material's emissive property with automatic reset.
 * Uses frame-based timing for pause/slow-mo safety.
 * 
 * @param {THREE.Material} material - The material to flash
 * @param {Object} owner - The mesh/object that owns the material (for disposal check)
 * @param {number} flashColor - Hex color for the flash (e.g., 0xffffff)
 * @param {number} resetColor - Hex color to reset to after flash
 * @param {number} resetIntensity - Emissive intensity to reset to (default: 0.3)
 * @param {number} durationMs - Flash duration in milliseconds (default: 50) - converted to frames
 */
export function safeFlashMaterial(material, owner, flashColor, resetColor, resetIntensity = 0.3, durationMs = 50) {
    if (!material || !material.emissive) return;
    
    // Apply flash immediately (scale by global emissive multiplier)
    material.emissive.setHex(flashColor);
    material.emissiveIntensity = 1 * getEmissiveMultiplier();
    
    // Convert ms to frames (60fps = 16.67ms/frame)
    const durationFrames = Math.max(1, Math.floor(durationMs / 16.67));
    
    // Add to queue for frame-based reset
    flashQueue.push({
        material,
        owner,
        resetColor,
        resetIntensity,
        framesRemaining: durationFrames
    });
}

/**
 * Update flash queue - call once per frame from game loop.
 * Processes frame-based flash resets safely.
 */
export function updateMaterialFlashes() {
    for (let i = flashQueue.length - 1; i >= 0; i--) {
        const flash = flashQueue[i];
        flash.framesRemaining--;
        
        if (flash.framesRemaining <= 0) {
            // Guard: owner may have been killed/removed/disposed during flash
            if (flash.owner && 
                flash.owner.parent && 
                flash.material && 
                flash.material.emissive &&
                !flash.material.disposed) {
                try {
                    flash.material.emissive.setHex(flash.resetColor);
                    flash.material.userData.baseEmissiveIntensity = flash.resetIntensity;
                    flash.material.emissiveIntensity = flash.resetIntensity * getEmissiveMultiplier();
                } catch (e) {
                    // Material disposed during callback - safely ignore
                }
            }
            // Remove from queue
            flashQueue.splice(i, 1);
        }
    }
}

/**
 * Clear flash queue - call on game reset to prevent stale flashes.
 */
export function clearMaterialFlashes() {
    flashQueue.length = 0;
}
