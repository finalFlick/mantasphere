// Debug Menu Module
// Handles tabbed interface, quick bar, command palette, state inspector, presets, and integration

import { gameState } from '../core/gameState.js';
import { enemies, projectiles, enemyProjectiles, xpGems, particles, getCurrentBoss } from '../core/entities.js';
import { TUNING } from '../config/tuning.js';
import { DEBUG_CONFIG, DEBUG_ENABLED } from '../config/constants.js';
import { initBalanceTunerUI } from './balanceTunerUI.js';
import { getBalanceOverrideMap, exportBalanceOverrides, importBalanceOverrides } from '../config/balanceRegistry.js';
import { log } from '../systems/debugLog.js';

// State
let currentTab = 'quick';
let lastUsedEnemy = 'grunt';
let lastUsedBoss = 1;
let logBuffer = [];
let stateUpdateThrottle = 0;
let perfData = { fps: 0, frameTime: 0, lastFrameTime: performance.now() };
let frameCount = 0;
let lastFpsUpdate = 0;

// Command registry - uses CustomEvent bus instead of window.* globals
const commands = [
    { id: 'spawn', label: 'Spawn Enemy', pattern: /^\/spawn\s+(\w+)/, execute: (match) => {
        const type = match[1];
        document.dispatchEvent(new CustomEvent('debug:command', {
            detail: { type: 'spawnEnemy', payload: { enemyType: type } }
        }));
        lastUsedEnemy = type;
        return `Spawned ${type}`;
    }},
    { id: 'boss', label: 'Spawn Boss', pattern: /^\/boss\s+(\d+)/, execute: (match) => {
        const num = parseInt(match[1]);
        document.dispatchEvent(new CustomEvent('debug:command', {
            detail: { type: 'spawnBoss', payload: { bossNum: num } }
        }));
        lastUsedBoss = num;
        return `Spawned Boss ${num}`;
    }},
    { id: 'difficulty', label: 'Set Difficulty', pattern: /^\/set\s+difficulty\s+([\d.]+)/, execute: (match) => {
        const val = parseFloat(match[1]);
        if (!isNaN(val) && val >= 0.5 && val <= 2.0) {
            TUNING.difficultyMultiplier = val;
            updateTuningSliders();
            return `Difficulty set to ${val.toFixed(2)}x`;
        }
        return 'Invalid difficulty (0.5-2.0)';
    }},
    { id: 'heal', label: 'Full Heal', pattern: /^\/heal$/, execute: () => {
        document.dispatchEvent(new CustomEvent('debug:command', {
            detail: { type: 'fullHeal', payload: {} }
        }));
        return 'Healed';
    }},
    { id: 'levels', label: 'Give Levels', pattern: /^\/levels\s+(\d+)/, execute: (match) => {
        const count = parseInt(match[1]);
        document.dispatchEvent(new CustomEvent('debug:command', {
            detail: { type: 'giveLevels', payload: { count } }
        }));
        return `Gave ${count} levels`;
    }},
    { id: 'godmode', label: 'Toggle Godmode', pattern: /^\/godmode$/, execute: () => {
        document.dispatchEvent(new CustomEvent('debug:command', {
            detail: { type: 'toggleInvincibility', payload: {} }
        }));
        return gameState.debug.invincible ? 'Godmode ON' : 'Godmode OFF';
    }},
    { id: 'pause', label: 'Pause/Resume', pattern: /^\/pause$/, execute: () => {
        if (gameState.running) {
            gameState.paused = !gameState.paused;
            return gameState.paused ? 'Paused' : 'Resumed';
        }
        return 'Game not running';
    }},
];

