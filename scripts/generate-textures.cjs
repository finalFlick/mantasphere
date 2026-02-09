#!/usr/bin/env node
/**
 * Deterministic procedural texture generator for assets/textures/.
 * Outputs: ground_sand_*, stone_seabed_*, wood_wreck_*, wood_wreck_512_*, vfx_energy_ring_rgba.
 * Use --force to overwrite existing files.
 */
const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');

const DEFAULT_OUT = 'assets/textures';
const PRESETS = ['ground', 'stone', 'wood', 'vfx'];

// --- Seeded PRNG (mulberry32) ---
function mulberry32(seed) {
    return function next() {
        let t = (seed += 0x6d2b79f5);
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

// --- Tileable value noise (wrap at w/h) ---
function noise2d(x, y, rand) {
    const xi = Math.floor(x) & 255;
    const yi = Math.floor(y) & 255;
    const xf = x - Math.floor(x);
    const yf = y - Math.floor(y);
    const u = xf * xf * (3 - 2 * xf);
    const v = yf * yf * (3 - 2 * yf);
    const aa = rand();
    const ab = rand();
    const ba = rand();
    const bb = rand();
    const x1 = aa + u * (ba - aa);
    const x2 = ab + u * (bb - ab);
    return x1 + v * (x2 - x1);
}

function fbm(x, y, rand, octaves = 4, lacunarity = 2, gain = 0.5) {
    let v = 0;
    let a = 0.5;
    let f = 1;
    for (let i = 0; i < octaves; i++) {
        v += a * noise2d(x * f, y * f, rand);
        a *= gain;
        f *= lacunarity;
    }
    return v;
}

// Tileable fbm: scale coords so [0..1] maps to [0..period]
function tileableFbm(ux, uy, period, rand, octaves = 4) {
    const x = ux * period;
    const y = uy * period;
    return fbm(x, y, rand, octaves, 2, 0.5);
}

function writePngSync(filePath, width, height, getPixel) {
    const png = new PNG({ width, height, filterType: -1 });
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const idx = (width * y + x) << 2;
            const [r, g, b, a] = getPixel(x, y);
            png.data[idx] = r;
            png.data[idx + 1] = g;
            png.data[idx + 2] = b;
            png.data[idx + 3] = a !== undefined ? a : 255;
        }
    }
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    return new Promise((resolve, reject) => {
        const out = fs.createWriteStream(filePath);
        out.on('finish', resolve);
        out.on('error', reject);
        png.pack().pipe(out);
    });
}

// --- Preset: ground_sand (1024) ---
function generateGroundSand(outDir, size, force, rand) {
    const period = 8;
    const files = [
        { name: 'ground_sand_albedo.png', gen: (w, h) => generateAlbedo(w, h, rand, period, 0xd4c7a6, 0x9c9c9c) },
        { name: 'ground_sand_normal.png', gen: (w, h) => generateNormalFromHeight(w, h, rand, period) },
        { name: 'ground_sand_orm.png', gen: (w, h) => generateOrm(w, h, rand, period, 0.9, 0) }
    ];
    return writePreset(outDir, size, force, files, rand);
}

function generateAlbedo(width, height, rand, period, baseHex, spotHex) {
    const base = [(baseHex >> 16) & 0xff, (baseHex >> 8) & 0xff, baseHex & 0xff];
    const spot = [(spotHex >> 16) & 0xff, (spotHex >> 8) & 0xff, spotHex & 0xff];
    return (x, y) => {
        const u = x / width;
        const v = y / height;
        const n = tileableFbm(u, v, period, rand, 4);
        const t = n * 0.5 + 0.5;
        const blend = t < 0.4 ? (t / 0.4) * 0.7 : 0.7 + (t - 0.4) * 0.3;
        const r = Math.round(base[0] * (1 - blend) + spot[0] * blend);
        const g = Math.round(base[1] * (1 - blend) + spot[1] * blend);
        const b = Math.round(base[2] * (1 - blend) + spot[2] * blend);
        return [r, g, b, 255];
    };
}

function heightField(width, height, rand, period) {
    const grid = [];
    for (let y = 0; y <= height; y++) {
        for (let x = 0; x <= width; x++) {
            const u = x / width;
            const v = y / height;
            grid.push(tileableFbm(u, v, period, rand));
        }
    }
    const get = (x, y) => {
        const ix = Math.min(Math.floor(x), width - 1);
        const iy = Math.min(Math.floor(y), height - 1);
        return grid[iy * (width + 1) + ix];
    };
    return get;
}

function generateNormalFromHeight(width, height, rand, period) {
    const h = heightField(width, height, rand, period);
    const scale = 4;
    return (x, y) => {
        const dx = (h(Math.min(x + 1, width), y) - h(Math.max(x - 1, 0), y)) * scale;
        const dy = (h(x, Math.min(y + 1, height)) - h(x, Math.max(y - 1, 0))) * scale;
        const len = Math.sqrt(dx * dx + dy * dy + 1);
        const nx = (dx / len) * 0.5 + 0.5;
        const ny = (-dy / len) * 0.5 + 0.5;
        const nz = (1 / len) * 0.5 + 0.5;
        return [Math.round(nx * 255), Math.round(ny * 255), Math.round(nz * 255), 255];
    };
}

function generateOrm(width, height, rand, period, roughBias, metalBias) {
    return (x, y) => {
        const u = x / width;
        const v = y / height;
        const n = tileableFbm(u, v, period, rand);
        const t = n * 0.5 + 0.5;
        const ao = Math.round((1 - t * 0.4) * 255);
        const rough = Math.round((roughBias * 0.9 + t * 0.1) * 255);
        const metal = Math.round(metalBias * 255);
        return [ao, rough, metal, 255];
    };
}

