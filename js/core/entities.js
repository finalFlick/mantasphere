// Central entity arrays (shared across modules)
// All arrays are exported directly - modules push/splice to modify

import { cleanupVFX } from '../systems/visualFeedback.js';

export const enemies = [];
export const projectiles = [];
export const enemyProjectiles = [];
export const xpGems = [];
export const hearts = [];
export const particles = [];
export const obstacles = [];
export const hazardZones = [];
export const arenaWalls = [];
export const modulePickups = [];  // Hidden module pickups (Speed Module, etc.)
export const chests = [];         // Projectile-item chests (dropped on wave clear)

// Boss is wrapped in an object so it can be reassigned
const bossHolder = { current: null };

export function getCurrentBoss() {
    return bossHolder.current;
}

export function setCurrentBoss(boss) {
    bossHolder.current = boss;
}

// Arena portal (for transitioning to next arena after boss defeat)
const portalHolder = { current: null };

export function getArenaPortal() {
    return portalHolder.current;
}

export function setArenaPortal(portal) {
    portalHolder.current = portal;
}

// Boss entrance portal (spawns before boss, freezes during fight)
const entrancePortalHolder = { current: null };

export function getBossEntrancePortal() {
    return entrancePortalHolder.current;
}

export function setBossEntrancePortal(portal) {
    entrancePortalHolder.current = portal;
}

// Reusable vectors for performance (avoid .clone() in hot paths)
export const tempVec3 = new THREE.Vector3();
export const tempVec3_2 = new THREE.Vector3();
export const tempVec3_3 = new THREE.Vector3();
export const tempVec3_4 = new THREE.Vector3();
export const tempVec3_5 = new THREE.Vector3();

