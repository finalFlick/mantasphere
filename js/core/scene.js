// Three.js scene management
import { getArenaBounds, getSpeedBowlsForArena, BOWL_HOLE_RADIUS } from '../config/arenas.js';
import { gameState } from './gameState.js';
import { TUNING } from '../config/tuning.js';
import { Textures, applyPbr, ensureUv2 } from '../systems/textures.js';

/** Ground plane Y position; slightly below 0 so floor-level landmarks (bowls, decals) sit above and avoid z-fighting. */
const GROUND_Y_OFFSET = -0.02;

export let scene = null;
export let camera = null;
export let renderer = null;
export let ground = null;
let gridHelper = null;

// Light references for per-arena visual profiles
let sceneAmbientLight = null;
let sceneDirectionalLight = null;
let scenePointLight1 = null;
let scenePointLight2 = null;

// Optional in-game bloom (EffectComposer); fallback to direct render when unavailable or disabled
let gameComposer = null;
let gameBloomPass = null;

// Base values for brightness tuning (0.4.x-aligned defaults; applyArenaVisualProfile can override per arena)
const BASE_EXPOSURE = 1.0;
let baseAmbient = 0.5;
let baseDirectional = 0.8;
let basePoint1 = 0.5;
let basePoint2 = 0.5;

function initGameComposer() {
    if (gameComposer) return;
    if (typeof THREE === 'undefined' || typeof THREE.EffectComposer === 'undefined') return;
    if (!renderer || !scene || !camera) return;
    gameComposer = new THREE.EffectComposer(renderer);
    gameComposer.addPass(new THREE.RenderPass(scene, camera));
    const bloomStr = Number(TUNING.bloomStrength ?? 0.2);
    gameBloomPass = new THREE.UnrealBloomPass(
        new THREE.Vector2(window.innerWidth, window.innerHeight),
        bloomStr,
        0.25,
        0.65
    );
    gameComposer.addPass(gameBloomPass);
}

export function initScene() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1a1a2e);
    scene.fog = new THREE.Fog(0x1a1a2e, 20, 80);  // 0.4.x values

    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    // 0.4.x had no tone mapping; use NoToneMapping by default to avoid diluted/faded highlights
    if (typeof THREE.NoToneMapping !== 'undefined') renderer.toneMapping = THREE.NoToneMapping;
    if (typeof renderer.toneMappingExposure !== 'undefined') renderer.toneMappingExposure = BASE_EXPOSURE * (Number(TUNING.exposureMultiplier ?? 1.0));
    document.getElementById('game-container').appendChild(renderer.domElement);

    // Lighting (0.4.x-style base; applyBrightnessTuning applies TUNING multipliers)
    sceneAmbientLight = new THREE.AmbientLight(0x404060, baseAmbient);
    scene.add(sceneAmbientLight);

    sceneDirectionalLight = new THREE.DirectionalLight(0xffffff, baseDirectional);
    sceneDirectionalLight.position.set(50, 50, 50);
    sceneDirectionalLight.castShadow = true;
    sceneDirectionalLight.shadow.mapSize.width = 2048;
    sceneDirectionalLight.shadow.mapSize.height = 2048;
    sceneDirectionalLight.shadow.camera.near = 0.5;
    sceneDirectionalLight.shadow.camera.far = 200;
    sceneDirectionalLight.shadow.camera.left = -50;
    sceneDirectionalLight.shadow.camera.right = 50;
    sceneDirectionalLight.shadow.camera.top = 50;
    sceneDirectionalLight.shadow.camera.bottom = -50;
    scene.add(sceneDirectionalLight);

    scenePointLight1 = new THREE.PointLight(0xff6644, basePoint1, 30);
    scenePointLight1.position.set(-20, 5, -20);
    scene.add(scenePointLight1);

    scenePointLight2 = new THREE.PointLight(0x4466ff, basePoint2, 30);
    scenePointLight2.position.set(20, 5, 20);
    scene.add(scenePointLight2);

    applyBrightnessTuning();
    return { scene, camera, renderer };
}

/**
 * Apply per-arena visual profile (background, fog, key/fill lights).
 * Call from generateArena() after initUnderwaterAssets so Arena 1 teal overrides default fog.
 */
export function applyArenaVisualProfile(arenaNum) {
    if (!scene || !sceneAmbientLight || !sceneDirectionalLight) return;

    if (arenaNum === 1) {
        // Arena 1: teal underwater vibe
        scene.background.setHex(0x123548);
        scene.fog = new THREE.FogExp2(0x123548, 0.008);
        sceneAmbientLight.color.setHex(0x6090b0);
        baseAmbient = 0.85;
        sceneDirectionalLight.color.setHex(0xbbddff);
        baseDirectional = 1.05;
        if (scenePointLight1) {
            scenePointLight1.color.setHex(0xffcc88);
            basePoint1 = 0.55;
        }
        if (scenePointLight2) {
            scenePointLight2.color.setHex(0x88ccff);
            basePoint2 = 0.5;
        }
    } else {
        // Default: 0.4.x-style purple-tinted arena (lower fill, no bloom-style wash)
        scene.background.setHex(0x1a1a2e);
        scene.fog = new THREE.Fog(0x1a1a2e, 20, 80);
        sceneAmbientLight.color.setHex(0x404060);
        baseAmbient = 0.5;
        sceneDirectionalLight.color.setHex(0xffffff);
        baseDirectional = 0.8;
        if (scenePointLight1) {
            scenePointLight1.color.setHex(0xff6644);
            basePoint1 = 0.5;
        }
        if (scenePointLight2) {
            scenePointLight2.color.setHex(0x4466ff);
            basePoint2 = 0.5;
        }
    }
    applyBrightnessTuning();
}