function writePreset(outDir, size, force, files, rand) {
    const promises = [];
    for (const { name, gen } of files) {
        const filePath = path.join(outDir, name);
        if (!force && fs.existsSync(filePath)) {
            console.log('Skip (exists):', name);
            continue;
        }
        const getPixel = gen(size, size);
        promises.push(
            writePngSync(filePath, size, size, getPixel).then(() => console.log('Wrote:', name))
        );
    }
    return Promise.all(promises);
}

// --- Preset: stone_seabed (1024) ---
function generateStoneSeabed(outDir, size, force, rand) {
    const period = 10;
    const files = [
        { name: 'stone_seabed_albedo.png', gen: (w, h) => generateAlbedo(w, h, rand, period, 0x3a4a55, 0x2a5a3a) },
        { name: 'stone_seabed_normal.png', gen: (w, h) => generateNormalFromHeight(w, h, rand, period) },
        { name: 'stone_seabed_orm.png', gen: (w, h) => generateOrm(w, h, rand, period, 0.95, 0) }
    ];
    return writePreset(outDir, size, force, files, rand);
}

// --- Preset: wood_wreck (1024 and 512) ---
function generateWoodWreck(outDir, size1024, size512, force, rand) {
    const period = 6;
    const base = 0x4a3520;
    const dark = 0x2a1810;
    const files = [
        { name: 'wood_wreck_albedo.png', size: size1024, gen: (w, h) => generateAlbedo(w, h, rand, period, base, dark) },
        { name: 'wood_wreck_normal.png', size: size1024, gen: (w, h) => generateNormalFromHeight(w, h, rand, period) },
        { name: 'wood_wreck_orm.png', size: size1024, gen: (w, h) => generateOrm(w, h, rand, period, 0.9, 0) },
        { name: 'wood_wreck_512_albedo.png', size: size512, gen: (w, h) => generateAlbedo(w, h, rand, period, base, dark) },
        { name: 'wood_wreck_512_normal.png', size: size512, gen: (w, h) => generateNormalFromHeight(w, h, rand, period) },
        { name: 'wood_wreck_512_orm.png', size: size512, gen: (w, h) => generateOrm(w, h, rand, period, 0.9, 0) }
    ];
    const promises = [];
    for (const { name, size, gen } of files) {
        const filePath = path.join(outDir, name);
        if (!force && fs.existsSync(filePath)) {
            console.log('Skip (exists):', name);
            continue;
        }
        const getPixel = gen(size, size);
        promises.push(
            writePngSync(filePath, size, size, getPixel).then(() => console.log('Wrote:', name))
        );
    }
    return Promise.all(promises);
}

// --- Preset: vfx_energy_ring_rgba (256) ---
function generateVfxEnergyRing(outDir, size, force, rand) {
    const filePath = path.join(outDir, 'vfx_energy_ring_rgba.png');
    if (!force && fs.existsSync(filePath)) {
        console.log('Skip (exists): vfx_energy_ring_rgba.png');
        return Promise.resolve();
    }
    const cx = size / 2;
    const cy = size / 2;
    const inner = size * 0.25;
    const outer = size * 0.45;
    const getPixel = (x, y) => {
        const dx = x - cx;
        const dy = y - cy;
        const r = Math.sqrt(dx * dx + dy * dy) / (size / 2);
        const ring = r >= inner / (size / 2) && r <= outer / (size / 2);
        const falloff = ring ? 1 - Math.abs(r - (inner + outer) / 2 / (size / 2)) * 3 : 0;
        const noise = rand() * 0.2 + 0.8;
        const alpha = Math.round(Math.max(0, Math.min(255, falloff * noise * 255)));
        const lum = Math.round(180 + rand() * 75);
        return [lum, lum, 255, alpha];
    };
    return writePngSync(filePath, size, size, getPixel).then(() => console.log('Wrote: vfx_energy_ring_rgba.png'));
}

// --- CLI ---
function parseArgs() {
    const args = process.argv.slice(2);
    let out = DEFAULT_OUT;
    let force = false;
    let only = null;
    let size = 1024;
    for (let i = 0; i < args.length; i++) {
        if (args[i] === '--out' && args[i + 1]) {
            out = args[++i];
        } else if (args[i] === '--force') {
            force = true;
        } else if (args[i] === '--only' && args[i + 1]) {
            only = args[++i];
        } else if (args[i] === '--size' && args[i + 1]) {
            size = parseInt(args[++i], 10) || 1024;
        }
    }
    return { out, force, only, size };
}

async function main() {
    const { out, force, only, size } = parseArgs();
    const outDir = path.resolve(process.cwd(), out);
    console.log('Output:', outDir, force ? '(overwrite)' : '(skip existing)');
    if (only && !PRESETS.includes(only)) {
        console.error('--only must be one of:', PRESETS.join(', '));
        process.exit(1);
    }

    const run = (name, fn) => {
        if (only && only !== name) return Promise.resolve();
        const rand = mulberry32(name.split('').reduce((s, c) => s + c.charCodeAt(0), 0));
        return fn(outDir, size, force, rand);
    };

    await run('ground', (dir, sz, f, r) => generateGroundSand(dir, sz, f, r));
    await run('stone', (dir, sz, f, r) => generateStoneSeabed(dir, sz, f, r));
    await run('wood', (dir, sz, f, r) => generateWoodWreck(dir, sz, Math.min(512, sz), f, r));
    await run('vfx', (dir, sz, f, r) => generateVfxEnergyRing(dir, 256, f, r));

    console.log('Done.');
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