// Initialize debug menu (only when DEBUG_ENABLED is true)
export function initDebugMenu() {
    // Guard: only initialize if DEBUG is enabled
    if (!DEBUG_ENABLED) {
        // Hide debug screen and return early
        const debugScreen = document.getElementById('debug-screen');
        if (debugScreen) {
            debugScreen.style.display = 'none';
        }
        return;
    }
    
    initQuickBar();
    initTabs();
    initCommandPalette();
    initStateInspector();
    initPresets();
    initLogViewer();
    initPerformancePanel();
    wireExistingControls();
    
    // Keyboard shortcuts
    document.addEventListener('keydown', handleKeyboardShortcuts);
    
    log('DEBUG', 'debug_menu_initialized', {});
}

// Quick Bar
function initQuickBar() {
    const pauseBtn = document.getElementById('quick-pause');
    const restartBtn = document.getElementById('quick-restart');
    const godmodeBtn = document.getElementById('quick-godmode');
    const healBtn = document.getElementById('quick-heal');
    const levelsBtn = document.getElementById('quick-levels');
    const spawnEnemyBtn = document.getElementById('quick-spawn-enemy');
    const spawnBossBtn = document.getElementById('quick-spawn-boss');
    const hitboxesBtn = document.getElementById('quick-hitboxes');
    const screenshotBtn = document.getElementById('quick-screenshot');
    const snapshotBtn = document.getElementById('quick-snapshot');
    
    if (pauseBtn) pauseBtn.addEventListener('click', () => {
        if (gameState.running) {
            gameState.paused = !gameState.paused;
            pauseBtn.textContent = gameState.paused ? 'Resume' : 'Pause';
        }
    });
    
    if (restartBtn) restartBtn.addEventListener('click', () => {
        document.dispatchEvent(new CustomEvent('debug:command', {
            detail: { type: 'restartGame', payload: {} }
        }));
    });
    
    if (godmodeBtn) godmodeBtn.addEventListener('click', () => {
        document.dispatchEvent(new CustomEvent('debug:command', {
            detail: { type: 'toggleInvincibility', payload: {} }
        }));
        godmodeBtn.textContent = gameState.debug.invincible ? 'Godmode ON' : 'Godmode';
    });
    
    if (healBtn) healBtn.addEventListener('click', () => {
        document.dispatchEvent(new CustomEvent('debug:command', {
            detail: { type: 'fullHeal', payload: {} }
        }));
    });
    
    if (levelsBtn) levelsBtn.addEventListener('click', () => {
        document.dispatchEvent(new CustomEvent('debug:command', {
            detail: { type: 'giveLevels', payload: { count: 10 } }
        }));
    });
    
    if (spawnEnemyBtn) spawnEnemyBtn.addEventListener('click', () => {
        document.dispatchEvent(new CustomEvent('debug:command', {
            detail: { type: 'spawnEnemy', payload: { enemyType: lastUsedEnemy } }
        }));
    });
    
    if (spawnBossBtn) spawnBossBtn.addEventListener('click', () => {
        document.dispatchEvent(new CustomEvent('debug:command', {
            detail: { type: 'spawnBoss', payload: { bossNum: lastUsedBoss } }
        }));
    });
    
    if (hitboxesBtn) {
        let hitboxesVisible = false;
        hitboxesBtn.addEventListener('click', () => {
            hitboxesVisible = !hitboxesVisible;
            hitboxesBtn.textContent = hitboxesVisible ? 'Hitboxes ON' : 'Hitboxes';
            document.dispatchEvent(new CustomEvent('debug:command', {
                detail: { type: 'toggleHitboxes', payload: { visible: hitboxesVisible } }
            }));
        });
    }
    
    if (screenshotBtn) screenshotBtn.addEventListener('click', () => {
        document.dispatchEvent(new CustomEvent('debug:command', {
            detail: { type: 'screenshot', payload: {} }
        }));
    });
    
    if (snapshotBtn) snapshotBtn.addEventListener('click', () => {
        const snapshot = exportDebugSnapshot();
        if (navigator.clipboard) {
            navigator.clipboard.writeText(JSON.stringify(snapshot, null, 2));
            log('DEBUG', 'snapshot_copied', {});
        }
    });
    
    // Update quick bar periodically
    setInterval(updateQuickBar, 1000);
}