export function resetAllEntities(scene) {
    // Enemies - only dispose materials (geometries are cached/shared)
    enemies.forEach(e => {
        // Cleanup VFX objects attached to enemies
        if (e.shieldMesh) { cleanupVFX(e.shieldMesh); e.shieldMesh = null; }
        if (e.rushTelegraph) { cleanupVFX(e.rushTelegraph); e.rushTelegraph = null; }
        if (e.orbitGroup) {
            e.orbitGroup.traverse(child => {
                if (child.material) child.material.dispose();
            });
            scene.remove(e.orbitGroup);
            e.orbitGroup = null;
        }
        
        if (e.isGroup || e.type === 'Group') {
            e.traverse(child => {
                if (child.material) child.material.dispose();
            });
        } else {
            if (e.material) e.material.dispose();
            if (e.baseMaterial && e.baseMaterial !== e.material) e.baseMaterial.dispose();
        }
        scene.remove(e);
    });
    
    // Projectiles - return to pool (they're pooled objects now)
    projectiles.forEach(p => {
        if (p.active !== undefined) {
            p.active = false;
            p.visible = false;
        }
    });
    
    // Enemy projectiles - return to pool
    enemyProjectiles.forEach(p => {
        if (p.active !== undefined) {
            p.active = false;
            p.visible = false;
        }
    });
    
    // XP Gems - dispose (not pooled currently)
    xpGems.forEach(g => {
        if (g.geometry) g.geometry.dispose();
        if (g.material) g.material.dispose();
        scene.remove(g);
    });
    
    // Particles - already pooled, just hide them
    particles.forEach(p => {
        if (p.life !== undefined) {
            p.life = 0;
            p.visible = false;
        }
    });
    
    // Hearts - dispose (not pooled)
    hearts.forEach(h => {
        h.children.forEach(c => {
            if (c.geometry) c.geometry.dispose();
            if (c.material) c.material.dispose();
        });
        scene.remove(h);
    });
    
    // Boss - dispose all (bosses are unique)
    if (bossHolder.current) {
        // Cleanup VFX objects attached to boss
        const boss = bossHolder.current;
        const vfxProps = ['teleportOriginVFX', 'teleportDestVFX', 'emergeWarningVFX', 
                          'slamMarker', 'chargeMarker', 'growthIndicator', 'splitWarning',
                          'perchChargeVFX', 'burrowStartVFX', 'exposedVFX'];
        vfxProps.forEach(prop => {
            if (boss[prop]) {
                cleanupVFX(boss[prop]);
                boss[prop] = null;
            }
        });
        if (boss.hazardPreviews) {
            boss.hazardPreviews.forEach(hp => cleanupVFX(hp.preview));
            boss.hazardPreviews = null;
        }
        if (boss.wallPreviews) {
            boss.wallPreviews.forEach(preview => cleanupVFX(preview));
            boss.wallPreviews = null;
        }
        if (boss.temporaryWalls) {
            boss.temporaryWalls.forEach(wall => {
                wall.traverse(c => {
                    if (c.geometry) c.geometry.dispose();
                    if (c.material) c.material.dispose();
                });
                scene.remove(wall);
            });
            boss.temporaryWalls = null;
        }

        // Cleanup boss VFX arrays that spawn scene-level meshes (not parented to boss)
        if (boss.chargeTrails) {
            boss.chargeTrails.forEach(trail => cleanupVFX(trail));
            boss.chargeTrails = null;
        }
        if (boss.vineZones) {
            boss.vineZones.forEach(zone => cleanupVFX(zone));
            boss.vineZones = null;
        }
        if (boss.tetherSnapVFXList) {
            boss.tetherSnapVFXList.forEach(vfx => cleanupVFX(vfx));
            boss.tetherSnapVFXList = null;
        }
        if (boss.minionTethers) {
            boss.minionTethers.forEach(tether => cleanupVFX(tether));
            boss.minionTethers = null;
        }
        if (boss.detonationWarnings) {
            boss.detonationWarnings.forEach(w => cleanupVFX(w));
            boss.detonationWarnings = null;
        }
        if (boss.blinkBarrageMarkers) {
            boss.blinkBarrageMarkers.forEach(m => cleanupVFX(m));
            boss.blinkBarrageMarkers = null;
        }
        if (boss.teleportDecoys) {
            boss.teleportDecoys.forEach(d => cleanupVFX(d));
            boss.teleportDecoys = null;
        }
        if (boss.fakeEmergeMarkers) {
            boss.fakeEmergeMarkers.forEach(m => cleanupVFX(m));
            boss.fakeEmergeMarkers = null;
        }
        
        bossHolder.current.traverse(c => {
            if (c.geometry) c.geometry.dispose();
            if (c.material) c.material.dispose();
        });
        scene.remove(bossHolder.current);
        bossHolder.current = null;
    }
    
    // Obstacles - dispose geometries and materials
    obstacles.forEach(obs => {
        obs.traverse(c => {
            if (c.geometry) c.geometry.dispose();
            if (c.material) c.material.dispose();
        });
        scene.remove(obs);
    });
    
    // Hazard zones - dispose mesh components
    hazardZones.forEach(hz => {
        if (hz.mesh) {
            if (hz.mesh.geometry) hz.mesh.geometry.dispose();
            if (hz.mesh.material) hz.mesh.material.dispose();
            scene.remove(hz.mesh);
        }
    });
    
    // Arena walls - dispose geometries and materials
    arenaWalls.forEach(wall => {
        wall.traverse(c => {
            if (c.geometry) c.geometry.dispose();
            if (c.material) c.material.dispose();
        });
        scene.remove(wall);
    });
    
    // Module pickups - dispose geometries and materials
    modulePickups.forEach(pickup => {
        pickup.traverse(c => {
            if (c.geometry) c.geometry.dispose();
            if (c.material) c.material.dispose();
        });
        scene.remove(pickup);
    });
    
    // Chests - dispose geometries and materials
    chests.forEach(chest => {
        chest.traverse(c => {
            if (c.geometry) c.geometry.dispose();
            if (c.material) c.material.dispose();
        });
        scene.remove(chest);
    });
    
    enemies.length = 0;
    projectiles.length = 0;
    enemyProjectiles.length = 0;
    xpGems.length = 0;
    particles.length = 0;
    hearts.length = 0;
    obstacles.length = 0;
    hazardZones.length = 0;
    arenaWalls.length = 0;
    modulePickups.length = 0;
    chests.length = 0;
}
