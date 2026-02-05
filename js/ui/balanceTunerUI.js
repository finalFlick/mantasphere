// Balance Tuner UI - Dynamically renders slider/input controls
// from the balance registry, grouped by category.
// Gated behind DEBUG flag; lives inside the existing debug menu.

import {
    getBalanceCategories,
    getBalanceParamsByCategory,
    getBalanceValue,
    getBalanceOverrideMap,
    setBalanceValue,
    clearBalanceValue,
    resetAllBalanceValues,
    exportBalanceOverrides,
    importBalanceOverrides
} from '../config/balanceRegistry.js';

const CATEGORY_LABELS = {
    Player: 'Player',
    DashStrike: 'Dash Strike',
    Enemies: 'Enemies',
    Boss1: 'Boss 1',
    Waves: 'Waves'
};

let rendered = false;

/**
 * Build the entire Balance Tuning section inside #debug-balance.
 * Safe to call multiple times -- rebuilds only once; subsequent
 * calls refresh displayed values.
 */
export function initBalanceTunerUI() {
    const root = document.getElementById('debug-balance');
    if (!root) return;

    if (!rendered) {
        buildUI(root);
        rendered = true;
    }
    refreshAllValues();
}

// ==================== UI Construction ====================

function buildUI(root) {
    root.innerHTML = '';

    const categories = getBalanceCategories();
    if (categories.length === 0) return;

    // --- Category tabs ---
    const tabBar = document.createElement('div');
    tabBar.className = 'balance-tabs';
    root.appendChild(tabBar);

    // --- Category panels ---
    const panelContainer = document.createElement('div');
    root.appendChild(panelContainer);

    categories.forEach((cat, idx) => {
        // Tab button
        const tab = document.createElement('button');
        tab.className = 'balance-tab' + (idx === 0 ? ' active' : '');
        tab.textContent = CATEGORY_LABELS[cat] || cat;
        tab.dataset.cat = cat;
        tab.addEventListener('click', () => switchCategory(root, cat));
        tabBar.appendChild(tab);

        // Panel
        const panel = document.createElement('div');
        panel.className = 'balance-category' + (idx === 0 ? ' active' : '');
        panel.dataset.cat = cat;
        panelContainer.appendChild(panel);

        const params = getBalanceParamsByCategory(cat);
        params.forEach(param => {
            panel.appendChild(buildParamRow(param));
        });
    });

    // --- Toolbar (reset all, export, import) ---
    const toolbar = document.createElement('div');
    toolbar.className = 'balance-toolbar';
    root.appendChild(toolbar);

    // Override count indicator
    const overrideCount = document.createElement('span');
    overrideCount.className = 'balance-override-count';
    overrideCount.id = 'balance-override-count';

    // Reset All
    const resetAllBtn = document.createElement('button');
    resetAllBtn.className = 'debug-btn danger';
    resetAllBtn.textContent = 'Reset All to Defaults';
    resetAllBtn.addEventListener('click', () => {
        resetAllBalanceValues();
        refreshAllValues();
    });
    toolbar.appendChild(resetAllBtn);

    // Export
    const exportBtn = document.createElement('button');
    exportBtn.className = 'debug-btn';
    exportBtn.textContent = 'Export JSON';
    exportBtn.addEventListener('click', () => {
        const json = exportBalanceOverrides();
        const importArea = root.querySelector('.balance-import-area');
        const textarea = importArea?.querySelector('textarea');
        if (textarea) {
            textarea.value = json;
        }
        if (importArea) importArea.style.display = 'block';

        // Try clipboard
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(json).catch(() => {});
        }
    });
    toolbar.appendChild(exportBtn);

    // Import
    const importBtn = document.createElement('button');
    importBtn.className = 'debug-btn';
    importBtn.textContent = 'Import JSON';
    importBtn.addEventListener('click', () => {
        const importArea = root.querySelector('.balance-import-area');
        if (importArea) {
            importArea.style.display = importArea.style.display === 'block' ? 'none' : 'block';
        }
    });
    toolbar.appendChild(importBtn);

    toolbar.appendChild(overrideCount);

    // Import text area + apply button
    const importArea = document.createElement('div');
    importArea.className = 'balance-import-area';
    const textarea = document.createElement('textarea');
    textarea.placeholder = 'Paste balance override JSON here...';
    importArea.appendChild(textarea);

    const applyImportBtn = document.createElement('button');
    applyImportBtn.className = 'debug-btn success';
    applyImportBtn.textContent = 'Apply Import';
    applyImportBtn.style.marginTop = '6px';
    applyImportBtn.addEventListener('click', () => {
        const result = importBalanceOverrides(textarea.value);
        if (result.ok) {
            refreshAllValues();
            textarea.value = '';
            importArea.style.display = 'none';
        } else {
            textarea.style.borderColor = '#ff4444';
            setTimeout(() => { textarea.style.borderColor = '#444'; }, 1200);
        }
    });
    importArea.appendChild(applyImportBtn);
    root.appendChild(importArea);
}

