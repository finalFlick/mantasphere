/**
 * Texture loader and PBR helpers for assets/textures/.
 * Loads albedo, normal, ORM, and RGBA textures; provides applyPbr, applyOrm, ensureUv2.
 * Init after initScene(), before createGround().
 */

import { TUNING } from '../config/tuning.js';

const BASE = 'assets/textures/';

export const Textures = {
    groundSand: { albedo: null, normal: null, orm: null },
    stoneSeabed: { albedo: null, normal: null, orm: null },
    woodWreck: { albedo: null, normal: null, orm: null },
    woodWreck512: { albedo: null, normal: null, orm: null },
    vfxEnergyRing: null
};

let loader = null;
let initPromise = null;

function getLoader() {
    if (!loader) loader = new THREE.TextureLoader();
    return loader;
}

function load(path) {
    return new Promise((resolve, reject) => {
        getLoader().load(path, resolve, undefined, reject);
    });
}

function setTiling(tex, repeatX, repeatY) {
    if (!tex) return;
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(repeatX, repeatY);
}

function setSrgb(tex) {
    if (tex && typeof THREE.sRGBEncoding !== 'undefined') tex.encoding = THREE.sRGBEncoding;
}

/**
 * Ensure geometry has uv2 (required for aoMap). Clones uv to uv2 if missing.
 * @param {THREE.BufferGeometry} geometry
 */
export function ensureUv2(geometry) {
    if (!geometry || !geometry.attributes.uv) return;
    if (geometry.attributes.uv2) return;
    const uv = geometry.attributes.uv;
    geometry.setAttribute('uv2', uv.clone());
}

/**
 * Apply ORM texture to material (aoMap, roughnessMap, metalnessMap from same texture).
 * Set roughness/metalness to 1 so maps drive the values.
 * @param {THREE.MeshStandardMaterial} material
 * @param {THREE.Texture} ormTex
 */
export function applyOrm(material, ormTex) {
    if (!material || !ormTex) return;
    material.aoMap = ormTex;
    material.roughnessMap = ormTex;
    material.metalnessMap = ormTex;
    material.roughness = 1;
    material.metalness = 1;
}

/**
 * Apply full PBR set (albedo, normal, ORM) to a material and optionally set tiling.
 * @param {THREE.MeshStandardMaterial} material
 * @param {{ albedo?: THREE.Texture, normal?: THREE.Texture, orm?: THREE.Texture }} set
 * @param {{ repeatX?: number, repeatY?: number, useAlbedo?: boolean }} options
 */
export function applyPbr(material, set, options = {}) {
    if (!material) return;
    const { repeatX, repeatY, useAlbedo = true } = options;
    if (useAlbedo && set.albedo) {
        material.map = set.albedo;
        const albedo = Number(TUNING.groundAlbedoMultiplier ?? 1.0);
        material.color.setRGB(albedo, albedo, albedo);
        setSrgb(set.albedo);
        if (repeatX != null && repeatY != null) setTiling(set.albedo, repeatX, repeatY);
    }
    if (set.normal) {
        material.normalMap = set.normal;
        if (repeatX != null && repeatY != null) setTiling(set.normal, repeatX, repeatY);
    }
    if (set.orm) {
        applyOrm(material, set.orm);
        if (repeatX != null && repeatY != null) setTiling(set.orm, repeatX, repeatY);
    }
}

/**
 * Load all game textures. Call once after initScene(), before createGround().
 * @param {THREE.WebGLRenderer} _renderer - Unused; kept for API compatibility.
 * @returns {Promise<void>}
 */
export function initTextures(_renderer) {
    if (initPromise) return initPromise;
    initPromise = (async () => {
        let loadResults;
        try {
            loadResults = await Promise.all([
            load(BASE + 'ground_sand_albedo.png'),
            load(BASE + 'ground_sand_normal.png'),
            load(BASE + 'ground_sand_orm.png'),
            load(BASE + 'stone_seabed_albedo.png'),
            load(BASE + 'stone_seabed_normal.png'),
            load(BASE + 'stone_seabed_orm.png'),
            load(BASE + 'wood_wreck_albedo.png'),
            load(BASE + 'wood_wreck_normal.png'),
            load(BASE + 'wood_wreck_orm.png'),
            load(BASE + 'wood_wreck_512_albedo.png'),
            load(BASE + 'wood_wreck_512_normal.png'),
            load(BASE + 'wood_wreck_512_orm.png'),
            load(BASE + 'vfx_energy_ring_rgba.png')
            ]);
        } catch (err) {
            throw err;
        }
        const [groundA, groundN, groundO, stoneA, stoneN, stoneO, woodA, woodN, woodO, wood512A, wood512N, wood512O, vfxRgba] = loadResults;
        Textures.groundSand = { albedo: groundA, normal: groundN, orm: groundO };
        Textures.stoneSeabed = { albedo: stoneA, normal: stoneN, orm: stoneO };
        Textures.woodWreck = { albedo: woodA, normal: woodN, orm: woodO };
        Textures.woodWreck512 = { albedo: wood512A, normal: wood512N, orm: wood512O };
        Textures.vfxEnergyRing = vfxRgba;

        setSrgb(groundA);
        setSrgb(stoneA);
        setSrgb(woodA);
        setSrgb(wood512A);
    })();
    return initPromise;
}