function updateQuickBar() {
    const pauseBtn = document.getElementById('quick-pause');
    if (pauseBtn && gameState.running) {
        pauseBtn.textContent = gameState.paused ? 'Resume (P)' : 'Pause (P)';
    }
    
    const godmodeBtn = document.getElementById('quick-godmode');
    if (godmodeBtn) {
        godmodeBtn.textContent = gameState.debug.invincible ? 'Godmode ON (G)' : 'Godmode (G)';
    }
}

// Tabs
function initTabs() {
    const tabs = document.querySelectorAll('.debug-tab');
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const tabId = tab.dataset.tab;
            showTab(tabId);
        });
    });
    
    // Show quick tab by default
    showTab('quick');
}

function showTab(tabId) {
    currentTab = tabId;
    
    // Update tab buttons
    document.querySelectorAll('.debug-tab').forEach(t => {
        t.classList.toggle('active', t.dataset.tab === tabId);
    });
    
    // Update tab panels
    document.querySelectorAll('.debug-tab-panel').forEach(p => {
        p.classList.toggle('active', p.id === `debug-tab-${tabId}`);
    });
    
    // Initialize tab-specific content
    if (tabId === 'tuning') {
        wireBalanceTuner();
    }
    
    log('DEBUG', 'tab_switched', { tab: tabId });
}

// Command Palette
function initCommandPalette() {
    const palette = document.getElementById('debug-command-palette');
    const input = document.getElementById('debug-command-input');
    const results = document.getElementById('debug-command-results');
    const openBtn = document.getElementById('debug-open-command-palette');
    
    if (!palette || !input || !results) return;
    
    if (openBtn) {
        openBtn.addEventListener('click', () => {
            showCommandPalette();
        });
    }
    
    input.addEventListener('input', (e) => {
        searchCommands(e.target.value);
    });
    
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            const selected = results.querySelector('.selected');
            if (selected) {
                executeCommand(selected.dataset.cmd);
            } else if (input.value.trim()) {
                executeCommand(input.value.trim());
            }
        } else if (e.key === 'Escape') {
            hideCommandPalette();
        } else if (e.key === 'ArrowDown') {
            e.preventDefault();
            selectNextResult();
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            selectPrevResult();
        }
    });
    
    palette.addEventListener('click', (e) => {
        if (e.target === palette) {
            hideCommandPalette();
        }
    });
}

function showCommandPalette() {
    const palette = document.getElementById('debug-command-palette');
    const input = document.getElementById('debug-command-input');
    if (palette && input) {
        palette.classList.add('active');
        input.value = '';
        input.focus();
        searchCommands('');
    }
}

function hideCommandPalette() {
    const palette = document.getElementById('debug-command-palette');
    if (palette) {
        palette.classList.remove('active');
    }
}

function searchCommands(query) {
    const results = document.getElementById('debug-command-results');
    if (!results) return;
    
    results.innerHTML = '';
    
    if (!query.trim()) {
        // Show all commands
        commands.forEach(cmd => {
            const el = document.createElement('div');
            el.className = 'debug-command-result';
            el.textContent = cmd.label;
            el.dataset.cmd = cmd.id;
            el.addEventListener('click', () => executeCommand(cmd.id));
            results.appendChild(el);
        });
        return;
    }
    
    // Filter commands
    const filtered = commands.filter(cmd => {
        return cmd.label.toLowerCase().includes(query.toLowerCase()) ||
               cmd.id.toLowerCase().includes(query.toLowerCase());
    });
    
    filtered.forEach(cmd => {
        const el = document.createElement('div');
        el.className = 'debug-command-result';
        el.textContent = cmd.label;
        el.dataset.cmd = cmd.id;
        el.addEventListener('click', () => executeCommand(cmd.id));
        results.appendChild(el);
    });
    
    // Try to match command pattern
    if (query.startsWith('/')) {
        commands.forEach(cmd => {
            if (cmd.pattern && cmd.pattern.test(query)) {
                const el = document.createElement('div');
                el.className = 'debug-command-result selected';
                el.textContent = `Execute: ${query}`;
                el.dataset.cmd = query;
                el.addEventListener('click', () => executeCommand(query));
                results.insertBefore(el, results.firstChild);
            }
        });
    }
}

