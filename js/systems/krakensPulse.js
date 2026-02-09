import { gameState } from '../core/gameState.js';
import { enemies, getCurrentBoss, tempVec3 } from '../core/entities.js';
import { player } from '../entities/player.js';
import { finalizeEnemyKill } from './projectiles.js';
import { checkBossRetreat, killBoss } from '../entities/boss.js';
import { triggerSlowMo, triggerScreenFlash } from './visualFeedback.js';
import { spawnParticle } from '../effects/particles.js';
import { spawnShieldHitVFX } from '../effects/particles.js';
import { safeFlashMaterial, setEmissiveIntensity } from './materialUtils.js';
import { PulseMusic } from './pulseMusic.js';
import { DEBUG_ENABLED } from '../config/constants.js';
import { log } from './debugLog.js';
import { spawnDamageNumber } from '../effects/damageNumbers.js';
import {
    createHellfireRing,
    updateHellfireRing,
    cleanupHellfireRing,
    spawnEmberCracks,
    spawnHellfireDetonation,
    spawnAshDrift,
    spawnEnemyKrakenDeath
} from '../effects/krakenVFX.js';
import { WAVE_STATE } from '../config/constants.js';

// State machine phases
const STATE_IDLE = 'IDLE';
const STATE_TELL = 'TELL';
const STATE_PULSE = 'PULSE';
const STATE_AFTERMATH = 'AFTERMATH';

// Phase durations (frames)
const TELL_DURATION = 30;  // 0.5s at 60fps
const PULSE_DURATION = 20;  // ~0.33s
const AFTERMATH_DURATION = 90;  // 1.5s

// Elite delayed burst tracking
const eliteDelayedBursts = new Map();  // enemy -> { frameCount, burstIndex }

// Check if Kraken's Pulse is active (held item or debug force-enabled)
function isKrakensPulseActive() {
    if (DEBUG_ENABLED && gameState.debug.krakensPulseForceEnabled) {
        return true;
    }
    return gameState.heldItems && gameState.heldItems.includes('krakensPulse');
}

// Apply damage to boss (mirrors applyDashStrikeDamageToBoss logic)
function applyKrakensPulseDamageToBoss(boss, rawDamage) {
    if (!boss || boss.isDying) return { hit: false, damageDealt: 0, retreated: false, killed: false };

    const pos = boss.position;
    let damageDealt = rawDamage;

    if (boss.shieldActive) {
        const shieldReduction = boss.shieldConfig?.damageReduction || 0.95;
        damageDealt *= (1 - shieldReduction);
        spawnShieldHitVFX(pos, boss.baseColor);
        PulseMusic.onShieldHit();
    } else if (boss.isExposed) {
        damageDealt *= 1.25;
        spawnParticle(pos, 0xffdd44, 3);
    } else {
        spawnParticle(pos, 0x00ffff, 4);
    }

    boss.health -= damageDealt;

    if (gameState.combatStats) {
        gameState.combatStats.damageDealt += damageDealt;
    }

    boss.scale.setScalar(0.75 + 0.25 * Math.max(0, boss.health / boss.maxHealth));

    if (boss.bodyMaterial) {
        safeFlashMaterial(boss.bodyMaterial, boss, 0x00ffff, boss.baseColor, 0.3, 90);
    }

    const retreated = checkBossRetreat(boss);
    if (retreated) return { hit: true, damageDealt, retreated: true, killed: false };

    let killed = false;
    if (boss.health <= 0 && !boss.isDying) {
        killBoss();
        killed = true;
    }

    return { hit: true, damageDealt, retreated: false, killed };
}

// Update vignette overlay opacity
function updateVignette(opacity) {
    const vignette = document.getElementById('kraken-vignette');
    if (vignette) {
        vignette.style.opacity = opacity;
    }
}

