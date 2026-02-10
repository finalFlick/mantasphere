import { scene, camera } from '../core/scene.js';
import { gameState } from '../core/gameState.js';
import { keys, cameraAngleX, cameraAngleY } from '../core/input.js';
import { obstacles, hazardZones, enemies, getCurrentBoss, tempVec3, tempVec3_2, tempVec3_3, tempVec3_4, tempVec3_5 } from '../core/entities.js';
import { PLAYER_JUMP_VELOCITY, PLAYER_GRAVITY, BOUNCE_FACTORS, STOMP_BOUNCE_VELOCITY, STOMP_PUSH_SPEED, TRAIL_SPAWN_DISTANCE, WAVE_STATE } from '../config/constants.js';
import { TUNING } from '../config/tuning.js';
import { getArenaBounds, getSpeedBowlsForArena, getBowlSurfaceYAt, BOWL_PULL_STRENGTH } from '../config/arenas.js';
import { spawnParticle } from '../effects/particles.js';
import { spawnTrail, lastTrailPos, setLastTrailPos } from '../effects/trail.js';
import { takeDamage } from '../systems/damage.js';
import { cleanupVFX, createChargeTrailSegment, triggerSlowMo, triggerScreenFlash, updateChargeTrailSegment } from '../systems/visualFeedback.js';
import { getLastShot, getFireRate, applyDashStrikeDamageToEnemy, applyDashStrikeDamageToBoss, applyStompDamageToEnemy } from '../systems/projectiles.js';
import { collectAllXpGems } from '../systems/pickups.js';
import { PROJECTILE_ITEMS } from '../config/items.js';
import { PulseMusic } from '../systems/pulseMusic.js';
import { safeFlashMaterial } from '../systems/materialUtils.js';
import { spawnBubbleParticle } from '../effects/particles.js';

export let player = null;
export let isDashing = false;
let dashCooldownFrames = 0;  // Frame-based cooldown (60 frames = 1 second)
let dashActiveFrames = 0;     // Frame counter for dash duration
const dashDirection = new THREE.Vector3();

// Dash Strike state (active ability from Boss 1 module)
let isDashStriking = false;
let dashStrikeStartPos = new THREE.Vector3();
let dashStrikeTargetPos = new THREE.Vector3();
let dashStrikeProgress = 0;
let dashStrikeHitEnemies = new Set();
let dashStrikeHitBoss = false;
const DASH_STRIKE_GRACE_FRAMES = 15;
const dashStrikeLastTrailPos = new THREE.Vector3();
const dashStrikeBubbleEmitter = {
    position: new THREE.Vector3(),
    chargeDirection: new THREE.Vector3()
};

// Lean animation state
let currentLeanX = 0;  // forward/back lean (W/S)
let currentLeanZ = 0;  // left/right lean (A/D)

// Charge ring shader
const ChargeRingShader = {
    uniforms: {
        uProgress: { value: 0.0 },
        uColorStart: { value: new THREE.Color(0x44aaff) },  // Blue
        uColorEnd: { value: new THREE.Color(0xffdd44) },    // Yellow
        uPulse: { value: 0.0 },
        uDashCount: { value: 8.0 }
    },
    vertexShader: `
        varying vec2 vUv;
        void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
    `,
    fragmentShader: `
        uniform float uProgress;
        uniform vec3 uColorStart;
        uniform vec3 uColorEnd;
        uniform float uPulse;
        uniform float uDashCount;
        varying vec2 vUv;
        
        #define TAU 6.28318530718
        
        void main() {
            // Center coordinates
            vec2 centered = vUv - 0.5;
            float dist = length(centered);
            float angle = atan(centered.y, centered.x);
            
            // Normalize angle to 0-1 range, starting from top (rotating clockwise)
            float normalizedAngle = mod(angle / TAU + 0.75, 1.0);
            
            // Ring mask - proportionally adjusted for narrower ring
            float innerRadius = 0.32;
            float outerRadius = 0.46;
            float ringMask = smoothstep(innerRadius - 0.02, innerRadius, dist) * 
                             (1.0 - smoothstep(outerRadius, outerRadius + 0.02, dist));
            
            // Create dashed segments - gaps shrink as progress increases
            float segmentSize = 1.0 / uDashCount;
            float dashPhase = mod(normalizedAngle, segmentSize);
            float gapSize = segmentSize * 0.25 * (1.0 - uProgress);  // Gaps close when fully charged
            float dashMask = smoothstep(gapSize - 0.01, gapSize + 0.01, dashPhase);
            
            // Fill based on progress
            float fillMask = smoothstep(uProgress - 0.02, uProgress + 0.02, normalizedAngle);
            fillMask = 1.0 - fillMask;  // Invert so filled area is where angle < progress
            
            // Combine masks - ring is always visible at base opacity
            float baseAlpha = ringMask * 0.3;  // Dim unfilled ring always visible
            float filledAlpha = ringMask * dashMask * fillMask * 0.9;  // Bright filled portion
            float alpha = max(baseAlpha, filledAlpha);
            
            // Color lerp based on progress
            vec3 color = mix(uColorStart, uColorEnd, uProgress);
            
            // Add pulse glow when ready (boosts entire ring)
            alpha = min(1.0, alpha + uPulse * 0.5);
            
            gl_FragColor = vec4(color, alpha);
        }
    `
};

