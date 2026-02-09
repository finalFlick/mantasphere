# Game Assets

## Texture assets (`assets/textures/`)

Game textures are loaded at startup by `js/systems/textures.js` and applied to ground, castle, shipwreck, and VFX. All paths are relative to the project root (e.g. `assets/textures/ground_sand_albedo.png`).

### Texture inventory

| File | Type | Three.js usage | Where used |
|------|------|----------------|------------|
| `ground_sand_albedo.png` | Albedo | `material.map` | Arena ground plane |
| `ground_sand_normal.png` | Normal | `material.normalMap` | Arena ground plane |
| `ground_sand_orm.png` | ORM | `aoMap`, `roughnessMap`, `metalnessMap` | Arena ground plane |
| `stone_seabed_albedo.png` | Albedo | `material.map` | Castle stone, ruins |
| `stone_seabed_normal.png` | Normal | `material.normalMap` | Castle, ruins |
| `stone_seabed_orm.png` | ORM | packed maps | Castle, ruins |
| `wood_wreck_albedo.png` | Albedo | `material.map` | Shipwreck hull, mast, crates |
| `wood_wreck_normal.png` | Normal | `material.normalMap` | Shipwreck |
| `wood_wreck_orm.png` | ORM | packed maps | Shipwreck |
| `wood_wreck_512_albedo.png` | Albedo (512) | `material.map` | Optional: small wood props |
| `wood_wreck_512_normal.png` | Normal (512) | `material.normalMap` | Optional |
| `wood_wreck_512_orm.png` | ORM (512) | packed maps | Optional |
| `vfx_energy_ring_rgba.png` | RGBA | `material.map` + alpha | VFX rings (telegraph, vine zone, etc.) |

### Map types

- **Albedo** — Base color. Used as `material.map`. sRGB. Tiling: `RepeatWrapping` + `repeat` set per surface size.
- **Normal** — Tangent-space normals. Used as `material.normalMap`. Linear (no sRGB). Same wrap/repeat as albedo.
- **ORM** — Single texture: **R** = Ambient Occlusion, **G** = Roughness, **B** = Metalness. Same texture is assigned to `material.aoMap`, `material.roughnessMap`, `material.metalnessMap`. Set `material.roughness = 1` and `material.metalness = 1` so the maps drive the values. Linear. **AO requires geometry to have a `uv2` attribute** (clone of `uv`); the loader provides `ensureUv2(geometry)`.
- **RGBA** — Color + alpha for transparent effects. Used as `material.map` with `transparent: true`; alpha channel for soft edges/rings.

### Loader

- **Module:** `js/systems/textures.js`
- **Init:** Call `await initTextures(renderer)` after `initScene()` and before `createGround()` (see `js/main.js`).
- **API:** `Textures.groundSand`, `Textures.stoneSeabed`, `Textures.woodWreck`, `Textures.vfxEnergyRing` (each with `albedo`, `normal`, `orm` where applicable). Helpers: `setTiling(tex, x, y)`, `applyPbr(material, set, options)`, `applyOrm(material, ormTex)`, `ensureUv2(geometry)`.