function selectNextResult() {
    const results = document.getElementById('debug-command-results');
    if (!results) return;
    const items = results.querySelectorAll('.debug-command-result');
    const current = results.querySelector('.selected');
    let next = current ? current.nextElementSibling : items[0];
    if (!next && items.length > 0) next = items[0];
    if (current) current.classList.remove('selected');
    if (next) next.classList.add('selected');
}

function selectPrevResult() {
    const results = document.getElementById('debug-command-results');
    if (!results) return;
    const items = results.querySelectorAll('.debug-command-result');
    const current = results.querySelector('.selected');
    let prev = current ? current.previousElementSibling : items[items.length - 1];
    if (!prev && items.length > 0) prev = items[items.length - 1];
    if (current) current.classList.remove('selected');
    if (prev) prev.classList.add('selected');
}

function executeCommand(cmdStr) {
    // Try pattern matching first
    for (const cmd of commands) {
        if (cmd.pattern && cmd.pattern.test(cmdStr)) {
            const match = cmdStr.match(cmd.pattern);
            const result = cmd.execute(match);
            log('DEBUG', 'command_executed', { command: cmd.id, result });
            hideCommandPalette();
            return;
        }
    }
    
    // Try direct command ID
    const cmd = commands.find(c => c.id === cmdStr);
    if (cmd && cmd.execute) {
        const result = cmd.execute();
        log('DEBUG', 'command_executed', { command: cmd.id, result });
        hideCommandPalette();
        return;
    }
    
    log('DEBUG', 'command_not_found', { command: cmdStr });
    hideCommandPalette();
}

// State Inspector
function initStateInspector() {
    updateStateInspector();
    // Throttle updates to 10fps
    setInterval(() => {
        stateUpdateThrottle++;
        if (stateUpdateThrottle >= 6) { // 60fps / 10fps = 6
            updateStateInspector();
            stateUpdateThrottle = 0;
        }
    }, 16);
}

function updateStateInspector() {
    const inspector = document.getElementById('debug-state-inspector');
    if (!inspector || currentTab !== 'state') return;
    
    const state = {
        running: gameState.running,
        paused: gameState.paused,
        health: `${gameState.health}/${gameState.maxHealth}`,
        lives: gameState.lives,
        level: gameState.level,
        xp: `${gameState.xp}/${gameState.xpToLevel}`,
        score: gameState.score,
        arena: gameState.currentArena,
        wave: gameState.currentWave,
        waveState: gameState.waveState,
        bossActive: gameState.bossActive,
        debug: {
            enabled: gameState.debug.enabled,
            invincible: gameState.debug.invincible,
            noEnemies: gameState.debug.noEnemies
        }
    };
    
    inspector.innerHTML = formatStateTree(state, 0);
}

function formatStateTree(obj, depth) {
    let html = '';
    for (const [key, value] of Object.entries(obj)) {
        const indent = '  '.repeat(depth);
        if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
            html += `<div class="debug-state-item">${indent}<span class="debug-state-key">${key}:</span> {</div>`;
            html += formatStateTree(value, depth + 1);
            html += `<div class="debug-state-item">${indent}}</div>`;
        } else {
            html += `<div class="debug-state-item">${indent}<span class="debug-state-key">${key}:</span> <span class="debug-state-value">${JSON.stringify(value)}</span></div>`;
        }
    }
    return html;
}