export function createPlayer() {
    player = new THREE.Group();
    
    // Body group for visual model - receives lean rotation in local space
    const bodyGroup = new THREE.Group();
    player.add(bodyGroup);
    player.bodyGroup = bodyGroup;
    
    // Darker, more saturated base + lower emissive for better contrast
    const bodyMat = new THREE.MeshStandardMaterial({
        color: 0x2266aa,
        emissive: 0x114477,
        emissiveIntensity: 0.22
    });
    
    // Manta ray body - wide flat ellipsoid
    const body = new THREE.Mesh(
        new THREE.SphereGeometry(0.6, 16, 12),
        bodyMat
    );
    body.scale.set(1.5, 0.4, 1.2);  // Wide, flat, slightly elongated
    body.castShadow = true;
    bodyGroup.add(body);
    
    // Wing left
    const wingGeo = new THREE.ConeGeometry(0.8, 1.5, 4);
    const wingLeft = new THREE.Mesh(wingGeo, bodyMat);
    wingLeft.rotation.z = Math.PI / 2;
    wingLeft.rotation.y = -0.3;
    wingLeft.position.set(-0.8, 0, 0.1);
    wingLeft.castShadow = true;
    bodyGroup.add(wingLeft);
    
    // Wing right (mirrored)
    const wingRight = new THREE.Mesh(wingGeo, bodyMat);
    wingRight.rotation.z = -Math.PI / 2;
    wingRight.rotation.y = 0.3;
    wingRight.position.set(0.8, 0, 0.1);
    wingRight.castShadow = true;
    bodyGroup.add(wingRight);
    
    // Tail
    const tail = new THREE.Mesh(
        new THREE.ConeGeometry(0.15, 0.8, 8),
        bodyMat
    );
    tail.rotation.x = Math.PI / 2;
    tail.position.set(0, 0, 0.9);
    tail.castShadow = true;
    bodyGroup.add(tail);
    
    // Glow effect
    const glow = new THREE.Mesh(
        new THREE.SphereGeometry(1.2, 16, 16),
        new THREE.MeshBasicMaterial({
            color: 0x44aaff,
            transparent: true,
            opacity: 0.1
        })
    );
    glow.scale.set(1.5, 0.5, 1.2);  // Match body proportions
    bodyGroup.add(glow);
    
    // Attack direction indicator (180° arc on ground)
    // Separate from player group to avoid lean rotation affecting it
    const attackIndicator = new THREE.Group();
    scene.add(attackIndicator);  // Add to scene, not player
    player.attackIndicator = attackIndicator;
    
    const arcGeometry = new THREE.CircleGeometry(10, 32, 0, Math.PI);  // radius 10, 180°
    const arcMaterial = new THREE.MeshBasicMaterial({
        color: 0x44ffff,
        transparent: true,
        opacity: 0.08,
        side: THREE.DoubleSide,
        depthWrite: false
    });
    const attackArc = new THREE.Mesh(arcGeometry, arcMaterial);
    attackArc.rotation.x = -Math.PI / 2;  // Lay flat on ground
    attackIndicator.add(attackArc);
    
    // Edge glow for clearer boundary
    const edgeGeometry = new THREE.RingGeometry(9.8, 10, 32, 1, 0, Math.PI);
    const edgeMaterial = new THREE.MeshBasicMaterial({
        color: 0x44ffff,
        transparent: true,
        opacity: 0.2,
        side: THREE.DoubleSide,
        depthWrite: false
    });
    const attackEdge = new THREE.Mesh(edgeGeometry, edgeMaterial);
    attackEdge.rotation.x = -Math.PI / 2;
    attackEdge.position.y = 0.01;  // Slightly above arc
    attackIndicator.add(attackEdge);
    
    // Charge ring (cooldown indicator) - above ground, under player
    const chargeRingGeo = new THREE.RingGeometry(1.0, 1.4, 64);  // 0.4 width (50% of 0.8)
    const chargeRingMat = new THREE.ShaderMaterial({
        uniforms: ChargeRingShader.uniforms,
        vertexShader: ChargeRingShader.vertexShader,
        fragmentShader: ChargeRingShader.fragmentShader,
        transparent: true,
        side: THREE.DoubleSide,
        depthWrite: false
    });
    const chargeRing = new THREE.Mesh(chargeRingGeo, chargeRingMat);
    chargeRing.rotation.x = -Math.PI / 2;  // Lay flat
    player.add(chargeRing);  // Child of player (follows automatically)
    chargeRing.position.y = -0.4;  // Below player center, 0.6 above ground
    player.chargeRing = chargeRing;
    player.chargeRingMat = chargeRingMat;
    player.chargePulseTimer = 0;
    player.wasFullyCharged = false;  // Track state change for pulse trigger
    player.lastKnownShot = 0;  // Track last shot timestamp we've seen
    player.chargeVisualProgress = 0;  // Visual progress (only resets on actual shot)
    
    // Enemy behind indicators - halo of arrows around player
    const enemyIndicatorGroup = new THREE.Group();
    scene.add(enemyIndicatorGroup);  // Scene child, not player (avoid lean rotation)
    player.enemyIndicatorGroup = enemyIndicatorGroup;
    player.enemyIndicators = [];
    
    // Create 3 arrow meshes (reusable pool)
    const arrowGeo = new THREE.ConeGeometry(0.15, 0.4, 3);  // Small triangle
    const arrowMat = new THREE.MeshBasicMaterial({
        color: 0xff4444,
        transparent: true,
        opacity: 0.8
    });
    
    for (let i = 0; i < 3; i++) {
        const arrow = new THREE.Mesh(arrowGeo, arrowMat.clone());
        arrow.visible = false;
        arrow.rotation.x = Math.PI / 2;  // Point outward from center
        enemyIndicatorGroup.add(arrow);
        player.enemyIndicators.push(arrow);
    }
    
    player.position.y = 1;
    scene.add(player);
    
    player.bodyMaterial = bodyMat;
    player.velocity = new THREE.Vector3();
    player.isGrounded = true;
    player.bounceCount = 0;
    player.wasInAir = false;
    player.squashTime = 0;
    player.landingStunTimer = 0;
    
    // Hit recovery state (invulnerability frames)
    player.isRecovering = false;
    player.recoveryTimer = 0;
    player.flashPhase = 0;
    player.isDashStrikeInvuln = false;
    player.dashStrikeGraceFrames = 0;
    player.insideBowlIndex = -1;

    return player;
}

