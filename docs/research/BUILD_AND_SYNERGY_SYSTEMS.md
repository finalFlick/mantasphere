# Build & Synergy Systems Research Notes

These are **synthesized design notes** derived from the research PDFs in this folder. They are intended as a searchable reference for future implementation and design discussion, not as verbatim excerpts.

## Scope

This document focuses on **build depth**: systems that make upgrade choices feel strategic, create recognizable archetypes, and enable “combo moments” that players can plan toward.

## Synergies (Combo Upgrades)

### Prerequisite combos (A + B unlocks C)

Concept:

- When the player holds upgrades **A** and **B**, the draft pool can surface a synergy upgrade **C**.
- Synergy upgrades should be clearly marked (iconography / color / label) so players learn to “hunt” them.

Design constraints:

- Keep the number of synergy lines per run small enough to remain readable.
- Prefer synergy upgrades that change *behavior*, not just stats (more memorable).

### Evolutions (max-rank + catalyst)

Concept:

- When an upgrade reaches max rank, a specific catalyst upgrade (or shop/boss reward trigger) can evolve it into a stronger, more distinctive version.

Guidance:

- Trigger evolutions at **clear moments** (boss reward, shop visit) rather than randomly mid-wave.
- Make evolution conditions discoverable (tooltips, codex/roster-style reveal).

## Scaling Passives & Stacking Effects

These create “snowball” identity and reward specialization:

- **On-kill chains**: effects that propagate through nearby enemies; great for swarm-heavy waves.
- **Missing-HP scaling**: berserker bonuses that shift risk/reward as health drops.
- **Investment scaling**: effects that grow with rank or with repeated trigger events.

Design caution:

- Cap stacking where necessary; avoid runaway unbounded multipliers.
- Make the “shape” of growth understandable (linear, stepwise thresholds).

## Triggered Effects (Conditional Skills)

Upgrade effects can be framed as event-driven triggers:

- on kill
- on critical hit
- on dodge / dash
- on taking damage
- on status applied

Design intent:

- Creates “moment-to-moment texture” beyond steady DPS increases.
- Encourages varied playstyles (mobility builds, crit builds, retaliation builds).

## Trade-off (Exotic) Upgrades

Occasionally offer high-impact upgrades with a real downside:

- Glass cannon style: big damage, reduced survivability
- Overclock style: faster fire rate, reduced projectile lifetime / accuracy / stability

Guidance:

- Make downsides explicit and immediate (no hidden penalties).
- Keep rarity low so the run doesn’t become a pile of unreadable exceptions.

## Draft Pool Control (Choice Quality)

To preserve agency as content expands:

- **Reroll**: redraw options at a cost or limited token count.
- **Banish**: remove an option from the pool for the run.
- **Skip**: decline a level-up (optionally with small compensation) to avoid diluting a focused build.

## Build Archetypes (Recognition)

Define a small set of recognizable “lanes” that upgrades naturally reinforce:

- DPS / fire-rate / precision
- Tank / shield / sustain
- Speed / dash / reposition
- AoE / chain / status

These archetypes become more powerful when supported by:

- synergy lines (combo upgrades)
- badges/achievements (mastery signals)
- character starting traits (see progression notes)

## Architecture Notes (If/When Implemented)

The research patterns map well to a data-driven approach:

- Add synergy definitions to upgrade config (prerequisites → unlock)
- Use an event-style trigger mechanism so new effects don’t require editing the main loop each time
- Tag upgrades with themes (`fire`, `speed`, `defense`, `AoE`) so synergies can target categories

## Related Docs

- Current player + upgrade behavior: [docs/PLAYER.md](../PLAYER.md)
- Current upgrade definitions: [js/config/upgrades.js](../../js/config/upgrades.js)
- Level-up draft UI/flow: [js/ui/menus.js](../../js/ui/menus.js)