/**
 * Apply brightness tuning from TUNING (exposure, light multipliers, bloom).
 * Call after applyArenaVisualProfile and whenever debug brightness sliders change.
 */
export function applyBrightnessTuning() {
    if (!renderer) return;
    const expMult = Number(TUNING.exposureMultiplier ?? 1.0);
    renderer.toneMappingExposure = BASE_EXPOSURE * expMult;

    if (sceneAmbientLight) {
        const ambMult = Number(TUNING.ambientLightMultiplier ?? 1.0);
        sceneAmbientLight.intensity = baseAmbient * ambMult;
    }
    if (sceneDirectionalLight) {
        const dirMult = Number(TUNING.directionalLightMultiplier ?? 1.0);
        sceneDirectionalLight.intensity = baseDirectional * dirMult;
    }
    const ptMult = Number(TUNING.pointLightsMultiplier ?? 1.0);
    if (scenePointLight1) scenePointLight1.intensity = basePoint1 * ptMult;
    if (scenePointLight2) scenePointLight2.intensity = basePoint2 * ptMult;

    if (gameBloomPass) {
        gameBloomPass.strength = Number(TUNING.bloomStrength ?? 0.2);
    }
}

export function createGround() {
    const size = 100;
    const groundGeometry = new THREE.PlaneGeometry(size, size, 20, 20);
    const groundMaterial = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        roughness: 1,
        metalness: 1
    });
    ground = new THREE.Mesh(groundGeometry, groundMaterial);
    if (Textures.groundSand.albedo) {
        applyPbr(groundMaterial, Textures.groundSand, { repeatX: size / 5, repeatY: size / 5 });
    } else {
        groundMaterial.color.setHex(0x2a2a4a);
        groundMaterial.roughness = 0.8;
        groundMaterial.metalness = 0.2;
    }
    ensureUv2(groundGeometry);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    ground.position.y = GROUND_Y_OFFSET;
    ground.renderOrder = 0;
    scene.add(ground);

    gridHelper = new THREE.GridHelper(size, 50, 0x444466, 0x333355);
    gridHelper.position.y = 0.01;
    scene.add(gridHelper);

    return ground;
}

/**
 * Resize ground and grid to match arena bounds. Call from generateArena so floor always covers play area.
 */
export function resizeGroundForArena(arenaNumber) {
    if (!ground || !scene) return;
    const bound = getArenaBounds(arenaNumber);
    const size = 2 * bound;
    const segments = Math.max(10, Math.min(80, Math.floor(size / 5)));
    const divisions = Math.max(10, Math.min(50, Math.floor(size / 4)));

    if (ground.geometry) ground.geometry.dispose();
    if (arenaNumber === 1) {
        const half = bound;
        const shape = new THREE.Shape();
        // Shape is in xy; mesh rotated -PI/2 around x so shape y -> world -z. Use (worldX, -worldZ).
        shape.moveTo(-half, half);
        shape.lineTo(half, half);
        shape.lineTo(half, -half);
        shape.lineTo(-half, -half);
        shape.lineTo(-half, half);
        const bowls = getSpeedBowlsForArena(1);
        bowls.forEach(b => {
            const hole = new THREE.Path();
            hole.absarc(b.cx, -b.cz, BOWL_HOLE_RADIUS, 0, Math.PI * 2, true);
            shape.holes.push(hole);
        });
        ground.geometry = new THREE.ShapeGeometry(shape, 24);
    } else {
        ground.geometry = new THREE.PlaneGeometry(size, size, segments, segments);
    }
    ground.position.y = GROUND_Y_OFFSET;
    ensureUv2(ground.geometry);
    const mat = ground.material;
    if (mat && mat.map && Textures.groundSand.albedo) {
        const r = size / 5;
        mat.map.repeat.set(r, r);
        if (mat.normalMap) mat.normalMap.repeat.set(r, r);
        if (mat.roughnessMap) mat.roughnessMap.repeat.set(r, r);
    }

    if (gridHelper) {
        scene.remove(gridHelper);
        if (gridHelper.geometry) gridHelper.geometry.dispose();
    }
    gridHelper = new THREE.GridHelper(size, divisions, 0x444466, 0x333355);
    gridHelper.position.y = 0.01;
    scene.add(gridHelper);
}

export function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    if (gameComposer && gameBloomPass) {
        gameComposer.setSize(window.innerWidth, window.innerHeight);
        gameComposer.setPixelRatio(renderer.getPixelRatio());
        gameBloomPass.resolution.set(window.innerWidth, window.innerHeight);
    }
}

export function render() {
    if (gameState.settings.bloomEnabled) {
        initGameComposer();
        if (gameComposer) {
            gameComposer.render();
            return;
        }
    }
    renderer.render(scene, camera);
}

export function getGround() {
    return ground;
}