export function updatePlayer(delta) {
    // Lock movement during cutscenes to prevent drift into danger
    // EXCEPTION: Chase mode after initial dramatic pause (36 frames = 0.6s)
    const inChaseIntro = gameState.arena1ChaseState?.enabled && 
                         gameState.waveState === WAVE_STATE.BOSS_INTRO;
    const allowMovementDuringCutscene = (inChaseIntro && gameState.waveTimer > 36);
    
    if (gameState.cutsceneActive && !allowMovementDuringCutscene) {
        // Heavy movement dampening - decay any existing velocity
        if (player.velocity) {
            player.velocity.multiplyScalar(0.1);
            player.position.add(player.velocity);
        }
        // Still update visual lean decay
        currentLeanX *= 0.9;
        currentLeanZ *= 0.9;
        if (player.bodyGroup) {
            player.bodyGroup.rotation.x = currentLeanX * 0.3;
            player.bodyGroup.rotation.z = currentLeanZ * 0.3;
        }
        return;  // Skip normal input processing
    }
    
    // Optional landing stun (debug tuning) - counts down even while paused/slow-mo
    if (player.landingStunTimer > 0) {
        player.landingStunTimer--;
    }
    const isLandingStunned = player.landingStunTimer > 0;
    
    const moveDir = new THREE.Vector3();
    const forward = tempVec3.set(0, 0, -1).applyAxisAngle(tempVec3_2.set(0, 1, 0), cameraAngleX);
    const right = tempVec3_3.set(1, 0, 0).applyAxisAngle(tempVec3_2.set(0, 1, 0), cameraAngleX);
    
    if (keys['KeyW']) moveDir.add(forward);
    if (keys['KeyS']) moveDir.sub(forward);
    if (keys['KeyA']) moveDir.sub(tempVec3_4.copy(right).multiplyScalar(0.5));  // Reduced strafe - use mouse to turn
    if (keys['KeyD']) moveDir.add(tempVec3_5.copy(right).multiplyScalar(0.5));  // Reduced strafe - use mouse to turn
    moveDir.normalize();
    if (isLandingStunned) moveDir.set(0, 0, 0);
    
    // Frame-based cooldown timers
    if (gameState.dashStrikeCooldownTimer > 0) {
        gameState.dashStrikeCooldownTimer--;
    }
    if (gameState.siphonCooldownTimer > 0) {
        gameState.siphonCooldownTimer--;
    }
    if (dashCooldownFrames > 0) {
        dashCooldownFrames--;
    }
    
    // Check for Dash Strike input (dash is unlocked via Boss 1 module; no default dash)
    if (!isLandingStunned && (keys['ShiftLeft'] || keys['ShiftRight']) && moveDir.length() > 0) {
        // If Dash Strike is enabled and off cooldown, use it
        if (gameState.dashStrikeEnabled && gameState.dashStrikeCooldownTimer <= 0) {
            startDashStrike(moveDir);
        }
    }
    
    // Siphon: pull all XP orbs (blueprint active ability, E key)
    if (gameState.heldItems && gameState.heldItems.includes('siphon') && keys['KeyE'] && gameState.siphonCooldownTimer <= 0) {
        collectAllXpGems();
        const siphonItem = PROJECTILE_ITEMS.siphon;
        gameState.siphonCooldownTimer = (siphonItem && siphonItem.cooldownSeconds) ? Math.floor(siphonItem.cooldownSeconds * 60) : 1200;
    }
    
    const oldX = player.position.x;
    const oldZ = player.position.z;
    const oldY = player.position.y;
    
    // Update Dash Strike trail VFX (even after dash ends, so they fade out cleanly)
    if (player.dashStrikeTrails && player.dashStrikeTrails.length > 0) {
        for (let i = player.dashStrikeTrails.length - 1; i >= 0; i--) {
            const trail = player.dashStrikeTrails[i];
            const shouldRemove = updateChargeTrailSegment(trail);
            if (shouldRemove) {
                cleanupVFX(trail);
                player.dashStrikeTrails.splice(i, 1);
            }
        }
    }
    
    // Handle Dash Strike movement
    if (isDashStriking) {
        dashStrikeProgress += 0.15;  // ~7 frames to complete
        
        if (dashStrikeProgress >= 1) {
            // Dash Strike complete - deal damage and end
            completeDashStrike();
        } else {
            // Interpolate position
            player.position.lerpVectors(dashStrikeStartPos, dashStrikeTargetPos, dashStrikeProgress);
            
            // Boss-1-style dash trail: ground segments + bubbles
            // Drop trail segments roughly every ~2 units
            if (player.dashStrikeTrails) {
                const distFromLastTrail = player.position.distanceTo(dashStrikeLastTrailPos);
                if (distFromLastTrail > 2.0 || dashStrikeLastTrailPos.length() === 0) {
                    const trail = createChargeTrailSegment(player.position.clone(), 0x00ffff, 1.0);
                    // Player trail is visual-only (no hazard damage)
                    trail.isDamageZone = false;
                    trail.damage = 0;
                    player.dashStrikeTrails.push(trail);
                    dashStrikeLastTrailPos.copy(player.position);
                }
            }
            
            // Bubble trail (reuse boss bubble look with a lightweight emitter object)
            if (Math.random() > 0.35) {
                dashStrikeBubbleEmitter.position.copy(player.position);
                dashStrikeBubbleEmitter.chargeDirection.copy(tempVec3_4.subVectors(dashStrikeTargetPos, dashStrikeStartPos).normalize());
                spawnBubbleParticle(dashStrikeBubbleEmitter);
            }
            
            // Damage enemies during transit (hit once per dash)
            const damage = gameState.dashStrikeConfig?.damage || 15;
            const hitRadius = 1.2;
            
            for (let i = enemies.length - 1; i >= 0; i--) {
                const enemy = enemies[i];
                if (!enemy || enemy.isDying) continue;
                if (dashStrikeHitEnemies.has(enemy)) continue;
                
                const enemyRadius = (enemy.baseSize || 1) * (enemy.scale?.x || 1) * 0.85;
                if (player.position.distanceTo(enemy.position) < enemyRadius + hitRadius) {
                    dashStrikeHitEnemies.add(enemy);
                    
                    applyDashStrikeDamageToEnemy(enemy, damage, player.position, i);
                    
                    // Knockback a bit so the hit reads
                    if (enemy.velocity) {
                        tempVec3_5.subVectors(enemy.position, player.position).setY(0);
                        if (tempVec3_5.lengthSq() > 0.0001) {
                            tempVec3_5.normalize();
                            enemy.velocity.add(tempVec3_5.multiplyScalar(0.18));
                        }
                    }
                }
            }
            
            // Also allow Dash Strike to hit the boss (once per dash)
            const boss = getCurrentBoss();
            if (boss && !boss.isDying && !dashStrikeHitBoss) {
                const bossRadius = (boss.size || 1) * (boss.scale?.x || 1);
                if (player.position.distanceTo(boss.position) < bossRadius + hitRadius) {
                    applyDashStrikeDamageToBoss(boss, damage, player.position);
                    dashStrikeHitBoss = true;
                }
            }
        }
    }
    
    // Dash Strike landing grace (invuln against enemies/projectiles only)
    if (!isDashStriking && player.isDashStrikeInvuln) {
        if (player.dashStrikeGraceFrames > 0) {
            player.dashStrikeGraceFrames--;
            if (player.dashStrikeGraceFrames <= 0) {
                player.isDashStrikeInvuln = false;
            }
        } else {
            player.isDashStrikeInvuln = false;
        }
    }
    // Handle regular dash (frame-based duration: 12 frames = ~200ms)
    else if (isDashing) {
        dashActiveFrames++;
        if (dashActiveFrames < 12) {
            player.position.add(dashDirection.clone().multiplyScalar(0.5));
        } else {
            isDashing = false;
        }
    } else if (moveDir.length() > 0) {
        player.position.add(moveDir.multiplyScalar(gameState.stats.moveSpeed));
    }
    
    // Platform collision
    const playerRadius = 0.5;
    for (const obs of obstacles) {
        if (!obs.collisionData) continue;
        const c = obs.collisionData;
        if (player.position.y < c.topY + 0.1) {
            // X-axis collision
            if (player.position.x + playerRadius > c.minX && 
                player.position.x - playerRadius < c.maxX && 
                oldZ + playerRadius > c.minZ && 
                oldZ - playerRadius < c.maxZ && 
                player.position.y < c.topY) {
                if (oldX <= c.minX) player.position.x = c.minX - playerRadius;
                else if (oldX >= c.maxX) player.position.x = c.maxX + playerRadius;
            }
            // Z-axis collision
            if (player.position.x + playerRadius > c.minX && 
                player.position.x - playerRadius < c.maxX && 
                player.position.z + playerRadius > c.minZ && 
                player.position.z - playerRadius < c.maxZ && 
                player.position.y < c.topY) {
                if (oldZ <= c.minZ) player.position.z = c.minZ - playerRadius;
                else if (oldZ >= c.maxZ) player.position.z = c.maxZ + playerRadius;
            }
        }
    }
    
    // Jumping with bounce feedback
    if (keys['Space'] && player.isGrounded) {
        player.velocity.y = PLAYER_JUMP_VELOCITY;
        player.isGrounded = false;
        player.wasInAir = true;
        player.bounceCount = 0;
        player.squashTime = 8;
    }
    
    const gravityMultRaw = Number(TUNING.gravityMultiplier || 1.0);
    const gravityMult = Math.max(0.25, Math.min(3.0, gravityMultRaw || 1.0));
    player.velocity.y -= PLAYER_GRAVITY * gravityMult;
    player.position.y += player.velocity.y;
    
    // Ground/Platform landing
    let groundY = 1;
    const bowlSurfaceY = getBowlSurfaceYAt(gameState.currentArena, player.position.x, player.position.z);
    if (bowlSurfaceY !== null) groundY = bowlSurfaceY + 1;
    for (const obs of obstacles) {
        if (!obs.collisionData) continue;
        const c = obs.collisionData;
        if (player.position.x + playerRadius > c.minX && 
            player.position.x - playerRadius < c.maxX && 
            player.position.z + playerRadius > c.minZ && 
            player.position.z - playerRadius < c.maxZ) {
            if (oldY >= c.topY + 0.9 && player.position.y < c.topY + 1.1) {
                groundY = Math.max(groundY, c.topY + 1);
            } else if (player.position.y >= c.topY + 0.8 && 
                       player.position.y < c.topY + 1.3 && 
                       player.velocity.y <= 0) {
                groundY = Math.max(groundY, c.topY + 1);
            }
        }
    }
    
    // Stomp check: landing on an enemy from above (before ground landing)
    let stompHandled = false;
    if (player.velocity.y <= 0 && (player.wasInAir || !player.isGrounded)) {
        const stompTolerance = 0.15;
        let bestEnemy = null;
        let bestTop = -Infinity;
        for (let i = 0; i < enemies.length; i++) {
            const enemy = enemies[i];
            if (!enemy || enemy.isDying) continue;
            const scaledSize = enemy.baseSize * enemy.scale.x;
            const xzDistSq = (player.position.x - enemy.position.x) ** 2 + (player.position.z - enemy.position.z) ** 2;
            const overlapRadius = scaledSize + playerRadius;
            if (xzDistSq > overlapRadius * overlapRadius) continue;
            const enemyTop = enemy.position.y + scaledSize;
            const playerBottom = player.position.y - playerRadius;
            if (playerBottom > enemyTop + stompTolerance) continue;
            if (enemyTop > bestTop) {
                bestTop = enemyTop;
                bestEnemy = { enemy, index: i };
            }
        }
        if (bestEnemy) {
            const { enemy, index } = bestEnemy;
            const result = applyStompDamageToEnemy(enemy, index);
            enemy.stompedThisFrame = true;
            stompHandled = true;
            if (result.killed) {
                player.position.y = groundY;
                player.velocity.y = 0;
                player.isGrounded = true;
                player.wasInAir = false;
                player.bounceCount = 0;
                spawnParticle(enemy.position.clone(), 0x44aaff, 6);
            } else {
                player.velocity.y = STOMP_BOUNCE_VELOCITY;
                tempVec3.set(
                    player.position.x - enemy.position.x,
                    0,
                    player.position.z - enemy.position.z
                ).normalize();
                player.velocity.x += tempVec3.x * STOMP_PUSH_SPEED;
                player.velocity.z += tempVec3.z * STOMP_PUSH_SPEED;
                const scaledSize = enemy.baseSize * enemy.scale.x;
                player.position.y = enemy.position.y + scaledSize + playerRadius + 0.05;
            }
        }
    }
    
    if (!stompHandled && player.position.y < groundY) {
        player.position.y = groundY;
        if (player.wasInAir) {
            if (player.bounceCount < BOUNCE_FACTORS.length) {
                player.velocity.y = PLAYER_JUMP_VELOCITY * BOUNCE_FACTORS[player.bounceCount];
                player.bounceCount++;
                player.squashTime = 6 - player.bounceCount * 2;
                if (player.bounceCount === 1) spawnParticle(player.position, 0x44aaff, 5);
            } else {
                player.velocity.y = 0;
                player.isGrounded = true;
                player.wasInAir = false;
                player.bounceCount = 0;
                
                const stunRaw = Number(TUNING.landingStunFrames ?? 0);
                const stun = Math.max(0, Math.min(30, Math.round(stunRaw || 0)));
                player.landingStunTimer = stun;
            }
        } else {
            player.velocity.y = 0;
            player.isGrounded = true;
        }
    } else if (!stompHandled) {
        player.isGrounded = false;
    }
    
    // Squash/stretch animation
    if (player.squashTime > 0) {
        player.squashTime--;
        player.scale.set(
            1 + player.squashTime * 0.02,
            1 - player.squashTime * 0.03,
            1 + player.squashTime * 0.02
        );
    } else {
        player.scale.set(1, 1, 1);
    }
    
    // Apply horizontal knockback velocity (from damage)
    if (player.velocity.x !== 0 || player.velocity.z !== 0) {
        player.position.x += player.velocity.x;
        player.position.z += player.velocity.z;
        // Decay knockback velocity
        player.velocity.x *= 0.85;
        player.velocity.z *= 0.85;
        // Stop when very small
        if (Math.abs(player.velocity.x) < 0.01) player.velocity.x = 0;
        if (Math.abs(player.velocity.z) < 0.01) player.velocity.z = 0;
    }

    // Speed bowl zones (outside 40x40): pull toward center when inside; exit boost when leaving
    const bowls = getSpeedBowlsForArena(gameState.currentArena);
    const prevInsideBowlIndex = player.insideBowlIndex ?? -1;
    let insideBowlIndex = -1;
    for (let i = 0; i < bowls.length; i++) {
        const b = bowls[i];
        const dx = b.cx - player.position.x;
        const dz = b.cz - player.position.z;
        const dist = Math.sqrt(dx * dx + dz * dz);
        if (dist < b.R) {
            insideBowlIndex = i;
            const pullStrength = BOWL_PULL_STRENGTH * (1 - dist / b.R);
            tempVec3.set(dx, 0, dz).normalize().multiplyScalar(pullStrength);
            player.position.add(tempVec3);
        }
    }
    player.insideBowlIndex = insideBowlIndex;
    if (prevInsideBowlIndex >= 0 && insideBowlIndex < 0) {
        const b = bowls[prevInsideBowlIndex];
        tempVec3.set(player.position.x - b.cx, 0, player.position.z - b.cz).normalize();
        const mag = b.exitBoostMagnitude ?? 0.12;
        player.velocity.x += tempVec3.x * mag;
        player.velocity.z += tempVec3.z * mag;
        // Directional exit burst (outward = "launch"); palette 0x44aaff to match movement trail
        const bowlExitColor = 0x44aaff;
        for (let i = 0; i < 8; i++) {
            const offset = tempVec3.clone().multiplyScalar(i * 0.4);
            spawnParticle(player.position.clone().add(offset), bowlExitColor, 1);
        }
        // TODO: bowl exit SFX via centralized event (PulseMusic / SFX module)
    }

    // Hit recovery (invulnerability frames) - flash animation
    if (player.isRecovering) {
        player.recoveryTimer--;
        player.flashPhase += 0.4;  // Speed of flash cycle
        
        // Cycle opacity between 0.3 and 1.0 using sine wave
        const flashOpacity = 0.65 + 0.35 * Math.sin(player.flashPhase);
        if (player.bodyMaterial) {
            if (!player.bodyMaterial.transparent) {
                player.bodyMaterial.transparent = true;
                player.bodyMaterial.needsUpdate = true;
            }
            player.bodyMaterial.opacity = flashOpacity;
        }
        
        // Recovery complete
        if (player.recoveryTimer <= 0) {
            player.isRecovering = false;
            player.recoveryTimer = 0;
            player.flashPhase = 0;
            if (player.bodyMaterial) {
                player.bodyMaterial.opacity = 1;
                player.bodyMaterial.transparent = false;
                player.bodyMaterial.needsUpdate = true;
            }
        }
    }
    
    // Arena bounds
    const arenaBound = getArenaBounds(gameState.currentArena);
    player.position.x = Math.max(-arenaBound, Math.min(arenaBound, player.position.x));
    player.position.z = Math.max(-arenaBound, Math.min(arenaBound, player.position.z));
    
    // Enhanced trail
    const isMoving = moveDir.length() > 0 || isDashing;
    const currentLastTrailPos = lastTrailPos;
    if (isMoving && player.isGrounded && 
        (!currentLastTrailPos || player.position.distanceTo(currentLastTrailPos) > TRAIL_SPAWN_DISTANCE)) {
        spawnTrail(player.position.clone());
        setLastTrailPos(player.position.clone());
    }
    
    // Hazard damage - frame-based for consistent behavior with slow-mo/lag
    for (const hz of hazardZones) {
        const dx = player.position.x - hz.position.x;
        const dz = player.position.z - hz.position.z;
        if (Math.sqrt(dx * dx + dz * dz) < hz.radius && player.position.y < 1.5) {
            // Increment frame counter while in hazard
            hz.tickTimer++;
            
            // Apply damage every N frames to prevent micro-ticks
            if (hz.tickTimer >= hz.damageTickInterval) {
                takeDamage(hz.damagePerTick, 'Hazard Zone', 'hazard');
                hz.tickTimer = 0;
            }
        } else {
            // Reset timer when player exits hazard
            hz.tickTimer = 0;
        }
    }
    
    // Rotate player group to face camera forward direction (Y axis only)
    player.rotation.y = cameraAngleX;
    
    // Calculate lean targets based on movement keys
    let targetLeanX = 0;  // forward/back
    let targetLeanZ = 0;  // left/right
    if (keys['KeyW']) targetLeanX = 0.15;   // lean forward
    if (keys['KeyS']) targetLeanX = -0.15;  // lean back
    if (keys['KeyA']) targetLeanZ = 0.15;   // lean left
    if (keys['KeyD']) targetLeanZ = -0.15;  // lean right
    
    // Smooth interpolation for leaning - apply to body group (local space)
    currentLeanX += (targetLeanX - currentLeanX) * 0.15;
    currentLeanZ += (targetLeanZ - currentLeanZ) * 0.15;
    player.bodyGroup.rotation.x = currentLeanX;
    player.bodyGroup.rotation.z = currentLeanZ;
    
    // Position attack indicator manually (it's not a child of player, so unaffected by lean)
    if (player.attackIndicator) {
        player.attackIndicator.visible = !!TUNING.attackConePreviewEnabled;

        // Position at player's feet, offset forward in the facing direction
        const offsetDist = 5;
        player.attackIndicator.position.set(
            player.position.x - Math.sin(cameraAngleX) * offsetDist,
            0.15,  // Above ground to avoid z-fighting
            player.position.z - Math.cos(cameraAngleX) * offsetDist
        );
        player.attackIndicator.rotation.y = cameraAngleX;
    }
    
    // Update charge ring
    if (player.chargeRingMat) {
        const now = Date.now(); // WALL_CLOCK_OK: UI charge ring visual only
        const lastShot = getLastShot();
        const fireRate = getFireRate();
        
        // Detect actual shot fired (lastShot changed)
        if (lastShot !== player.lastKnownShot) {
            player.lastKnownShot = lastShot;
            player.chargeVisualProgress = 0;  // Reset visual on shot
            player.wasFullyCharged = false;
        }
        
        // Calculate time-based progress since last shot
        const timeSinceShot = now - lastShot;
        const progress = Math.min(1, timeSinceShot / fireRate);
        
        // Visual progress only increases, never decreases (stays yellow until shot)
        player.chargeVisualProgress = Math.max(player.chargeVisualProgress, progress);
        
        player.chargeRingMat.uniforms.uProgress.value = player.chargeVisualProgress;
        
        // Trigger pulse when becoming fully charged
        if (player.chargeVisualProgress >= 1 && !player.wasFullyCharged) {
            player.chargePulseTimer = 1.0;
            player.wasFullyCharged = true;
        }
        
        // Decay pulse
        if (player.chargePulseTimer > 0) {
            player.chargePulseTimer -= 0.05;  // ~20 frame pulse
            player.chargeRingMat.uniforms.uPulse.value = player.chargePulseTimer;
        }
    }
    
    // Update enemy behind indicators
    if (player.enemyIndicatorGroup && player.enemyIndicators) {
        // Position halo at player location
        player.enemyIndicatorGroup.position.copy(player.position);
        player.enemyIndicatorGroup.position.y = 0.8;  // Slightly below player center
        
        // Player forward direction
        const forwardX = -Math.sin(cameraAngleX);
        const forwardZ = -Math.cos(cameraAngleX);
        
        // Find enemies behind player (dot product < 0)
        const behindEnemies = [];
        for (const enemy of enemies) {
            const dx = enemy.position.x - player.position.x;
            const dz = enemy.position.z - player.position.z;
            const dist = Math.sqrt(dx * dx + dz * dz);
            if (dist < 1) continue;  // Skip very close enemies
            
            const dot = (dx * forwardX + dz * forwardZ) / dist;
            if (dot < -0.2) {  // Behind player (with small buffer)
                behindEnemies.push({ enemy, dist, dx, dz });
            }
        }
        
        // Sort by distance, take nearest 3
        behindEnemies.sort((a, b) => a.dist - b.dist);
        const nearest = behindEnemies.slice(0, 3);
        
        // Position arrows
        const haloRadius = 2.0;  // Distance from player center
        for (let i = 0; i < 3; i++) {
            const arrow = player.enemyIndicators[i];
            if (i < nearest.length) {
                const { dx, dz, dist } = nearest[i];
                // Angle to enemy
                const angle = Math.atan2(dx, dz);
                // Position on halo circle
                arrow.position.x = Math.sin(angle) * haloRadius;
                arrow.position.z = Math.cos(angle) * haloRadius;
                arrow.position.y = 0;
                // Rotate to point outward toward enemy
                arrow.rotation.y = -angle;
                // Fade based on distance (closer = more opaque)
                arrow.material.opacity = Math.max(0.4, 0.9 - dist * 0.02);
                arrow.visible = true;
            } else {
                arrow.visible = false;
            }
        }
    }
    
    // Camera follow
    camera.position.x = player.position.x + Math.sin(cameraAngleX) * 8;
    camera.position.z = player.position.z + Math.cos(cameraAngleX) * 8;
    camera.position.y = player.position.y + 4 + Math.sin(cameraAngleY) * 3;
    camera.lookAt(player.position.x, player.position.y + 1, player.position.z);
}

