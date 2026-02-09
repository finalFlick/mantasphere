// Modules UI - Display upgrades and modules progression screen
import { gameState } from '../core/gameState.js';
import { CORE_UPGRADES } from '../config/upgrades.js';
import { MODULE_CONFIG, getCounterKeyForSource } from '../config/modules.js';
import { PROJECTILE_ITEMS, ITEM_COMBINATIONS, getActiveCombination } from '../config/items.js';
import { getModuleLevel, getModuleCounter, loadModuleProgress } from '../systems/moduleProgress.js';

// Show modules screen
export function showModulesScreen() {
    loadModuleProgress(); // Ensure latest data
    
    renderCurrentRun();  // NEW: Render current run stats first
    renderCoreUpgrades();
    renderUnlockableModules();
    
    document.getElementById('modules-screen').style.display = 'flex';
}

// Hide modules screen
export function hideModulesScreen() {
    document.getElementById('modules-screen').style.display = 'none';
}

// Render core upgrades section
function renderCoreUpgrades() {
    const container = document.getElementById('core-upgrades-grid');
    if (!container) return;
    
    container.innerHTML = '';
    
    CORE_UPGRADES.forEach(upgrade => {
        const card = createCoreUpgradeCard(upgrade);
        container.appendChild(card);
    });
}

// Render unlockable modules section
function renderUnlockableModules() {
    const container = document.getElementById('unlockable-modules-grid');
    if (!container) return;
    
    container.innerHTML = '';
    
    for (const [moduleId, config] of Object.entries(MODULE_CONFIG.unlockable)) {
        const card = createModuleCard(moduleId, config);
        container.appendChild(card);
    }
}

// Create card for core upgrade
function createCoreUpgradeCard(upgrade) {
    const card = document.createElement('div');
    card.className = 'module-card core-upgrade';
    
    card.innerHTML = `
        <div class="module-icon">${upgrade.icon}</div>
        <div class="module-name">${upgrade.name}</div>
        <div class="module-status">AVAILABLE</div>
        <div class="module-tooltip">
            <div>${upgrade.desc}</div>
            <div class="tooltip-progress">Always available in level-up choices</div>
        </div>
    `;
    
    return card;
}

// Create card for unlockable module
function createModuleCard(moduleId, config) {
    const card = document.createElement('div');
    const level = getModuleLevel(moduleId);
    const isLocked = level === 0;
    
    card.className = `module-card${isLocked ? ' locked' : ''}`;
    
    if (isLocked) {
        // Locked module - show ??? with unlock hint
        const unlockHint = getUnlockHint(config);
        
        card.innerHTML = `
            <div class="module-icon">🔒</div>
            <div class="module-name">???</div>
            <div class="module-status">LOCKED</div>
            <div class="module-tooltip">
                <div class="tooltip-unlock-req">Unlock: ${unlockHint}</div>
            </div>
        `;
    } else {
        // Unlocked module - show full details
        const maxLevel = 3;
        const counterKey = getCounterKeyForSource(config.unlockSource);
        const counter = getModuleCounter(moduleId, counterKey);
        const nextLevelReq = getNextLevelRequirement(config, level);
        
        card.innerHTML = `
            <div class="module-icon">${config.icon}</div>
            <div class="module-name">${config.name}</div>
            <div class="mastery-indicator">L${level} / L${maxLevel}</div>
            <div class="module-progress">${counter} ${counterKey === 'bossKills' ? 'Boss Kills' : 'Finds'}</div>
            <div class="module-tooltip">
                ${buildUnlockedTooltip(config, level, counter, nextLevelReq)}
            </div>
        `;
    }
    
    return card;
}

// Get unlock hint text
function getUnlockHint(config) {
    if (config.unlockSource === 'boss1') {
        return 'Defeat Boss 1';
    } else if (config.unlockSource === 'exploration') {
        return 'Find hidden pickup in Arena 1';
    }
    return 'Unknown';
}

// Get next level requirement
function getNextLevelRequirement(config, currentLevel) {
    if (currentLevel >= 3) return null;
    
    const nextLevel = currentLevel + 1;
    const levelKey = `L${nextLevel}`;
    return config.masteryThresholds[levelKey];
}

// Build tooltip for unlocked module
function buildUnlockedTooltip(config, level, counter, nextLevelReq) {
    const counterType = config.unlockSource === 'boss1' ? 'boss kills' : 'finds';
    let tooltip = `<div>Current: ${config.desc[level]}</div>`;
    
    if (nextLevelReq) {
        tooltip += `
            <div class="tooltip-next-level">
                Next level: ${nextLevelReq} ${counterType} (${counter}/${nextLevelReq})
            </div>
        `;
    } else {
        tooltip += `<div class="tooltip-next-level">MAX LEVEL</div>`;
    }
    
    return tooltip;
}

