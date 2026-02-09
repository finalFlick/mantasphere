import { scene } from '../core/scene.js';
import { gameState } from '../core/gameState.js';
import { spawnParticle, getNextParticle } from './particles.js';

// Kraken's Pulse item VFX: "hellfire" orange-red theme (ring, embers, ash) for the proc AOE nuke.
// Geometry cache for hellfire ring
const ringGeometryCache = new Map();

function getCachedRingGeometry(innerRadius, outerRadius, segments = 64) {
    const key = `ring_${innerRadius.toFixed(2)}_${outerRadius.toFixed(2)}_${segments}`;
    if (!ringGeometryCache.has(key)) {
        ringGeometryCache.set(key, new THREE.RingGeometry(innerRadius, outerRadius, segments));
    }
    return ringGeometryCache.get(key);
}

// Create expanding hellfire ring at ground level
export function createHellfireRing(origin) {
    const innerRadius = 0.5;
    const outerRadius = 1.0;
    const ring = new THREE.Mesh(
        getCachedRingGeometry(innerRadius, outerRadius, 64),
        new THREE.MeshBasicMaterial({
            color: 0xff4400,  // Hellfire orange-red
            transparent: true,
            opacity: 0.8,
            side: THREE.DoubleSide,
            depthWrite: false,
        })
    );
    ring.rotation.x = -Math.PI / 2;  // Lay flat on ground
    ring.position.copy(origin);
    ring.position.y = 0.1;  // Slightly above ground
    ring.scale.setScalar(1);
    ring.maxScale = 50;  // Expand to 50 units radius
    ring.createdSimSeconds = gameState.time.simSeconds;  // Use simSeconds for pause/slow-mo safety
    scene.add(ring);
    return ring;
}

// Update hellfire ring animation (expanding + fading)
export function updateHellfireRing(ring) {
    if (!ring || !ring.parent) return false;
    
    // Use simSeconds instead of Date.now() for pause/slow-mo safety
    const elapsed = gameState.time.simSeconds - ring.createdSimSeconds;
    const duration = 0.33;  // ~20 frames at 60fps
    const progress = Math.min(1, elapsed / duration);
    
    // Expand from 1 to maxScale
    const scale = 1 + (ring.maxScale - 1) * progress;
    ring.scale.setScalar(scale);
    
    // Fade out
    ring.material.opacity = 0.8 * (1 - progress);
    
    // Return true if still active
    return progress < 1;
}

// Cleanup hellfire ring
export function cleanupHellfireRing(ring) {
    if (!ring) return;
    if (ring.parent) {
        scene.remove(ring);
    }
    // Don't dispose geometry (it's cached)
    if (ring.material) {
        ring.material.dispose();
    }
}

// Spawn ember cracks radiating from origin along floor
export function spawnEmberCracks(origin, count = 16) {
    for (let i = 0; i < count; i++) {
        const p = getNextParticle();
        const angle = (i / count) * Math.PI * 2;
        const distance = 0.5 + Math.random() * 2;
        
        p.position.copy(origin);
        p.position.x += Math.cos(angle) * distance;
        p.position.z += Math.sin(angle) * distance;
        p.position.y = 0.1;  // Floor level
        
        p.velocity.set(
            Math.cos(angle) * 0.2,
            0.05 + Math.random() * 0.05,  // Slight upward
            Math.sin(angle) * 0.2
        );
        p.life = 30;
        p.maxLife = 30;
        p.material.color.setHex(0xff4400);  // Ember orange
        p.material.opacity = 0.9;
        p.visible = true;
        p.vfxType = 'ember';
        p.scale.setScalar(0.6 + Math.random() * 0.4);
    }
}

