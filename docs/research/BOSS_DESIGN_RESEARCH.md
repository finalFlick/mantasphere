# Boss Design Research Notes (Archetypes + Fair Difficulty)

These are **synthesized design notes** derived from the research PDFs in this folder. They are intended as a searchable reference for future implementation and design discussion, not as verbatim excerpts.

## Scope

This document focuses on **boss patterns** that create “puzzle tests” (skill and build checks) rather than pure HP sponges.

## Pattern Catalog

### Summoner / crowd-control test

**Intent**: test AoE, target priority, and space control under pressure.

Design levers:

- Summon cadence (periodic vs phase-triggered)
- Minion type selection (fodder, shielded, shooters)
- Summon location (around boss, around player, from arena edges)
- “Break windows” where the boss pauses summons to let players recover

### DPS check / enrage (soft preferred)

**Intent**: add time pressure and prevent purely defensive stall strategies.

Guidance:

- Prefer **soft enrages** (new attack pattern, faster cadence, more hazards) over “instant fail.”
- Telegraph that the phase is timed (audio/visual cues, countdown feel).
- Let different builds solve it differently (burst, sustained, survivability with movement).

### Adaptive mechanics (build-aware)

**Intent**: keep late-game interesting by reacting to player specialization.

Options (ordered by risk to fairness):

- **Light adaptation**: temporary resistance to the player’s dominant damage pattern; avoid invalidating entire builds.
- **Behavioral adaptation**: counters common player behaviors (e.g., punishes staying close or staying far) without touching stats.
- **High-risk adaptation**: “steal power” style mechanics; use sparingly and with strong telegraphing.

### Bullet hell geometry patterns

**Intent**: test movement skill, not just damage output.

Common shapes:

- Expanding rings
- Spirals / rotating fans
- Lines / sweeping walls
- Staggered bursts (rhythmic dodge)

Readability guidance:

- Keep a consistent “grammar” per boss (players learn the language).
- Ensure safe lanes exist and are discoverable.

### Build exam (final boss synthesis)

**Intent**: the final encounter validates learned skills by combining earlier lessons.

Approach:

- Each phase focuses on a prior mechanic (cover, verticality, corridor control, swarm pressure).
- The boss should escalate in **complexity**, not just damage.

## Phase Design Best Practices (Fairness + Teaching)

- **Phase 1**: teach the core mechanic with generous telegraphs.
- **Phase 2**: add an arena twist or combination, reduce downtime.
- **Phase 3**: pressure test—faster cadence, tighter windows, but still learnable.

Common knobs:

- Telegraph time scaling per phase
- Cooldown reduction per phase
- Ability weights shifting toward signature moves
- Combo chains unlocked in later phases

## How This Maps to Current Code & Docs

- Current boss system design is documented in [docs/BOSS.md](../BOSS.md).
- Boss configurations live in [js/config/bosses.js](../../js/config/bosses.js).
- Boss runtime behavior is implemented in [js/entities/boss.js](../../js/entities/boss.js).

## Related Research Topics Elsewhere

- Arena set-pieces that “teach” a boss mechanic before the fight: [docs/research/ARENA_EVENT_CONCEPTS.md](ARENA_EVENT_CONCEPTS.md)
- Difficulty systems that remix bosses (mutators, Danger tiers): [docs/research/CHALLENGE_AND_DIFFICULTY.md](CHALLENGE_AND_DIFFICULTY.md)