// Presets
function initPresets() {
    const saveBtn = document.getElementById('debug-preset-save');
    const exportBtn = document.getElementById('debug-preset-export');
    const importBtn = document.getElementById('debug-preset-import-btn');
    
    if (saveBtn) {
        saveBtn.addEventListener('click', () => {
            const nameInput = document.getElementById('debug-preset-name');
            const name = nameInput?.value.trim();
            if (name) {
                savePreset(name);
                if (nameInput) nameInput.value = '';
                refreshPresetList();
            }
        });
    }
    
    if (exportBtn) {
        exportBtn.addEventListener('click', () => {
            const snapshot = exportDebugSnapshot();
            const json = JSON.stringify(snapshot, null, 2);
            if (navigator.clipboard) {
                navigator.clipboard.writeText(json);
                log('DEBUG', 'preset_exported', {});
            }
        });
    }
    
    if (importBtn) {
        importBtn.addEventListener('click', () => {
            const textarea = document.getElementById('debug-preset-import');
            const json = textarea?.value.trim();
            if (json) {
                try {
                    const preset = JSON.parse(json);
                    importPreset(preset);
                    if (textarea) textarea.value = '';
                    log('DEBUG', 'preset_imported', {});
                } catch (e) {
                    log('DEBUG', 'preset_import_failed', { error: e.message });
                }
            }
        });
    }
    
    refreshPresetList();
}

function savePreset(name) {
    const snapshot = exportDebugSnapshot();
    snapshot.name = name;
    snapshot.timestamp = new Date().toISOString();
    
    const key = `debug_preset_${name}`;
    localStorage.setItem(key, JSON.stringify(snapshot));
    log('DEBUG', 'preset_saved', { name });
}

function loadPreset(name) {
    const key = `debug_preset_${name}`;
    const json = localStorage.getItem(key);
    if (json) {
        try {
            const preset = JSON.parse(json);
            importPreset(preset);
            log('DEBUG', 'preset_loaded', { name });
        } catch (e) {
            log('DEBUG', 'preset_load_failed', { name, error: e.message });
        }
    }
}

function importPreset(preset) {
    if (preset.tuning) {
        Object.assign(TUNING, preset.tuning);
        updateTuningSliders();
    }
    
    if (preset.balance) {
        importBalanceOverrides(JSON.stringify(preset.balance));
    }
    
    if (preset.toggles) {
        Object.assign(TUNING, preset.toggles);
        updateToggles();
    }
    
    if (preset.debug) {
        Object.assign(gameState.debug, preset.debug);
    }
    
    if (preset.logTags && DEBUG_CONFIG.tags) {
        Object.assign(DEBUG_CONFIG.tags, preset.logTags);
        updateLogTagToggles();
    }
}

function exportDebugSnapshot() {
    return {
        version: '1.0',
        timestamp: new Date().toISOString(),
        tuning: { ...TUNING },
        balance: getBalanceOverrideMap(),
        toggles: {
            tutorialHintsEnabled: TUNING.tutorialHintsEnabled,
            offScreenWarningEnabled: TUNING.offScreenWarningEnabled,
            retreatAnnouncementEnabled: TUNING.retreatAnnouncementEnabled,
            bossRushEnabled: TUNING.bossRushEnabled,
            attackConePreviewEnabled: TUNING.attackConePreviewEnabled
        },
        debug: { ...gameState.debug },
        logTags: { ...DEBUG_CONFIG.tags }
    };
}

function refreshPresetList() {
    const list = document.getElementById('debug-preset-list');
    if (!list) return;
    
    list.innerHTML = '';
    
    const presets = [];
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('debug_preset_')) {
            const name = key.replace('debug_preset_', '');
            presets.push(name);
        }
    }
    
    presets.forEach(name => {
        const btn = document.createElement('button');
        btn.className = 'debug-btn';
        btn.textContent = name;
        btn.addEventListener('click', () => loadPreset(name));
        
        const delBtn = document.createElement('button');
        delBtn.className = 'debug-btn danger';
        delBtn.textContent = 'Delete';
        delBtn.style.marginLeft = '10px';
        delBtn.addEventListener('click', () => {
            localStorage.removeItem(`debug_preset_${name}`);
            refreshPresetList();
        });
        
        const row = document.createElement('div');
        row.style.display = 'flex';
        row.style.alignItems = 'center';
        row.style.marginBottom = '5px';
        row.appendChild(btn);
        row.appendChild(delBtn);
        list.appendChild(row);
    });
}

