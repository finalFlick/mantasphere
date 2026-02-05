# Enemy Design Research Notes (Swarm Tactics + Archetypes)

These are **synthesized design notes** derived from the research PDFs in this folder. They are intended as a searchable reference for future implementation and design discussion, not as verbatim excerpts.

## Scope

This document focuses on **enemy archetypes** and **group tactics** that create readable pressure in an auto-shooter: “smart swarm” behavior without heavy per-agent AI.

## Group Movement Patterns (Readable Threat Shapes)

- **Zerg rush**: a broad front that collapses toward the player; strong early teaching tool.
- **Flocking / clustering**: cohesive groups that flow around obstacles and each other.
- **Encirclement**: partial or full ring pressure; forces escape-route identification.
- **Leader–follower packs**: a small number of leaders define shape; followers inherit intent.
- **Orbital strafing**: enemies circle at a radius and tighten over time; creates “pressure spirals.”

## Coordinated Attacks (Tactics Without Complexity)

### Baton charge system (token passing)

Instead of “everyone rushes,” only 1–2 members in a group are allowed to charge at a time:

- Reduces unfair spike damage
- Makes attacks more telegraphable
- Creates a pattern the player can learn and exploit

### Runtime flanking / pincer

Not just a spawn-time pincer—some subset of enemies detects “overcommit on one side” and repositions to the opposite side.

### Leader buff aura

Leaders grant a simple aura (speed, damage, aggression) to followers in range.

- Killing the leader creates a clear “relief” moment
- Supports “target priority” teaching

## Swarm-Themed Enemy Archetypes (Concept Catalog)

These concepts are designed to slot into the existing config-driven enemy system (see [docs/ENEMIES.md](../ENEMIES.md)).

### Treasure carrier (“Gold Puffer”)

- **Role**: fleeing objective / risk-reward chase
- **Behavior**: tries to escape; minimal offense; draws attention away from the main wave
- **Reward**: XP cache / currency / temporary buff
- **Design note**: ensure it’s visually distinct and communicates “optional target”

### Area-denial trapper

- **Role**: territory control
- **Behavior**: drops hazards (puddles/mines) that shape routing
- **Pressure**: “soft walls” that make encirclement more dangerous

### Buffer / leader (“Alpha Puffer”)

- **Role**: swarm amplifier
- **Behavior**: stays near a school; provides aura; may “signal” group state changes (split/reform)
- **Counterplay**: focus fire → school destabilizes

### Charger (“Spearhead”)

- **Role**: burst pressure and dodge test
- **Behavior**: telegraphed straight-line dash from the periphery; high speed, low steering
- **Counterplay**: dodge lane; punish recovery window

## Elite Variants & Modifiers

Elite enemies become interesting when “elite-ness” is **legible** and **pattern-based**, not just raw stats.

- **Aura elites**: broadcast an aura that changes nearby enemies (speed-up, damage-up, shielding)
- **Behavioral elites**: unlock a specific tactic (e.g., always orbits, always baton-charges)
- **Swarm elites**: become the “core” of a bait ball or anchor an encirclement event

## Design Guidance for Readability

- **Telegraph first, punish second**: coordinated tactics should announce themselves.
- **One new idea at a time**: introduce a tactic in isolation before mixing it into general waves.
- **Counterplay clarity**: ensure there’s a simple answer (break leader, dodge lane, escape weak point).

## How This Maps to Current Code & Docs

- Current enemy roster and behaviors are documented in [docs/ENEMIES.md](../ENEMIES.md).
- Enemy type data lives in [js/config/enemies.js](../../js/config/enemies.js) (including roster display fields like `tagline`, `description`, `behaviorText`).

## Related Research Topics Elsewhere

- Swarm primitives (boids, spatial hashing, evasive maneuvers): [docs/research/SWARM_AI.md](SWARM_AI.md)
- Arena set-pieces that teach these tactics: [docs/research/ARENA_EVENT_CONCEPTS.md](ARENA_EVENT_CONCEPTS.md)