// ==================== CURRENT RUN SECTION ====================

// Render current run section (abilities, items, stats)
function renderCurrentRun() {
    renderActiveAbilities();
    renderActiveItems();
    renderCurrentStats();
}

// Render active abilities (Dash Strike, etc.)
function renderActiveAbilities() {
    const container = document.getElementById('active-abilities-grid');
    if (!container) return;
    
    container.innerHTML = '';
    
    // Check for Dash Strike
    if (gameState.dashStrikeEnabled && gameState.dashStrikeConfig) {
        const config = MODULE_CONFIG.unlockable.dashStrike;
        const level = gameState.dashStrikeLevel;
        const card = document.createElement('div');
        card.className = 'active-ability-card';
        
        const cooldownSeconds = (gameState.dashStrikeConfig.cooldown / 60).toFixed(1);
        
        card.innerHTML = `
            <div class="ability-icon">${config.icon}</div>
            <div class="ability-name">${config.name}</div>
            <div class="ability-level">Level ${level}</div>
            <div class="ability-stats">
                <div>Range: ${gameState.dashStrikeConfig.distance} units</div>
                <div>Cooldown: ${cooldownSeconds}s</div>
                <div>Damage: ${gameState.dashStrikeConfig.damage}</div>
            </div>
        `;
        
        container.appendChild(card);
    } else {
        // Show "No active abilities" message
        const empty = document.createElement('div');
        empty.style.cssText = 'grid-column: 1 / -1; text-align: center; color: #666; font-style: italic; padding: 20px;';
        empty.textContent = 'No active abilities';
        container.appendChild(empty);
    }
}

// Render active items and combinations
function renderActiveItems() {
    const container = document.getElementById('active-items-grid');
    if (!container) return;
    
    container.innerHTML = '';
    
    // Show active items
    for (const itemId of gameState.heldItems) {
        const item = PROJECTILE_ITEMS[itemId];
        if (!item) continue;
        
        const card = document.createElement('div');
        card.className = 'active-item-card';
        card.style.borderColor = `#${item.color.toString(16).padStart(6, '0')}`;
        card.style.color = `#${item.color.toString(16).padStart(6, '0')}`;
        
        card.innerHTML = `
            <div class="item-icon">${item.icon ?? '📦'}</div>
            <div class="item-name">${item.name}</div>
            <div class="item-desc">${item.description}</div>
        `;
        
        container.appendChild(card);
    }
    
    // Show active combination if any
    const combo = getActiveCombination(gameState.heldItems);
    if (combo) {
        const card = document.createElement('div');
        card.className = 'active-item-card combo';
        card.style.borderColor = `#${combo.color.toString(16).padStart(6, '0')}`;
        card.style.color = `#${combo.color.toString(16).padStart(6, '0')}`;
        
        card.innerHTML = `
            <div class="item-icon">${combo.icon ?? '📦'}</div>
            <div class="item-name">${combo.name}</div>
            <div class="item-desc">${combo.description}</div>
        `;
        
        container.appendChild(card);
    }
    
    // Show empty state if no items
    if (gameState.heldItems.length === 0 && !combo) {
        const empty = document.createElement('div');
        empty.style.cssText = 'grid-column: 1 / -1; text-align: center; color: #666; font-style: italic; padding: 20px;';
        empty.textContent = 'No active items';
        container.appendChild(empty);
    }
}

// Render current stats
function renderCurrentStats() {
    const container = document.getElementById('current-stats-grid');
    if (!container) return;
    
    container.innerHTML = '';
    
    const stats = gameState.stats;
    
    // Define stat display configuration
    const statConfigs = [
        { key: 'damage', label: 'Damage', format: (v) => Math.round(v) },
        { key: 'attackSpeed', label: 'Attack Speed', format: (v) => v.toFixed(2) },
        { key: 'projectileCount', label: 'Projectiles', format: (v) => Math.round(v) },
        { key: 'projectileSpeed', label: 'Projectile Speed', format: (v) => v.toFixed(2) },
        { key: 'moveSpeed', label: 'Move Speed', format: (v) => v.toFixed(3) },
        { key: 'maxHealth', label: 'Max Health', format: (v) => Math.round(v) },
        { key: 'pickupRange', label: 'Pickup Range', format: (v) => v.toFixed(1) },
        { key: 'xpMultiplier', label: 'XP Multiplier', format: (v) => v.toFixed(2) + 'x' }
    ];
    
    statConfigs.forEach(({ key, label, format }) => {
        const value = stats[key];
        if (value === undefined) return;
        
        const card = document.createElement('div');
        card.className = 'stat-card';
        
        card.innerHTML = `
            <div class="stat-label">${label}</div>
            <div class="stat-value">${format(value)}</div>
        `;
        
        container.appendChild(card);
    });
}