export function resetPlayer() {
    if (player) {
        player.position.set(0, 1, 0);
        player.velocity.set(0, 0, 0);
        player.rotation.set(0, 0, 0);
        if (player.bodyGroup) {
            player.bodyGroup.rotation.set(0, 0, 0);
        }
        player.isGrounded = true;
        player.bounceCount = 0;
        player.wasInAir = false;
        player.scale.set(1, 1, 1);
        player.squashTime = 0;
        
        // Reset hit recovery state
        player.isRecovering = false;
        player.recoveryTimer = 0;
        player.flashPhase = 0;
    player.isDashStrikeInvuln = false;
    player.dashStrikeGraceFrames = 0;
        if (player.bodyMaterial) {
            player.bodyMaterial.opacity = 1;
            player.bodyMaterial.transparent = false;
            player.bodyMaterial.needsUpdate = true;
        }
        
        // Reset charge ring state
        player.chargePulseTimer = 0;
        player.wasFullyCharged = false;
        player.lastKnownShot = 0;
        player.chargeVisualProgress = 0;
        if (player.chargeRingMat) {
            player.chargeRingMat.uniforms.uProgress.value = 0;
            player.chargeRingMat.uniforms.uPulse.value = 0;
        }
        
        // Reset enemy indicators
        if (player.enemyIndicators) {
            for (const arrow of player.enemyIndicators) {
                arrow.visible = false;
            }
        }
    }
    isDashing = false;
    isDashStriking = false;
    dashStrikeProgress = 0;
    dashStrikeHitBoss = false;
    dashCooldownFrames = 0;
    dashActiveFrames = 0;
    currentLeanX = 0;
    currentLeanZ = 0;
}