// Spawn hellfire detonation burst (upward flames + outward ash/sparks)
export function spawnHellfireDetonation(origin, count = 40) {
    // Upward flame tongues
    for (let i = 0; i < count * 0.6; i++) {
        const p = getNextParticle();
        p.position.copy(origin);
        p.position.y += Math.random() * 0.5;
        
        const angle = Math.random() * Math.PI * 2;
        const speed = 0.3 + Math.random() * 0.3;
        p.velocity.set(
            Math.cos(angle) * speed * 0.3,
            0.4 + Math.random() * 0.4,  // Strong upward
            Math.sin(angle) * speed * 0.3
        );
        p.life = 25 + Math.random() * 15;
        p.maxLife = p.life;
        p.material.color.setHex(0xff4400 + Math.random() * 0x2200);  // Orange to red
        p.material.opacity = 1.0;
        p.visible = true;
        p.vfxType = 'burst';
        p.scale.setScalar(0.8 + Math.random() * 0.6);
    }
    
    // Outward ash/sparks
    for (let i = 0; i < count * 0.4; i++) {
        const p = getNextParticle();
        p.position.copy(origin);
        
        const angle = Math.random() * Math.PI * 2;
        const speed = 0.2 + Math.random() * 0.3;
        p.velocity.set(
            Math.cos(angle) * speed,
            0.1 + Math.random() * 0.2,
            Math.sin(angle) * speed
        );
        p.life = 35 + Math.random() * 20;
        p.maxLife = p.life;
        p.material.color.setHex(0x666666 + Math.random() * 0x333333);  // Gray to dark gray
        p.material.opacity = 0.8;
        p.visible = true;
        p.vfxType = 'ember';
        p.scale.setScalar(0.5 + Math.random() * 0.3);
    }
}

// Spawn gentle ash drift (aftermath)
export function spawnAshDrift(origin, count = 20) {
    for (let i = 0; i < count; i++) {
        const p = getNextParticle();
        p.position.copy(origin);
        p.position.x += (Math.random() - 0.5) * 10;
        p.position.z += (Math.random() - 0.5) * 10;
        p.position.y = 2 + Math.random() * 3;  // Start above ground
        
        p.velocity.set(
            (Math.random() - 0.5) * 0.05,
            -0.02 - Math.random() * 0.03,  // Slow downward
            (Math.random() - 0.5) * 0.05
        );
        p.life = 90 + Math.random() * 60;  // Long lifetime
        p.maxLife = p.life;
        p.material.color.setHex(0x444444 + Math.random() * 0x222222);  // Dark gray
        p.material.opacity = 0.6;
        p.visible = true;
        p.vfxType = 'ember';
        p.scale.setScalar(0.4 + Math.random() * 0.3);
    }
}

// Enhanced enemy death VFX for Kraken's Pulse
export function spawnEnemyKrakenDeath(position, isElite = false) {
    // Burning silhouette particles
    for (let i = 0; i < (isElite ? 15 : 8); i++) {
        const p = getNextParticle();
        p.position.copy(position);
        p.position.y += Math.random() * 0.5;
        
        const angle = Math.random() * Math.PI * 2;
        const speed = 0.2 + Math.random() * 0.3;
        p.velocity.set(
            Math.cos(angle) * speed,
            0.1 + Math.random() * 0.2,
            Math.sin(angle) * speed
        );
        p.life = 20 + Math.random() * 15;
        p.maxLife = p.life;
        p.material.color.setHex(0xff4400 + Math.random() * 0x1100);  // Orange-red
        p.material.opacity = 0.9;
        p.visible = true;
        p.vfxType = 'burst';
        p.scale.setScalar(0.6 + Math.random() * 0.4);
    }
    
    // Ember shards
    for (let i = 0; i < (isElite ? 12 : 6); i++) {
        const p = getNextParticle();
        p.position.copy(position);
        
        const angle = (i / (isElite ? 12 : 6)) * Math.PI * 2 + Math.random() * 0.5;
        const speed = 0.15 + Math.random() * 0.2;
        p.velocity.set(
            Math.cos(angle) * speed,
            0.05 + Math.random() * 0.1,
            Math.sin(angle) * speed
        );
        p.life = 30 + Math.random() * 20;
        p.maxLife = p.life;
        p.material.color.setHex(0xff6600);  // Bright ember
        p.material.opacity = 1.0;
        p.visible = true;
        p.vfxType = 'ember';
        p.scale.set(0.3 + Math.random() * 0.2, 0.8, 0.3 + Math.random() * 0.2);  // Shard shape
    }
    
    // Elite: delayed sub-bursts handled in state machine via frame counter
    // (No setTimeout - frame-counted for determinism)
}

// Clear geometry cache on game reset
export function clearKrakenVFXCache() {
    for (const geometry of ringGeometryCache.values()) {
        geometry.dispose();
    }
    ringGeometryCache.clear();
}
