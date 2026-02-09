import { scene, camera } from '../core/scene.js';

// Pooled sprite system for floating damage numbers
const DAMAGE_NUMBER_POOL_SIZE = 30;
let damageNumberPool = [];
let poolIndex = 0;
let sharedCanvas = null;
let sharedTexture = null;

// Pre-render the "9999" text once
function initDamageNumberCanvas() {
    if (sharedCanvas) return;
    
    sharedCanvas = document.createElement('canvas');
    sharedCanvas.width = 128;
    sharedCanvas.height = 64;
    const ctx = sharedCanvas.getContext('2d');
    
    // White bold text with glow effect
    ctx.font = 'bold 48px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    // Text shadow for glow
    ctx.shadowColor = 'rgba(255, 68, 0, 0.8)';
    ctx.shadowBlur = 10;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
    
    ctx.fillStyle = '#ffffff';
    ctx.fillText('9999', 64, 32);
    
    // Create texture from canvas
    sharedTexture = new THREE.CanvasTexture(sharedCanvas);
    sharedTexture.needsUpdate = true;
}

// Initialize pool
export function initDamageNumberPool() {
    if (damageNumberPool.length > 0) return;
    
    initDamageNumberCanvas();
    
    for (let i = 0; i < DAMAGE_NUMBER_POOL_SIZE; i++) {
        const sprite = new THREE.Sprite(
            new THREE.SpriteMaterial({
                map: sharedTexture,
                transparent: true,
                opacity: 0,
                color: 0xff4400,  // Hellfire orange-red
                depthTest: false,
                depthWrite: false,
            })
        );
        sprite.scale.set(2, 1, 1);
        sprite.visible = false;
        sprite.active = false;
        sprite.life = 0;
        sprite.maxLife = 45;
        sprite.velocityY = 0.05;  // Float upward
        scene.add(sprite);
        damageNumberPool.push(sprite);
    }
}

// Spawn a damage number at world position (Kraken's Pulse: fixed "9999" sprite, color only)
export function spawnDamageNumber(position, color = 0xff4400) {
    if (damageNumberPool.length === 0) initDamageNumberPool();
    
    const sprite = damageNumberPool[poolIndex];
    poolIndex = (poolIndex + 1) % DAMAGE_NUMBER_POOL_SIZE;
    
    // Reset sprite state
    sprite.position.copy(position);
    sprite.position.y += 1.5;  // Offset above enemy
    sprite.material.color.setHex(color);
    sprite.material.opacity = 1.0;
    sprite.life = sprite.maxLife;
    sprite.velocityY = 0.05;
    sprite.visible = true;
    sprite.active = true;
    sprite.scale.set(2, 1, 1);
}

// Update all active damage numbers
export function updateDamageNumbers() {
    for (const sprite of damageNumberPool) {
        if (!sprite.active || sprite.life <= 0) {
            if (sprite.visible) {
                sprite.visible = false;
                sprite.active = false;
            }
            continue;
        }
        
        // Float upward
        sprite.position.y += sprite.velocityY;
        sprite.velocityY *= 0.98;  // Slight deceleration
        
        // Fade out
        sprite.life--;
        const progress = sprite.life / sprite.maxLife;
        sprite.material.opacity = progress;
        
        // Slight scale pulse
        const pulse = 1.0 + Math.sin((1 - progress) * Math.PI) * 0.2;
        sprite.scale.setScalar(2 * pulse);
        
        // Face camera
        sprite.lookAt(camera.position);
        
        if (sprite.life <= 0) {
            sprite.visible = false;
            sprite.active = false;
        }
    }
}

// Reset all damage numbers (called on game restart)
export function resetDamageNumbers() {
    for (const sprite of damageNumberPool) {
        sprite.visible = false;
        sprite.active = false;
        sprite.life = 0;
        sprite.material.opacity = 0;
    }
    poolIndex = 0;
}