export function getPlayer() {
    return player;
}

// ==================== DASH STRIKE ABILITY ====================
// Active ability from Boss 1 module - dash forward and deal AoE damage

/**
 * Start a Dash Strike in the given direction
 */
function startDashStrike(direction) {
    if (!gameState.dashStrikeConfig) return;
    
    isDashStriking = true;
    dashStrikeProgress = 0;
    dashStrikeHitEnemies.clear();
    dashStrikeHitBoss = false;
    dashStrikeLastTrailPos.set(0, 0, 0);
    player.isDashStrikeInvuln = true;
    player.dashStrikeGraceFrames = 0;
    
    // Ensure player has a trail list for cleanup
    player.dashStrikeTrails = player.dashStrikeTrails || [];

    // Tutorial tracking (Dash Strike still teaches "dash as an option")
    gameState.tutorial = gameState.tutorial || {};
    gameState.tutorial.hasDashed = true;
    
    // Store start position
    dashStrikeStartPos.copy(player.position);
    
    // Calculate target position based on dash distance
    const distance = gameState.dashStrikeConfig.distance || 8;
    dashStrikeTargetPos.copy(player.position);
    // Direction is already normalized from getWorldDirection
    dashStrikeTargetPos.add(tempVec3_4.copy(direction).multiplyScalar(distance));
    
    // Clamp to arena bounds
    const arenaBound = getArenaBounds(gameState.currentArena);
    dashStrikeTargetPos.x = Math.max(-arenaBound, Math.min(arenaBound, dashStrikeTargetPos.x));
    dashStrikeTargetPos.z = Math.max(-arenaBound, Math.min(arenaBound, dashStrikeTargetPos.z));
    
    // Set cooldown (frames)
    gameState.dashStrikeCooldownTimer = gameState.dashStrikeConfig.cooldown || 300;
    
    // Visual feedback
    triggerScreenFlash(0x00ffff, 0.2);
    triggerSlowMo(15, 0.5);  // Brief slow-mo at start
    
    // Spawn trail particles at start
    spawnParticle(player.position.clone(), 0x00ffff, 8);
    
    // SFX
    PulseMusic.onDashStrikeStart?.();
    const rightX = Math.cos(cameraAngleX);
    const rightZ = -Math.sin(cameraAngleX);
    const pan = Math.max(-1, Math.min(1, direction.x * rightX + direction.z * rightZ));
    PulseMusic.onDashStrikeTelegraph?.(pan, 1);
}

