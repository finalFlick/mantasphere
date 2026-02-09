// Debug-only placement editor: click on ground to place objects, export layout JSON.
// Only active when DEBUG_ENABLED and gameState.debug.placementMode is true.

import { scene, camera, ground } from '../core/scene.js';
import { getSpawnFactoryContext } from './generator.js';
import { initSpawnFactory, spawn, getSpawnableTypes } from './spawnFactory.js';
import { gameState } from '../core/gameState.js';

const PREFAB_TYPES = ['coralCluster', 'rockCluster', 'rockFormation'];
const draftObjects = [];
const draftPrefabs = [];
let raycaster = null;
let mouse = null;
let placementModeActive = false;
let currentType = 'obstacle';
let lastHitPoint = null;
let previewMesh = null;
let boundHandlers = false;

function getMouseNDC(pointerEvent) {
    const canvas = document.querySelector('canvas');
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    return {
        x: ((pointerEvent.clientX - rect.left) / rect.width) * 2 - 1,
        y: -((pointerEvent.clientY - rect.top) / rect.height) * 2 + 1
    };
}

function raycastGround(ndc) {
    if (!raycaster || !mouse || !ground || !camera) return null;
    mouse.set(ndc.x, ndc.y);
    raycaster.setFromCamera(mouse, camera);
    const hits = raycaster.intersectObject(ground);
    return hits.length > 0 ? hits[0] : null;
}

function updatePreview(position) {
    if (!scene || !position) return;
    if (!previewMesh) {
        const geom = new THREE.RingGeometry(0.5, 1, 16);
        const mat = new THREE.MeshBasicMaterial({
            color: 0x00ff00,
            transparent: true,
            opacity: 0.6,
            side: THREE.DoubleSide
        });
        previewMesh = new THREE.Mesh(geom, mat);
        previewMesh.rotation.x = -Math.PI / 2;
        scene.add(previewMesh);
    }
    previewMesh.position.set(position.x, 0.02, position.z);
    previewMesh.visible = true;
}

function hidePreview() {
    if (previewMesh) previewMesh.visible = false;
}

function onPointerMove(e) {
    if (!placementModeActive || !gameState.debug.placementMode) return;
    const ndc = getMouseNDC(e);
    if (!ndc) return;
    const hit = raycastGround(ndc);
    if (hit) {
        lastHitPoint = hit.point;
        updatePreview(hit.point);
    } else {
        lastHitPoint = null;
        hidePreview();
    }
}

function onPointerClick(e) {
    if (!placementModeActive || !gameState.debug.placementMode) return;
    const ndc = getMouseNDC(e);
    if (!ndc) return;
    const hit = raycastGround(ndc);
    if (!hit) return;
    const x = Math.round(hit.point.x * 100) / 100;
    const z = Math.round(hit.point.z * 100) / 100;
    const entry = { type: currentType, x, z };
    const isPrefab = PREFAB_TYPES.includes(currentType);
    spawn(currentType, x, z, entry);
    if (isPrefab) {
        draftPrefabs.push(entry);
    } else {
        draftObjects.push(entry);
    }
}

function onKeyDown(e) {
    if (!placementModeActive || !gameState.debug.placementMode) return;
    if (e.key === 's' || e.key === 'S') {
        if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            exportLayoutJSON();
        }
    }
}

function bindHandlers() {
    if (boundHandlers) return;
    const canvas = document.querySelector('canvas');
    if (!canvas) return;
    canvas.addEventListener('pointermove', onPointerMove);
    canvas.addEventListener('click', onPointerClick);
    document.addEventListener('keydown', onKeyDown);
    boundHandlers = true;
}

function unbindHandlers() {
    if (!boundHandlers) return;
    const canvas = document.querySelector('canvas');
    if (canvas) {
        canvas.removeEventListener('pointermove', onPointerMove);
        canvas.removeEventListener('click', onPointerClick);
    }
    document.removeEventListener('keydown', onKeyDown);
    boundHandlers = false;
}

/**
 * Enable placement mode: raycast on ground, click to place, S to export.
 * Call when debug placement toggle is turned on.
 */
export function enablePlacementMode() {
    if (placementModeActive) return;
    if (!scene || !camera || !ground) return;
    raycaster = new THREE.Raycaster();
    mouse = new THREE.Vector2();
    initSpawnFactory(getSpawnFactoryContext());
    placementModeActive = true;
    bindHandlers();
}

/**
 * Disable placement mode and remove listeners.
 */
export function disablePlacementMode() {
    placementModeActive = false;
    hidePreview();
    unbindHandlers();
}

/**
 * Set current placement type (e.g. 'obstacle', 'coralCluster').
 */
export function setPlacementType(type) {
    currentType = type;
}

/**
 * Get current placement type.
 */
export function getPlacementType() {
    return currentType;
}

/**
 * Get list of types for UI dropdown.
 */
export function getPlacementTypes() {
    return getSpawnableTypes();
}

/**
 * Export draft layout as JSON string (objects + prefabs). Copy to clipboard if possible.
 * @returns {string} JSON string
 */
export function exportLayoutJSON() {
    const layout = {
        objects: [...draftObjects],
        prefabs: [...draftPrefabs]
    };
    const json = JSON.stringify(layout, null, 2);
    if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(json);
    }
    return json;
}

/**
 * Clear draft arrays (e.g. when starting a new layout session).
 */
export function clearDraftLayout() {
    draftObjects.length = 0;
    draftPrefabs.length = 0;
}

/**
 * Initialize the placement editor. Call from debug menu when DEBUG_ENABLED.
 */
export function initPlacementEditor() {
    // gameState.debug.placementMode is defined in gameState.js
}
