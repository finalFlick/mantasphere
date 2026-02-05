# Swarm AI Research Notes (Boids + Schooling)

These are **synthesized design notes** derived from the research PDFs in this folder. They are intended as a searchable reference for future implementation and design discussion, not as verbatim excerpts.

## Scope

This document focuses on **swarm intelligence**: how enemy groups move, react, split/reform, and scale to high counts without becoming unreadable or too expensive to simulate.

## Core Model: Boids

### The three rules

- **Separation**: avoid crowding neighbors (prevents clumping and jitter)
- **Alignment**: match heading/velocity of nearby agents (produces coherent flow)
- **Cohesion**: move toward local center of mass (keeps schools together)

### Practical tuning guidance

- **Start separation-first**: without it, cohesion collapses into a “ball.”
- **Limit acceleration / turn rate**: readable motion comes from inertia, not instant direction changes.
- **Use neighborhood radius + max neighbors**: stability and performance both improve with hard caps.
- **Blend with per-enemy goals**: boids steering is a layer, not the whole brain (e.g., “chase player” + “stay in school”).

## Predator–Prey Dynamics (Player as Predator)

### Confusion effect

Large groups can be harder to “read” as targets. For design, the implication is:

- Swarms can feel threatening **without** every unit needing high DPS.
- The player’s threat can come from **positioning pressure** and **encirclement risk**.

### Responsive swarm reactions (player-triggered)

- **Flash expansion**: school rapidly expands outward (e.g., when the player dashes through or triggers an AoE), then reforms.
- **Fountain effect**: school parts around a fast-moving threat (player dash / boss charge), creating a transient “corridor” that closes after passage.

## Evasive Maneuvers (High-level Behaviors)

These behaviors layer on top of boids to create “smart swarm” moments:

- **Vacuole formation**: a donut-shaped ring that holds “just out of reach” before closing; creates tense near-surround moments.
- **Split and reunion**: a group deliberately divides into subgroups to flank, then recombines after a timer/condition.
- **Compaction (bait ball)**: swarm tightens into a dense rotating cluster around a valuable target or “core,” encouraging AoE/pierce solutions.

## Swarm State Machine (“Mood”)

Boids alone can look like passive fish schooling. Adding a simple, explicit state layer makes the swarm *gameplay-legible*:

- **cruising**: cohesive flow, spacing preserved
- **evading**: increased separation, higher lateral movement, break formation
- **attacking**: goal vector dominates (pressure/close distance), spacing relaxes slightly
- **reforming**: cohesion increases until a school re-stabilizes

Design hooks that can drive transitions:

- Player enters a proximity threshold
- Player performs a dash / AoE / burst-damage spike
- School leader dies (or intentionally “signals” a split)
- Wave event triggers an encirclement sequence

## Performance & Neighbor Queries

### Spatial hashing (grid)

To support 50–100+ enemies, neighbor search should avoid O(N²):

- Partition space into fixed-size cells
- Insert each agent into a cell each frame (or when it moves)
- For an agent, query only its cell and adjacent cells

Key knobs:

- **cell size**: roughly neighborhood radius
- **max neighbors**: hard cap to keep worst-case bounded
- **update rate**: optionally update boids vectors every N frames for distant/low-priority agents

### Budgeting heuristics

- **Distance-based LOD**: update full boids for nearby groups; simplified steering for far groups.
- **School-level steering**: compute a shared “school vector” once, then apply small per-agent offsets.
- **Temporal staggering**: update different schools on alternating frames.

## Implementation Notes (MantaSphere Constraints)

- **Three.js r134 via CDN**: `THREE` is global; design should assume r134-compatible APIs.
- **Object pooling**: favor pooled vectors/objects to avoid GC spikes with large swarms.
- **Avoid per-frame allocations**: reuse temp vectors, arrays, and lookup buffers.

## How This Maps to Current Code & Docs

- **Current documentation**: [docs/ENEMIES.md](../ENEMIES.md) describes today’s enemy behaviors and spawn system.
- **Existing foundations** (as referenced in earlier synthesis):
  - `SCHOOL_CONFIG` (school formation rules) in [js/config/constants.js](../../js/config/constants.js)
  - enemy–enemy separation force in `updateEnemies()` (see [js/entities/enemies.js](../../js/entities/enemies.js))

## Related Research Topics Elsewhere

- New enemy archetypes that exploit swarm behaviors: see [docs/research/ENEMY_DESIGN_RESEARCH.md](ENEMY_DESIGN_RESEARCH.md)
- Arena wave set-pieces built around swarm states: see [docs/research/ARENA_EVENT_CONCEPTS.md](ARENA_EVENT_CONCEPTS.md)