// Update player glow (crimson-violet rim during TELL/AFTERMATH)
function updatePlayerGlow(intensity) {
    if (!player || !player.bodyGroup) return;
    
    const body = player.bodyGroup.children.find(child => child.material);
    if (!body || !body.material) return;
    
    if (intensity > 0 && !gameState.krakensPulse.playerOriginalEmissive) {
        // Store original emissive (base value for multiplier)
        gameState.krakensPulse.playerOriginalEmissive = {
            color: body.material.emissive.getHex(),
            intensity: body.material.userData.baseEmissiveIntensity ?? body.material.emissiveIntensity ?? 0
        };
    }
    
    if (body.material.emissive) {
        if (intensity > 0) {
            body.material.emissive.setHex(0xaa44ff);  // Crimson-violet
            setEmissiveIntensity(body.material, intensity * 0.8);
        } else if (gameState.krakensPulse.playerOriginalEmissive) {
            // Restore original (base)
            body.material.emissive.setHex(gameState.krakensPulse.playerOriginalEmissive.color);
            setEmissiveIntensity(body.material, gameState.krakensPulse.playerOriginalEmissive.intensity);
            gameState.krakensPulse.playerOriginalEmissive = null;
        }
    }
}

// Main update function - called every frame from waveSystem
export function updateKrakensPulse() {
    const kp = gameState.krakensPulse;
    if (!kp) return;
    
    // Only active during WAVE_ACTIVE or BOSS_ACTIVE
    if (gameState.waveState !== WAVE_STATE.WAVE_ACTIVE && 
        gameState.waveState !== WAVE_STATE.BOSS_ACTIVE) {
        return;
    }
    
    // Check if item is active
    if (!isKrakensPulseActive()) {
        if (kp.state !== STATE_IDLE) {
            // Reset to IDLE if item was removed
            kp.state = STATE_IDLE;
            kp.stateTimer = 0;
            cleanupHellfireRing(kp.hellfireRing);
            kp.hellfireRing = null;
            updateVignette(0);
            updatePlayerGlow(0);
        }
        return;
    }
    
    // Get proc chance and interval (debug override if enabled)
    const chance = DEBUG_ENABLED ? gameState.debug.krakensPulseChance : 0.01;
    const interval = DEBUG_ENABLED ? gameState.debug.krakensPulseInterval : 10;
    
    // State machine
    switch (kp.state) {
        case STATE_IDLE:
            // Initialize nextRollSimSeconds on first check
            if (kp.nextRollSimSeconds === 0) {
                kp.nextRollSimSeconds = gameState.time.simSeconds + interval;
            }
            // Roll for proc every intervalSeconds
            if (gameState.time.simSeconds >= kp.nextRollSimSeconds) {
                kp.nextRollSimSeconds = gameState.time.simSeconds + interval;
                
                if (Math.random() < chance) {
                    // Proc triggered!
                    kp.state = STATE_TELL;
                    kp.stateTimer = 0;
                    log('DEBUG', 'krakens_pulse_tell', { chance, interval });
                }
            }
            break;
            
        case STATE_TELL:
            kp.stateTimer++;
            
            // First frame: start VFX/SFX
            if (kp.stateTimer === 1) {
                // Player darken + glow
                updatePlayerGlow(1.0);
                
                // Ember cracks on floor
                spawnEmberCracks(player.position, 16);
                
                // Sub-bass swell
                PulseMusic.onKrakensTell();
                
                // Slight vignette
                updateVignette(0.2);
            }
            
            // Update glow intensity (ramp up)
            const tellProgress = kp.stateTimer / TELL_DURATION;
            updatePlayerGlow(0.5 + tellProgress * 0.5);
            updateVignette(0.2 + tellProgress * 0.1);
            
            if (kp.stateTimer >= TELL_DURATION) {
                kp.state = STATE_PULSE;
                kp.stateTimer = 0;
            }
            break;
            
        case STATE_PULSE:
            kp.stateTimer++;
            
            // First frame: trigger pulse
            if (kp.stateTimer === 1) {
                // Create hellfire ring
                kp.hellfireRing = createHellfireRing(player.position);
                
                // Detonation burst
                spawnHellfireDetonation(player.position, 40);
                
                // Hit-stop freeze
                triggerSlowMo(3, 0.05);
                
                // Red-hot vignette
                updateVignette(0.8);
                triggerScreenFlash(0xff4400, 6);
                
                // SFX: detonation + rolling thunder
                PulseMusic.onKrakensPulse();
                
                // Damage all enemies
                for (let i = enemies.length - 1; i >= 0; i--) {
                    const enemy = enemies[i];
                    if (!enemy || enemy.health <= 0) continue;
                    
                    const wasElite = enemy.isElite;
                    enemy.health -= 9999;
                    
                    // Spawn floating 9999
                    spawnDamageNumber(enemy.position, 0xff4400);
                    
                    if (enemy.health <= 0) {
                        // Enhanced death VFX
                        spawnEnemyKrakenDeath(enemy.position, wasElite);
                        
                        // Elite delayed bursts (frame-counted)
                        if (wasElite) {
                            eliteDelayedBursts.set(enemy, { frameCount: 0, burstIndex: 0 });
                        }
                        
                        finalizeEnemyKill(enemy, i);
                    }
                }
                
                // Damage boss
                const boss = getCurrentBoss();
                if (boss && !boss.isDying) {
                    const result = applyKrakensPulseDamageToBoss(boss, 9999);
                    if (result.hit) {
                        spawnDamageNumber(boss.position, 0xff4400);
                    }
                }
                
                log('DEBUG', 'krakens_pulse_detonation', { 
                    enemiesKilled: enemies.length,
                    bossHit: !!boss
                });
            }
            
            // Update hellfire ring
            if (kp.hellfireRing) {
                const stillActive = updateHellfireRing(kp.hellfireRing);
                if (!stillActive) {
                    cleanupHellfireRing(kp.hellfireRing);
                    kp.hellfireRing = null;
                }
            }
            
            // Update elite delayed bursts
            for (const [enemy, data] of eliteDelayedBursts.entries()) {
                data.frameCount++;
                if (data.frameCount >= 5 && data.burstIndex < 3) {
                    // Spawn delayed burst
                    tempVec3.set(
                        (Math.random() - 0.5) * 0.5,
                        Math.random() * 0.3,
                        (Math.random() - 0.5) * 0.5
                    );
                    const burstPos = enemy.position.clone().add(tempVec3);
                    
                    for (let i = 0; i < 5; i++) {
                        spawnParticle(burstPos, 0xff4400, 1);
                    }
                    
                    data.burstIndex++;
                    data.frameCount = 0;
                }
                
                if (data.burstIndex >= 3) {
                    eliteDelayedBursts.delete(enemy);
                }
            }
            
            if (kp.stateTimer >= PULSE_DURATION) {
                kp.state = STATE_AFTERMATH;
                kp.stateTimer = 0;
            }
            break;
            
        case STATE_AFTERMATH:
            kp.stateTimer++;
            
            // First frame: start aftermath
            if (kp.stateTimer === 1) {
                spawnAshDrift(player.position, 20);
                PulseMusic.onKrakensAftermath();
            }
            
            // Continue updating hellfire ring if it hasn't finished (slow-mo can delay its time-based animation)
            if (kp.hellfireRing) {
                const stillActive = updateHellfireRing(kp.hellfireRing);
                if (!stillActive) {
                    cleanupHellfireRing(kp.hellfireRing);
                    kp.hellfireRing = null;
                }
            }
            
            // Fade player glow
            const aftermathProgress = kp.stateTimer / AFTERMATH_DURATION;
            updatePlayerGlow(1.0 - aftermathProgress);
            updateVignette(0.8 * (1 - aftermathProgress));
            
            if (kp.stateTimer >= AFTERMATH_DURATION) {
                // Force-cleanup ring if it somehow still exists (safety net)
                if (kp.hellfireRing) {
                    cleanupHellfireRing(kp.hellfireRing);
                    kp.hellfireRing = null;
                }
                kp.state = STATE_IDLE;
                kp.stateTimer = 0;
                updateVignette(0);
                updatePlayerGlow(0);
                eliteDelayedBursts.clear();
            }
            break;
    }
}

// Reset on game restart
export function resetKrakensPulse() {
    const kp = gameState.krakensPulse;
    if (!kp) return;
    
    kp.nextRollSimSeconds = 0;
    kp.state = STATE_IDLE;
    kp.stateTimer = 0;
    
    if (kp.hellfireRing) {
        cleanupHellfireRing(kp.hellfireRing);
        kp.hellfireRing = null;
    }
    
    updateVignette(0);
    updatePlayerGlow(0);
    eliteDelayedBursts.clear();
}
