# Arena Event Concepts Research Notes (Swarm Set-Pieces + Environment)

These are **synthesized design notes** derived from the research PDFs in this folder. They are intended as a searchable reference for future implementation and design discussion, not as verbatim excerpts.

## Scope

This document focuses on **arena-level set-pieces**: wave events and environmental mechanics that teach one idea at a time and then remix it later.

## Swarm Wave Events (Per-Arena Teaching Moments)

Each concept is intended to be a short, readable “chapter” inside an arena—something the player recognizes and learns from.

### Arena 1: Gentle swarm gauntlet

- A large school enters in formation from one side.
- Teaches: groups have **gaps**; weaving is possible; movement is power.

### Arena 2: Encirclement escape

- A ring of defensive enemies spawns around the player.
- One segment is weaker or slower.
- Teaches: **find the weak point**; prioritize targets; don’t panic.

### Arena 3: Vertical swarm split

- Pressure from above and below (two-layer threat).
- Teaches: vertical awareness and repositioning under dual-front pressure.

### Arena 4: Bouncer bait ball (reward core)

- Fast units form a tight orbit around a reward (XP/cache).
- Teaches: AoE vs single-target; timing the break; commit-or-ignore decisions.

### Arena 5: Corridor pincer

- Split pressure from both ends of a tunnel/corridor.
- Teaches: “choose a direction,” manage space, and break through decisively.

### Arena 6: Chaos murmuration

- A spectacle wave where enemies flow as one shifting super-school.
- Teaches: synthesis—movement + target priority + space control under maximum density.

## Environmental Mechanics (Concept Menu)

These mechanics are useful as “one new variable per arena” design tools:

- **Dynamic hazard zones**: moving or pulsing danger areas that shape positioning.
- **Moving safe zones**: inverted hazards; forces continuous repositioning.
- **Player-triggered traps**: risk-reward activations (pull enemies into hazards).
- **Breakable cover**: temporary safety that becomes unreliable under pressure.
- **Shifting layouts**: rotating walls/platforms that change routes mid-wave.
- **Environmental weapons**: limited-use power moments that reward situational awareness.
- **Roaming neutral hazards**: an independent threat that herds both player and enemies.

## Arena Identity (Why Events Matter)

Events should reinforce what the arena “is about”:

- geometry (verticality, tunnels, platforms)
- featured enemy behaviors
- the skill being taught (cover use, escape routes, timing, movement lanes)

## How This Maps to Current Code & Docs

- Arena progression + wave system is documented in [docs/ARENA.md](../ARENA.md).
- Arena generation lives in [js/arena/generator.js](../../js/arena/generator.js).
- Wave progression system lives in [js/systems/waveSystem.js](../../js/systems/waveSystem.js).

## Related Research Topics Elsewhere

- Swarm primitives (boids, split/reform, bait ball): [docs/research/SWARM_AI.md](SWARM_AI.md)
- Enemy archetypes that fit these events (chargers, trappers, leaders): [docs/research/ENEMY_DESIGN_RESEARCH.md](ENEMY_DESIGN_RESEARCH.md)