/**
 * Complete the Dash Strike - deal AoE damage at destination
 */
function completeDashStrike() {
    isDashStriking = false;
    player.dashStrikeGraceFrames = DASH_STRIKE_GRACE_FRAMES;
    if (player.dashStrikeGraceFrames <= 0) {
        player.isDashStrikeInvuln = false;
    }
    
    // Place player at target
    player.position.copy(dashStrikeTargetPos);
    
    // Deal AoE damage to nearby enemies
    const damage = gameState.dashStrikeConfig?.damage || 15;
    const damageRadius = 4;  // AoE radius
    
    let hitCount = 0;
    
    for (let i = enemies.length - 1; i >= 0; i--) {
        const enemy = enemies[i];
        if (!enemy || enemy.isDying) continue;
        if (dashStrikeHitEnemies.has(enemy)) continue; // avoid double-hitting enemies we clipped during transit
        
        if (enemy.position.distanceTo(player.position) < damageRadius) {
            dashStrikeHitEnemies.add(enemy);
            const result = applyDashStrikeDamageToEnemy(enemy, damage, player.position, i);
            if (result.hit) hitCount++;
        }
    }
    
    // Boss AoE at impact (avoid double-hit if clipped during transit)
    const boss = getCurrentBoss();
    if (boss && !boss.isDying && !dashStrikeHitBoss) {
        const bossRadius = (boss.size || 1) * (boss.scale?.x || 1);
        if (boss.position.distanceTo(player.position) < bossRadius + damageRadius) {
            const result = applyDashStrikeDamageToBoss(boss, damage, player.position);
            if (result.hit) hitCount++;
            dashStrikeHitBoss = true;
        }
    }
    
    // Impact VFX
    spawnParticle(player.position.clone(), 0x00ffff, 12);
    
    // SFX
    PulseMusic.onDashStrikeImpact?.(hitCount);
    
    // Extra feedback if we hit something
    if (hitCount > 0) {
        triggerScreenFlash(0x00ffff, 0.15);
    }
}

/**
 * Check if Dash Strike is available (off cooldown)
 */
export function isDashStrikeReady() {
    return gameState.dashStrikeEnabled && gameState.dashStrikeCooldownTimer <= 0;
}

/**
 * Get Dash Strike cooldown progress (0-1, 1 = ready)
 */
export function getDashStrikeCooldownProgress() {
    if (!gameState.dashStrikeEnabled || !gameState.dashStrikeConfig) return 1;
    const maxCooldown = gameState.dashStrikeConfig.cooldown || 300;
    return 1 - (gameState.dashStrikeCooldownTimer / maxCooldown);
}
