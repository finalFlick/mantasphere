# Progression & Economy Research Notes (Mid-Run + Meta)

These are **synthesized design notes** derived from the research PDFs in this folder. They are intended as a searchable reference for future implementation and design discussion, not as verbatim excerpts.

## Scope

This document focuses on progression systems that drive replayability:

- **Mid-run progression** (shops, rewards, drafting controls)
- **Meta progression** (persistent upgrades, unlock trees, content discovery)
- **Character variety** (unlockable characters and loadouts)

## Mid-Run Shop System (Run-Level Strategy Layer)

### Placement options

- **Between arenas**: simpler cadence, less UI interruption.
- **Between waves**: higher strategic density; must be tuned to avoid slowing early loops.
- **Post-boss reward shop**: a “special shop” moment with higher-tier offerings.

### Economy inputs (currency candidates)

- Dedicated currency drop (coins)
- Wave-clear bonuses
- Converting a portion of XP overflow into spendable currency

### Inventory and scaling

- Small random set of items per shop visit
- Tier gating by arena to prevent early cognitive overload
- Optional mechanics:
  - reroll (pay cost / limited uses)
  - lock (hold an item for the next shop)

### UX constraints

- Keep early game fast: shop should be skippable and quick to parse.
- Surface “why this is good” with compact stat deltas and tags.

## Persistent Upgrades (Meta Progress)

The research emphasizes small, capped, permanent boosts:

- modest stat bumps (damage, HP, move speed)
- bounded so early arenas remain teachable and fair

Design guidance:

- Make meta progression feel like **option expansion**, not mandatory power inflation.
- Consider a “pure run” toggle where persistent boosts are disabled.

## Unlock Trees (Visual Roadmap)

An unlock tree provides:

- clear long-term goals
- a sense of discovery pacing (complexity increases as mastery increases)

Suggested structure:

- **basic nodes**: small stat improvements
- **milestone nodes**: unlock new mechanics, upgrade tags, shop options, characters

## Unlockable Characters & Loadouts

Character variety is a high-leverage replay driver:

- Each character has clear identity: stat modifiers + a signature passive
- Unlock conditions tied to achievements (boss clears, score thresholds, build challenges)

Design caution:

- Ensure characters are “different, not strictly better.”
- Avoid too many characters early; grow roster over time.

## Content Discovery (Keep Early Runs Clean)

Key pacing principle:

- Start with a smaller, comprehensible pool.
- Unlock deeper systems (more upgrades, synergies, exotics) as the player demonstrates mastery.

## Ability Swaps (Late-Run Pivoting)

To prevent early choices from hard-locking a run:

- When ability slots are full, new offers can be swaps/replacements.
- Allow players to opt out of further ability offers if satisfied.

## Related Docs

- Current player and progression behavior: [docs/PLAYER.md](../PLAYER.md)
- Current upgrades and modules: [js/config/upgrades.js](../../js/config/upgrades.js), [js/config/modules.js](../../js/config/modules.js)
- Current UI entry points: [js/ui/menus.js](../../js/ui/menus.js), [js/ui/modulesUI.js](../../js/ui/modulesUI.js)

## Related Research Topics Elsewhere

- Synergies and evolutions (combo depth): [docs/research/BUILD_AND_SYNERGY_SYSTEMS.md](BUILD_AND_SYNERGY_SYSTEMS.md)
- Difficulty/challenges that remix progression (Danger tiers, mutators): [docs/research/CHALLENGE_AND_DIFFICULTY.md](CHALLENGE_AND_DIFFICULTY.md)

