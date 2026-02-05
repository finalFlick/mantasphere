# Challenge & Difficulty Research Notes (Mutators + Danger Tiers)

These are **synthesized design notes** derived from the research PDFs in this folder. They are intended as a searchable reference for future implementation and design discussion, not as verbatim excerpts.

## Scope

This document focuses on endgame engagement systems:

- configurable mutators (“curses”)
- sequential difficulty tiers (Danger-style progression)
- seeded daily/weekly challenges
- scoring/leaderboard considerations

## Customizable Curse System (Mutator Menu)

Rather than a small set of fixed modes, the research favors a **catalog of individual modifiers** that can be toggled and stacked.

Design intent:

- high replay variety via combinations
- player-chosen challenge shape (more enemies vs less healing vs harder bosses)
- clear reward scaling (“Heat” style)

## Mutator Catalog (Families)

### Enemy stat modifiers

- +HP%
- +damage%
- +speed%

### Spawn modifiers

- +enemy count / density
- increased elite frequency
- additional boss adds / multi-boss events

### Player restrictions

- reduced or disabled healing
- fewer draft choices
- disabled dash / reduced mobility
- disabled active ability

### Environmental modifiers

- shrinking safe zone
- periodic hazard bombing
- reduced visibility / darkness

### Starting-condition modifiers

- start at higher level with randomized kit
- start at later arena
- reduced starting HP

### Rule changes

- enemies explode on death
- enemies project auras
- projectile rules change (curving, short-lived, etc.)

Guidance:

- Keep each mutator’s effect **single-sentence explainable**.
- Prefer modifiers that change decisions and movement, not just multipliers.

## Sequential Danger Tiers

Instead of “Easy/Normal/Hard,” tiers are unlocked in order:

- Clear Danger N to unlock Danger N+1
- Each tier adds one or more stacked modifiers
- Optional per-character tracking (“highest Danger cleared”)

Benefits:

- prevents accidental selection of an impossible difficulty
- creates a clear mastery ladder
- provides long-term goals without new content

## Daily / Weekly Challenges (Seeded Runs)

Seeded challenges emphasize fair competition:

- same seed ⇒ same run structure for everyone
- curated set of mutators (2–4) per day/week
- separate leaderboard from standard runs

Common gating:

- unlock after reaching a certain arena so new players aren’t hit with complex modifiers too early

## Scoring Ideas (Beyond Survival)

To keep runs interesting for leaderboard players:

- hitless boss bonuses
- kill-combo chains
- speed bonuses (wave/arena clear time under par)
- build diversity bonuses (optional; can be controversial)
- post-run breakdown of scoring sources (teaches optimization)

## Endless / Chaos Mode

An infinite wave mode (typically post-final arena) with:

- escalating intensity over time
- separate leaderboard
- careful pacing so it remains fun, not purely exhausting

## Related Docs

- Current arena/wave progression: [docs/ARENA.md](../ARENA.md)
- Current leaderboard system: [js/systems/leaderboard.js](../../js/systems/leaderboard.js), [docs/PLAYTEST_FORM_GUIDE.md](../PLAYTEST_FORM_GUIDE.md) (for feedback, not scoring)

## Related Research Topics Elsewhere

- Boss patterns that are good mutator targets (bullet hell, summons): [docs/research/BOSS_DESIGN_RESEARCH.md](BOSS_DESIGN_RESEARCH.md)
- Progression systems that interact with difficulty (shops, meta upgrades): [docs/research/PROGRESSION_AND_ECONOMY.md](PROGRESSION_AND_ECONOMY.md)