// ==================== Single Param Row ====================

function buildParamRow(param) {
    const row = document.createElement('div');
    row.className = 'balance-param-row';
    row.dataset.key = param.key;

    // Label
    const label = document.createElement('span');
    label.className = 'balance-param-label';
    label.textContent = param.label;
    label.title = param.key;
    row.appendChild(label);

    // Slider
    const slider = document.createElement('input');
    slider.type = 'range';
    slider.className = 'balance-param-slider';
    slider.min = String(param.min);
    slider.max = String(param.max);
    slider.step = String(param.step);
    slider.value = String(getBalanceValue(param.key));
    slider.dataset.key = param.key;
    row.appendChild(slider);

    // Numeric input
    const valWrap = document.createElement('span');
    valWrap.className = 'balance-param-value';
    const numInput = document.createElement('input');
    numInput.type = 'number';
    numInput.min = String(param.min);
    numInput.max = String(param.max);
    numInput.step = String(param.step);
    numInput.value = formatValue(getBalanceValue(param.key), param.step);
    numInput.dataset.key = param.key;
    valWrap.appendChild(numInput);
    row.appendChild(valWrap);

    // Reset single param button
    const resetBtn = document.createElement('span');
    resetBtn.className = 'balance-param-reset';
    resetBtn.textContent = '\u21BA'; // ↺
    resetBtn.title = 'Reset to default';
    resetBtn.dataset.key = param.key;
    const overrides = getBalanceOverrideMap();
    if (Object.prototype.hasOwnProperty.call(overrides, param.key)) {
        resetBtn.classList.add('has-override');
    }
    row.appendChild(resetBtn);

    // --- Event wiring ---

    // Slider input (fires continuously while dragging)
    slider.addEventListener('input', () => {
        const val = parseFloat(slider.value);
        setBalanceValue(param.key, val);
        numInput.value = formatValue(val, param.step);
        markOverride(row, param.key);
        updateOverrideCount();
    });

    // Number input change
    numInput.addEventListener('change', () => {
        const val = parseFloat(numInput.value);
        if (Number.isNaN(val)) return;
        const result = setBalanceValue(param.key, val);
        if (result.ok) {
            slider.value = String(result.value);
            numInput.value = formatValue(result.value, param.step);
        }
        markOverride(row, param.key);
        updateOverrideCount();
    });

    // Reset single
    resetBtn.addEventListener('click', () => {
        clearBalanceValue(param.key);
        const fresh = getBalanceValue(param.key);
        slider.value = String(fresh);
        numInput.value = formatValue(fresh, param.step);
        resetBtn.classList.remove('has-override');
        updateOverrideCount();
    });

    return row;
}

// ==================== Helpers ====================

function switchCategory(root, cat) {
    root.querySelectorAll('.balance-tab').forEach(t => {
        t.classList.toggle('active', t.dataset.cat === cat);
    });
    root.querySelectorAll('.balance-category').forEach(p => {
        p.classList.toggle('active', p.dataset.cat === cat);
    });
}

function formatValue(value, step) {
    if (typeof value !== 'number') return '0';
    const decimals = countDecimals(step);
    return value.toFixed(decimals);
}

function countDecimals(num) {
    const str = String(num);
    const dot = str.indexOf('.');
    if (dot < 0) return 0;
    return str.length - dot - 1;
}

function markOverride(row, key) {
    const resetBtn = row.querySelector('.balance-param-reset');
    if (!resetBtn) return;
    const overrides = getBalanceOverrideMap();
    if (Object.prototype.hasOwnProperty.call(overrides, key)) {
        resetBtn.classList.add('has-override');
    } else {
        resetBtn.classList.remove('has-override');
    }
}

function updateOverrideCount() {
    const el = document.getElementById('balance-override-count');
    if (!el) return;
    const count = Object.keys(getBalanceOverrideMap()).length;
    el.textContent = count > 0 ? `${count} override${count !== 1 ? 's' : ''} active` : '';
}

function refreshAllValues() {
    const root = document.getElementById('debug-balance');
    if (!root) return;

    const overrides = getBalanceOverrideMap();
    root.querySelectorAll('.balance-param-row').forEach(row => {
        const key = row.dataset.key;
        if (!key) return;
        const val = getBalanceValue(key);
        const slider = row.querySelector('.balance-param-slider');
        const numInput = row.querySelector('.balance-param-value input');
        const resetBtn = row.querySelector('.balance-param-reset');
        if (slider) slider.value = String(val);
        if (numInput) {
            const step = parseFloat(slider?.step || '1');
            numInput.value = formatValue(val, step);
        }
        if (resetBtn) {
            resetBtn.classList.toggle('has-override', Object.prototype.hasOwnProperty.call(overrides, key));
        }
    });

    updateOverrideCount();
}