// Log Viewer
function initLogViewer() {
    // Intercept console logs
    const originalLog = console.log;
    const originalInfo = console.info;
    const originalWarn = console.warn;
    const originalError = console.error;
    
    // Buffer logs (last 100)
    const bufferLog = (level, ...args) => {
        if (logBuffer.length > 100) logBuffer.shift();
        logBuffer.push({
            level,
            time: new Date().toISOString(),
            args: args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ')
        });
        updateLogViewer();
    };
    
    console.log = (...args) => { originalLog(...args); bufferLog('log', ...args); };
    console.info = (...args) => { originalInfo(...args); bufferLog('info', ...args); };
    console.warn = (...args) => { originalWarn(...args); bufferLog('warn', ...args); };
    console.error = (...args) => { originalError(...args); bufferLog('error', ...args); };
    
    // Tag toggles
    updateLogTagToggles();
    
    // Filter
    const filterInput = document.getElementById('debug-log-filter');
    if (filterInput) {
        filterInput.addEventListener('input', (e) => {
            updateLogViewer(e.target.value);
        });
    }
    
    // Clear
    const clearBtn = document.getElementById('debug-log-clear');
    if (clearBtn) {
        clearBtn.addEventListener('click', () => {
            logBuffer = [];
            updateLogViewer();
        });
    }
    
    // Export
    const exportBtn = document.getElementById('debug-log-export');
    if (exportBtn) {
        exportBtn.addEventListener('click', () => {
            const text = logBuffer.map(l => `[${l.level}] ${l.time}: ${l.args}`).join('\n');
            if (navigator.clipboard) {
                navigator.clipboard.writeText(text);
            }
        });
    }
}

function updateLogTagToggles() {
    const container = document.getElementById('debug-log-tags');
    if (!container || !DEBUG_CONFIG.tags) return;
    
    container.innerHTML = '';
    
    Object.entries(DEBUG_CONFIG.tags).forEach(([tag, enabled]) => {
        const btn = document.createElement('button');
        btn.className = `debug-btn ${enabled ? 'success' : ''}`;
        btn.textContent = `${tag}: ${enabled ? 'ON' : 'OFF'}`;
        btn.addEventListener('click', () => {
            DEBUG_CONFIG.tags[tag] = !DEBUG_CONFIG.tags[tag];
            updateLogTagToggles();
        });
        container.appendChild(btn);
    });
}

function updateLogViewer(filter = '') {
    const viewer = document.getElementById('debug-log-viewer');
    if (!viewer) return;
    
    viewer.innerHTML = '';
    
    const filtered = logBuffer.filter(log => {
        if (!filter) return true;
        return log.args.toLowerCase().includes(filter.toLowerCase());
    });
    
    filtered.slice(-50).forEach(log => {
        const el = document.createElement('div');
        el.className = `debug-log-entry ${log.level}`;
        el.textContent = `[${log.level}] ${log.args}`;
        viewer.appendChild(el);
    });
    
    viewer.scrollTop = viewer.scrollHeight;
}

// Performance Panel
let perfFrameCount = 0;
let perfLastUpdate = performance.now();

export function updatePerformanceData(deltaTime) {
    perfFrameCount++;
    const now = performance.now();
    
    if (now - perfLastUpdate >= 1000) {
        perfData.fps = perfFrameCount;
        perfData.frameTime = deltaTime * 1000; // Convert to ms
        perfFrameCount = 0;
        perfLastUpdate = now;
        updatePerformancePanel();
    }
}

function initPerformancePanel() {
    updatePerformancePanel();
    setInterval(updatePerformancePanel, 500);
}

function updatePerformancePanel() {
    const panel = document.getElementById('debug-perf-info');
    if (!panel || currentTab !== 'perf') return;
    
    const boss = getCurrentBoss();
    
    panel.innerHTML = `
        <div class="debug-label">FPS: <span style="color: #ffdd44">${perfData.fps}</span></div>
        <div class="debug-label">Frame Time: <span style="color: #ffdd44">${perfData.frameTime.toFixed(2)}ms</span></div>
        <div class="debug-label">Enemies: <span style="color: #ffdd44">${enemies.length}</span></div>
        <div class="debug-label">Projectiles: <span style="color: #ffdd44">${projectiles.length}</span></div>
        <div class="debug-label">Enemy Projectiles: <span style="color: #ffdd44">${enemyProjectiles.length}</span></div>
        <div class="debug-label">XP Gems: <span style="color: #ffdd44">${xpGems.length}</span></div>
        <div class="debug-label">Particles: <span style="color: #ffdd44">${particles.length}</span></div>
        <div class="debug-label">Boss Active: <span style="color: ${boss ? '#44ff44' : '#888'}">${boss ? 'Yes' : 'No'}</span></div>
    `;
}

// Wire existing controls
function wireExistingControls() {
    // These will be wired by the existing setupDebugControls() function
    // We just need to ensure they work with the new tab structure
}

// Wire balance tuner
function wireBalanceTuner() {
    const balanceContainer = document.getElementById('debug-balance');
    if (balanceContainer && !balanceContainer.hasAttribute('data-initialized')) {
        balanceContainer.setAttribute('data-initialized', 'true');
        initBalanceTunerUI();
    }
}

// Update tuning sliders (called after preset import)
function updateTuningSliders() {
    // Trigger input events on all sliders to refresh their values
    document.querySelectorAll('.debug-slider').forEach(slider => {
        slider.dispatchEvent(new Event('input'));
    });
}

// Update toggles (called after preset import)
function updateToggles() {
    // Trigger click events on toggle buttons to refresh their labels
    document.querySelectorAll('[id^="debug-toggle-"]').forEach(btn => {
        btn.dispatchEvent(new Event('click'));
        btn.dispatchEvent(new Event('click')); // Toggle twice to get back to correct state
    });
}

// Keyboard shortcuts
function handleKeyboardShortcuts(e) {
    const debugScreen = document.getElementById('debug-screen');
    if (!debugScreen || debugScreen.style.display !== 'flex') return;
    
    // Ctrl+K or Cmd+K for command palette
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        showCommandPalette();
        return;
    }
    
    // Escape to close command palette or debug menu
    if (e.key === 'Escape') {
        const palette = document.getElementById('debug-command-palette');
        if (palette && palette.classList.contains('active')) {
            hideCommandPalette();
        } else {
            document.dispatchEvent(new CustomEvent('debug:command', {
                detail: { type: 'hideDebugMenu', payload: {} }
            }));
        }
        return;
    }
    
    // Number keys 1-8 for tabs
    if (e.key >= '1' && e.key <= '8') {
        const tabIndex = parseInt(e.key) - 1;
        const tabs = ['quick', 'spawn', 'tuning', 'visual', 'perf', 'state', 'logs', 'presets'];
        if (tabs[tabIndex]) {
            showTab(tabs[tabIndex]);
        }
        return;
    }
    
    // P for pause
    if (e.key === 'p' || e.key === 'P') {
        if (gameState.running) {
            gameState.paused = !gameState.paused;
        }
        return;
    }
    
    // G for godmode
    if (e.key === 'g' || e.key === 'G') {
        document.dispatchEvent(new CustomEvent('debug:command', {
            detail: { type: 'toggleInvincibility', payload: {} }
        }));
        return;
    }
}

// Export functions for external use
export function refreshDebugMenu() {
    updateStateInspector();
    updatePerformancePanel();
    updateLogViewer();
    refreshPresetList();
}
