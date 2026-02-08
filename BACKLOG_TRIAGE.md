# GitHub Backlog Triage Report
**Generated:** 2026-02-05  
**Milestone Focus:** Arena 1 polish (default)  
**Reviewer:** Technical PM (Backlog Triage)

---

## A) Clarifying Questions

None. All issues have sufficient context for prioritization and execution.

---

## B) Triage Summary

- **Total issues reviewed:** 20 (all open)
- **Duplicates merged:** 0 (no duplicates found)
- **Issues closed as "won't do / not now":** 0 (all issues are valid)
- **New issues suggested:** 0 (backlog is comprehensive)

**Scope Boundaries Applied:**
- Issues #64, #65, #66 (Swarm AI milestone) → P3 (future content, not Arena 1 polish)
- Issue #36 (Arena Expansion) → P3 (future content)
- All other issues remain at current priority or adjusted per playtest bias

---

## C) Label System

**Canonical Label Taxonomy** (per CONTRIBUTING.md):

### Priority (Required)
- `priority:P0` - Ship blocker, must fix before release
- `priority:P1` - High priority, next sprint
- `priority:P2` - Medium, schedule when time allows
- `priority:P3` - Future/experimental, backlog

### Type (Required)
- `type:bug` - Something broken
- `type:feature` - New functionality
- `type:tuning` - Balance/numbers adjustment
- `type:ux` - Usability/readability improvement
- `type:chore` - Maintenance/cleanup (not in issues yet, but valid)
- `type:tech-debt` - Code quality/architecture (not in issues yet, but valid)

### Area (Required - at least one)
- `area:player` - Player movement, combat, stats
- `area:enemy` - Enemy types, AI, spawning
- `area:boss` - Boss fights, phases, abilities
- `area:arena` - Level geometry, hazards, transitions
- `area:ui` - HUD, menus, screens
- `area:meta` - Progression, leaderboards, badges
- `area:audio` - Music, SFX (not in issues yet, but valid)
- `area:perf` - Performance optimization (not in issues yet, but valid)
- `area:swarm` - Swarm/schooling behaviors (existing, keep)

### Status (Recommended)
- `status:needs-spec` - Missing acceptance criteria or implementation details
- `status:ready` - Ready to implement
- `status:blocked` - Blocked by another issue
- `status:in-progress` - Currently being worked on

### Effort (Recommended)
- `effort:XS` - <1 hour (not in taxonomy, but useful)
- `effort:S` - ~1-2 hours
- `effort:M` - ~1 day
- `effort:L` - ~2-3 days
- `effort:XL` - ~1 week+

### Risk (New - add if needed)
- `risk:low` - Low risk of regression or complexity
- `risk:med` - Moderate risk
- `risk:high` - High risk, needs careful testing

### Special Tags
- `playtest` - Derived from playtest feedback (applies scoring bias)

---

## D) Prioritized Queue (Top 10)

### 1. Lives & Checkpoint System (#52)
**Priority:** P0 | **RICE:** (100% × 5 × High) / M = **500** | **WSJF:** High  
**Effort:** M | **Risk:** Med  
**Why now:**
- Ship blocker for Arena 1 polish (Core Systems milestone)
- Reduces frustration from instant permadeath (Fast Loops pillar)
- Enables learning through retries (Progressive Complexity)

**Dependencies:** None  
**Acceptance Criteria:**
- Default 3 lives (tunable in config)
- Death restarts current arena cleanly (reset wave, enemies, pickups)
- UI shows remaining lives (hearts or counter in HUD)
- Game over only when all lives exhausted
- Lives persist across arena transitions

**Quick Test Plan:**
1. Start game, verify 3 lives shown in HUD
2. Die intentionally, verify arena restarts and lives decremented
3. Die 3 times, verify game over screen
4. Beat arena, verify lives carry to next arena

**Notes:** Debug tuning already available (TUNING.playerStartingLives). Production implementation needed.

---

### 2. Difficulty Modes (#51)
**Priority:** P0 | **RICE:** (100% × 5 × High) / M = **500** | **WSJF:** High  
**Effort:** M | **Risk:** Low  
**Why now:**
- Ship blocker for Core Systems milestone
- Expands audience (casual + hardcore) without breaking core loop
- Data-driven tuning enables rapid iteration

**Dependencies:** None  
**Acceptance Criteria:**
- Difficulty selectable before starting game (Easy/Normal/Hard/Nightmare)
- Difficulty persists between sessions
- All tuning values read from config (no hardcoded numbers)
- Leaderboard shows difficulty alongside score
- Difficulty cannot be changed mid-run

**Quick Test Plan:**
1. Start game, verify difficulty selector on menu
2. Select Hard, start game, verify enemies tougher
3. Close/reopen game, verify difficulty remembered
4. Complete run, verify difficulty shown on leaderboard entry

**Notes:** Debug tuning available (TUNING.difficultyMultiplier). Full difficulty mode implementation needed. Danger Ladder system (from comments) is out of scope for MVP.

---

### 3. Off-Screen Enemy Spawns Cause Unfair Hits (#31)
**Priority:** P1 | **RICE:** (80% × 4 × High) / M = **320** | **WSJF:** High  
**Effort:** M | **Risk:** Low  
**Why now:**
- Playtest-derived (strong evidence: "enemies I didn't see coming from behind")
- Violates Fairness pillar (deaths must be explainable)
- Blocks Progressive Complexity (player can't perceive-decide-act)

**Dependencies:** None  
**Acceptance Criteria:**
- Rear-spawn hits become rare (ideally <10% of deaths attributed to spawns)
- OR player has clear warning before off-screen enemies can hit them
- Spawn bias prefers player's forward 180° arc
- Minimum spawn distance enforced (especially behind player)

**Quick Test Plan:**
1. Play Arena 1, intentionally face away from spawn points
2. Verify enemies rarely spawn directly behind player
3. If warnings added: verify off-screen indicators appear
4. Track deaths: <10% should be from rear spawns

**Notes:** Debug tuning available (TUNING.spawnSafeZoneRadius, TUNING.offScreenWarningEnabled). Implement at least one solution (spawn bias OR warning).

---

### 4. Game Pace Feels Too Fast (#30)
**Priority:** P1 | **RICE:** (80% × 4 × High) / M = **320** | **WSJF:** High  
**Effort:** M | **Risk:** Low  
**Why now:**
- Playtest-derived (strong evidence: "2x speed" perception)
- Affects every second of play (magnifies other issues)
- Tension between Fast Loops (short sessions) and Progressive Complexity (readable decisions)

**Dependencies:** None  
**Acceptance Criteria:**
- Players experience 2-3 clear micro-breathing moments per wave
- Pacing feels intense but readable (less "2x speed" perception)
- Session length stays unchanged or shorter
- Spawn pauses after clearing ~50% of wave (1-2s)

**Quick Test Plan:**
1. Play Arena 1, track breathing room moments
2. Verify spawn pauses occur mid-wave
3. Verify pacing feels readable (not frantic)
4. Measure session length (should not increase)

**Notes:** Debug tuning available (TUNING.breathingRoomSeconds, TUNING.stressPauseThreshold). Smallest-first: breathing beats, then spawn rate, then enemy speed.

---

### 5. Dash Ability Not Discoverable (#34)
**Priority:** P1 | **RICE:** (70% × 3 × High) / S = **630** | **WSJF:** Very High  
**Effort:** S | **Risk:** Low  
**Why now:**
- Playtest-derived (tester couldn't figure out dash)
- Fast Loops pillar issue (core mechanic must be discoverable quickly)
- Every death to "didn't know dash existed" is wasted (violates explainable deaths)

**Dependencies:** None  
**Acceptance Criteria:**
- Dash control visible somewhere in UI at all times
- New player can discover dash within 30 seconds of starting
- Dash keybind shown in HUD or pause menu controls section

**Quick Test Plan:**
1. Start fresh game (new player simulation)
2. Within 30 seconds, verify dash control is visible in UI
3. Test dash keybind visibility in: main game HUD, pause menu controls section
4. Verify dash hint does not clutter combat visibility

**Notes:** Small effort, high impact. Add persistent HUD indicator or pause menu controls section.

---

### 6. Boss Phase Progression Redesign (#50)
**Priority:** P1 | **RICE:** (60% × 4 × High) / M = **240** | **WSJF:** High  
**Effort:** M | **Risk:** Med  
**Why now:**
- Playtest-derived (bosses feel too hard too fast)
- Boss Puzzles pillar (bosses must teach before testing)
- Core to Arena 1 polish (boss is the capstone)

**Dependencies:** None  
**Acceptance Criteria:**
- Each boss has documented 3-phase teaching flow (Phase 1: teach, Phase 2: remix, Phase 3: pressure)
- Phase 1 attack frequency reduced by 30-50% from current
- Phase transitions feel earned (HP thresholds clear)
- Players can identify "what hit them" for every attack

**Quick Test Plan:**
1. Fight each boss, note when you learn vs when you die
2. Deaths should feel "I know what I did wrong"
3. Phase 1 should feel like tutorial, Phase 3 like exam
4. Verify phase transitions have clear visual/audio cue

**Notes:** Playtest findings already in comments (base movement speed, telegraph extension). Document teach/test/mastery flow in docs/BOSS.md.

---

### 7. Boss Retreat/Return Mechanic Confusing (#32)
**Priority:** P2 | **RICE:** (50% × 3 × Med) / S = **225** | **WSJF:** Medium  
**Effort:** S | **Risk:** Low  
**Why now:**
- Playtest-derived (tester expected full HP reset)
- Boss Puzzles readability (phase transitions must be legible)
- Small effort, improves clarity

**Dependencies:** None  
**Acceptance Criteria:**
- Players understand boss HP persists across retreat/return
- Phase transitions communicated clearly (audio/visual)
- Boss HP bar visible (dimmed) during retreat
- When boss returns, HP bar flashes to draw attention

**Quick Test Plan:**
1. Fight Boss 1 (Puffer King) to trigger retreat
2. Observe HP bar during retreat - is it visible (dimmed)?
3. When boss returns, verify HP bar flashes and current HP is clear
4. Check with fresh tester: do they understand HP persists?

**Notes:** Debug tuning available (TUNING.retreatAnnouncementEnabled). Additional visual clarity may be needed.

---

### 8. Jump/Landing Feels Too Heavy (#33)
**Priority:** P2 | **RICE:** (40% × 2 × Med) / S = **160** | **WSJF:** Medium  
**Effort:** S | **Risk:** Low  
**Why now:**
- Playtest-derived (tester: "too heavy/slammed down")
- Game-feel issue (undermines manta ray fantasy)
- Small effort, improves moment-to-moment satisfaction

**Dependencies:** None  
**Acceptance Criteria:**
- Jump feels lighter and more "manta-like"
- Landing has smooth deceleration (no hard slam)
- Brief hover at jump apex (optional, but improves feel)

**Quick Test Plan:**
1. Jump repeatedly in safe area (no enemies)
2. Compare feel: graceful ascent, hover at apex, smooth landing
3. Test jump during combat - responsive under pressure?
4. Subjective check: matches 'manta ray fantasy' (floaty, graceful)?

**Notes:** Debug tuning available (TUNING.landingStunFrames). Reduce gravity multiplier, add deceleration curve.

---

### 9. Upgrade Choices: Fire Rate Dominates (#29)
**Priority:** P2 | **RICE:** (50% × 3 × Med) / M = **225** | **WSJF:** Medium  
**Effort:** M | **Risk:** Med  
**Why now:**
- Playtest-derived (tester: "attack rate is the go to")
- Visual Progression pillar (build diversity matters for replayability)
- Deepens build system without breaking core loop

**Dependencies:** None  
**Acceptance Criteria:**
- At least 2-3 distinct upgrade paths feel viable
- Players sometimes pick non-fire-rate upgrades first
- Build-defining upgrades compete with fire rate (pierce, bounce, explosions)

**Quick Test Plan:**
1. Play multiple runs, track first upgrade picks
2. Verify non-fire-rate upgrades are sometimes chosen first
3. Test build-defining upgrades (pierce, bounce) - do they feel competitive?
4. Verify upgrade pool has "attack enhancer" items (megabonk-style)

**Notes:** Research note in comments (Upgrade Draft Improvements: reroll/banish/skip). Keep MVP scope: buff alternatives, add tradeoffs, add build-defining upgrades.

---

### 10. XP Orbs Despawn Too Quickly (#28)
**Priority:** P2 | **RICE:** (40% × 2 × Med) / S = **160** | **WSJF:** Medium  
**Effort:** S | **Risk:** Low  
**Why now:**
- Playtest-derived (tester: "never despawn")
- Fast Loops vs Fairness tension (urgency vs unfair loss)
- Small QoL tuning change

**Dependencies:** None  
**Acceptance Criteria:**
- Players rarely lose significant XP to despawns during normal play
- Despawn still creates some routing urgency
- Timer extended from 15s → 20-25s OR proximity exception added

**Quick Test Plan:**
1. Start Arena 1, kill enemies to spawn XP orbs
2. Intentionally delay pickup (fight away from orbs)
3. Observe despawn timing - fair under combat pressure?
4. If visual countdown added: verify clear when orb about to despawn

**Notes:** Small effort, improves fairness. Extend timer or add proximity exception.

---

## E) Issue Rewrite Pack

### Lives & Checkpoint System (#52)
- **Original:** #52
- **Type/Area/Priority/Status/Effort/Risk:** `type:feature` | `area:player` | `priority:P0` | `status:ready` | `effort:M` | `risk:med`
- **Problem:** Death = full restart is punishing for new players learning mechanics. Instant permadeath wastes deaths on "didn't know mechanic" rather than "learned the pattern."
- **Goal:** Implement lives system (default 3) that allows retries within current arena without full restart, enabling learning through failure.
- **Non-goals:** Extra life pickups, difficulty-based life counts, upgrade retention on death (can be added later)
- **Proposed Approach:**
  - Add `lives` to `gameState` (default 3, tunable in `constants.js`)
  - On death: if lives > 0, consume life and respawn at current arena/wave start (clean reset)
  - If lives = 0, trigger game over
  - UI: show lives counter in HUD (hearts or number)
  - Lives persist across arena transitions
- **Acceptance Criteria:**
  - Default 3 lives (tunable in `DEFAULT_LIVES` constant)
  - Death with lives remaining restarts current arena cleanly (reset wave, enemies, pickups)
  - Death with 0 lives triggers game over
  - Lives visible in HUD at all times
  - Lives persist across arena transitions
- **Test Plan:**
  1. Start game, verify 3 lives shown in HUD
  2. Die intentionally, verify arena restarts and lives decremented
  3. Die 3 times, verify game over screen
  4. Beat arena, verify lives carry to next arena
- **Docs touched:** `docs/PLAYER.md` (lives system section)
- **Definition of Done:**
  - Lives system implemented and tested
  - UI shows lives counter
  - Lives persist correctly across arenas
  - Configurable in constants.js
  - No regressions in game over flow

---

### Difficulty Modes (#51)
- **Original:** #51
- **Type/Area/Priority/Status/Effort/Risk:** `type:feature` | `area:meta` | `priority:P0` | `status:ready` | `effort:M` | `risk:low`
- **Problem:** Single difficulty alienates both casual and hardcore players. No way to adjust challenge level.
- **Goal:** Add selectable difficulty modes (Easy/Normal/Hard/Nightmare) with data-driven tuning tables that scale enemy HP, damage, spawn budgets, and telegraph windows.
- **Non-goals:** Sequential unlock system (Danger Ladder), stacking modifier framework, per-character difficulty tracking, gameplay rule modifiers (no free healing, etc.) - these are future enhancements
- **Proposed Approach:**
  - Create `DIFFICULTY_CONFIG` object in `constants.js` with tuning tables per difficulty
  - Add difficulty selector to main menu (before game start)
  - Persist selection to localStorage
  - Apply multipliers at spawn time (enemy HP, damage, speed)
  - Apply spawn budget multiplier in wave system
  - Apply telegraph window adjustments in boss config
  - Show difficulty in leaderboard entry
- **Acceptance Criteria:**
  - Difficulty selectable before starting game (Easy/Normal/Hard/Nightmare)
  - Difficulty persists between sessions (localStorage)
  - All tuning values read from `DIFFICULTY_CONFIG` (no hardcoded numbers)
  - Leaderboard shows difficulty alongside score
  - Difficulty cannot be changed mid-run
- **Test Plan:**
  1. Start game, verify difficulty selector on menu
  2. Select Hard, start game, verify enemies tougher (HP/damage)
  3. Close/reopen game, verify difficulty remembered
  4. Complete run, verify difficulty shown on leaderboard entry
- **Docs touched:** `docs/PLAYER.md` (difficulty modes section)
- **Definition of Done:**
  - Difficulty selector implemented
  - Tuning tables in constants.js
  - Multipliers applied correctly
  - Persistence working
  - Leaderboard integration complete

---

### Off-Screen Enemy Spawns Cause Unfair Hits (#31)
- **Original:** #31
- **Type/Area/Priority/Status/Effort/Risk:** `type:ux` | `area:enemy` | `priority:P1` | `status:ready` | `effort:M` | `risk:low`
- **Problem:** Players take damage from enemies spawning behind them/off-screen without warning. Violates Fairness pillar (deaths must be explainable).
- **Goal:** Reduce rear-spawn hits to <10% of deaths OR provide clear warning before off-screen enemies can hit player.
- **Non-goals:** Complete spawn system rewrite, new enemy types, visual redesigns
- **Proposed Approach (implement at least one):**
  1. **Spawn bias:** Prefer spawning within player's forward 180° arc (avoid directly behind)
  2. **Spawn distance:** Increase minimum spawn distance, especially behind player
  3. **Aggro delay:** 0.3-0.5s grace window before newly spawned enemies can deal damage
  4. **Off-screen indicators:** Simple arrows for nearby off-screen threats
  5. **Audio cue:** Distinct warning when spawn happens behind player
- **Acceptance Criteria:**
  - Rear-spawn hits become rare (ideally <10% of deaths attributed to spawns)
  - OR player has clear warning before off-screen enemies can hit them
  - Spawn bias prefers player's forward 180° arc
  - Minimum spawn distance enforced (especially behind player)
- **Test Plan:**
  1. Play Arena 1, intentionally face away from spawn points
  2. Verify enemies rarely spawn directly behind player
  3. If warnings added: verify off-screen indicators appear
  4. Track deaths: <10% should be from rear spawns
- **Docs touched:** `docs/ENEMIES.md` (spawn behavior section)
- **Definition of Done:**
  - At least one solution implemented (spawn bias OR warning)
  - Rear spawn hits reduced to <10% of deaths
  - No regressions in spawn timing or wave progression

---

### Game Pace Feels Too Fast (#30)
- **Original:** #30
- **Type/Area/Priority/Status/Effort/Risk:** `type:tuning` | `area:enemy,area:arena` | `priority:P1` | `status:ready` | `effort:M` | `risk:low`
- **Problem:** Moment-to-moment pacing feels too fast and swarmy ("2x speed" perception). Little breathing room between decisions.
- **Goal:** Add 2-3 clear micro-breathing moments per wave without extending session length. Pacing should feel intense but readable.
- **Non-goals:** Slowing down entire game, extending wave duration significantly, reducing enemy count (would break balance)
- **Proposed Approach (smallest-first):**
  1. **Breathing beats:** Add 1-2s spawn pauses after clearing ~50% of wave
  2. **Early spawn rate:** Reduce early-wave spawn cadence slightly
  3. **Signal safety:** Audio/visual cue when brief calm window occurs
  4. **Enemy speed:** Consider 10-15% speed reduction baseline if above changes aren't enough
  5. **Between-wave pause:** Slightly longer pause before next wave begins
- **Acceptance Criteria:**
  - Players experience 2-3 clear micro-breathing moments per wave
  - Pacing feels intense but readable (less "2x speed" perception)
  - Session length stays unchanged or shorter
  - Spawn pauses after clearing ~50% of wave (1-2s)
- **Test Plan:**
  1. Play Arena 1, track breathing room moments
  2. Verify spawn pauses occur mid-wave
  3. Verify pacing feels readable (not frantic)
  4. Measure session length (should not increase)
- **Docs touched:** `docs/ARENA.md` (wave pacing section)
- **Definition of Done:**
  - Breathing beats implemented
  - Pacing feels readable (subjective but testable)
  - Session length unchanged
  - No regressions in wave completion

---

### Dash Ability Not Discoverable (#34)
- **Original:** #34
- **Type/Area/Priority/Status/Effort/Risk:** `type:ux` | `area:player` | `priority:P1` | `status:ready` | `effort:S` | `risk:low`
- **Problem:** Player couldn't figure out how to use dash ability despite it being core to survival. Hiding it wastes deaths on "didn't know I could dodge" rather than "learned the pattern."
- **Goal:** Make dash control discoverable within 30 seconds of starting. Dash keybind must be visible somewhere in UI at all times.
- **Non-goals:** Full tutorial system, on-screen prompts during combat, control remapping (can be added later)
- **Proposed Approach:**
  1. Add dash keybind to HUD (small "SHIFT: Dash" indicator, persistent)
  2. Tutorial prompt on first game: "Press SHIFT to dash through danger!" (one-time, dismissible)
  3. Add "Controls" section to pause menu (shows all keybinds)
  4. Consider brief dash cooldown indicator in HUD (optional)
- **Acceptance Criteria:**
  - Dash control visible somewhere in UI at all times
  - New player can discover dash within 30 seconds of starting
  - Dash keybind shown in HUD or pause menu controls section
- **Test Plan:**
  1. Start fresh game (new player simulation)
  2. Within 30 seconds, verify dash control is visible in UI
  3. Test dash keybind visibility in: main game HUD, pause menu controls section
  4. Verify dash hint does not clutter combat visibility
- **Docs touched:** `docs/PLAYER.md` (controls section)
- **Definition of Done:**
  - Dash keybind visible in HUD or pause menu
  - New player can discover dash within 30 seconds
  - No UI clutter from dash indicator

---

### Boss Phase Progression Redesign (#50)
- **Original:** #50
- **Type/Area/Priority/Status/Effort/Risk:** `type:design` | `area:boss` | `priority:P1` | `status:ready` | `effort:M` | `risk:med`
- **Problem:** Playtest feedback: bosses feel too hard too fast. Current implementation jumps to full pressure without teaching patterns. Need "teach → test → mastery" flow.
- **Goal:** Redesign boss phase progression so Phase 1 teaches one mechanic with generous windows, Phase 2 remixes Phase 1 + adds one constraint, Phase 3 pressure tests without new mechanics.
- **Non-goals:** New boss abilities, visual redesigns, boss HP changes (focus on timing/frequency)
- **Proposed Approach:**
  - Phase 1: One mechanic only, generous dodge windows (reduce attack frequency by 30-50%)
  - Phase 2: Remix Phase 1 + add ONE new constraint
  - Phase 3: Pressure test (faster but still fair), no new mechanics
  - Document teach/test/mastery flow in docs/BOSS.md
  - Ensure phase transitions have clear visual/audio cue
  - Specific fixes: Boss 2 (slower start, clearer telegraph), Boss 3 (teleport-only Phase 1)
- **Acceptance Criteria:**
  - Each boss has documented 3-phase teaching flow
  - Phase 1 attack frequency reduced by 30-50% from current
  - Phase transitions feel earned (HP thresholds clear)
  - Players can identify "what hit them" for every attack
- **Test Plan:**
  1. Fight each boss, note when you learn vs when you die
  2. Deaths should feel "I know what I did wrong"
  3. Phase 1 should feel like tutorial, Phase 3 like exam
  4. Verify phase transitions have clear visual/audio cue
- **Docs touched:** `docs/BOSS.md` (phase progression section)
- **Definition of Done:**
  - All bosses have 3-phase teaching flow
  - Phase 1 attack frequency reduced
  - Phase transitions clear
  - Documentation updated

---

### Boss Retreat/Return Mechanic Confusing (#32)
- **Original:** #32
- **Type/Area/Priority/Status/Effort/Risk:** `type:ux` | `area:boss` | `priority:P2` | `status:ready` | `effort:S` | `risk:low`
- **Problem:** Player expected boss to fully reset HP when retreating and returning. Mental model mismatch makes fight feel arbitrary rather than learnable.
- **Goal:** Make boss HP persistence across retreat/return clearly communicated. Players should understand HP persists, not resets.
- **Non-goals:** Changing retreat mechanic (HP persistence is correct), new boss abilities
- **Proposed Approach:**
  1. Keep boss HP bar visible (dimmed) during retreat to show HP persists
  2. Add brief on-screen hint: "The Puffer King retreats to recover..." (implies partial, not full reset)
  3. When boss returns, flash HP bar to draw attention to current HP
  4. Add phase markers/segments to HP bar so progress is visible
- **Acceptance Criteria:**
  - Players understand boss HP persists across retreat/return
  - Phase transitions communicated clearly (audio/visual)
  - Boss HP bar visible (dimmed) during retreat
  - When boss returns, HP bar flashes and current HP is clear
- **Test Plan:**
  1. Fight Boss 1 (Puffer King) to trigger retreat
  2. Observe HP bar during retreat - is it visible (dimmed)?
  3. When boss returns, verify HP bar flashes and current HP is clear
  4. Check with fresh tester: do they understand HP persists?
- **Docs touched:** `docs/BOSS.md` (retreat mechanic section)
- **Definition of Done:**
  - HP bar visible during retreat
  - Return announcement/hint added
  - HP bar flashes on return
  - Players understand HP persists (testable with fresh tester)

---

### Jump/Landing Feels Too Heavy (#33)
- **Original:** #33
- **Type/Area/Priority/Status/Effort/Risk:** `type:tuning` | `area:player` | `priority:P2` | `status:ready` | `effort:S` | `risk:low`
- **Problem:** Jump landing feels too heavy and abrupt for the manta ray fantasy. Players expect graceful, floaty movement, not brick-like physics.
- **Goal:** Make jump feel lighter and more "manta-like" with smooth landing deceleration instead of hard slam.
- **Non-goals:** Complete physics rewrite, new jump mechanics, visual redesigns
- **Proposed Approach:**
  1. Reduce gravity multiplier during descent (floatier)
  2. Add brief "hover" at jump apex before descent
  3. Soften landing with deceleration curve instead of instant stop
  4. (Optional) Add subtle visual grace (trail/particles) during descent
- **Acceptance Criteria:**
  - Jump feels lighter and more "manta-like"
  - Landing has smooth deceleration (no hard slam)
  - Brief hover at apex (optional but improves feel)
- **Test Plan:**
  1. Jump repeatedly in safe area (no enemies)
  2. Compare feel: graceful ascent, hover at apex, smooth landing
  3. Test jump during combat - responsive under pressure?
  4. Subjective check: matches 'manta ray fantasy' (floaty, graceful)?
- **Docs touched:** `docs/PLAYER.md` (movement section)
- **Definition of Done:**
  - Jump feels floaty/graceful
  - Landing has smooth deceleration
  - No regressions in jump responsiveness

---

### Upgrade Choices: Fire Rate Dominates (#29)
- **Original:** #29
- **Type/Area/Priority/Status/Effort/Risk:** `type:tuning` | `area:player` | `priority:P2` | `status:ready` | `effort:M` | `risk:med`
- **Problem:** Upgrade choices don't feel meaningful because fire rate/attack speed is the dominant first pick. Every run converges to "stack fire rate," reducing build diversity.
- **Goal:** Make at least 2-3 distinct upgrade paths feel viable. Players should sometimes pick non-fire-rate upgrades first.
- **Non-goals:** Reroll/banish system (research note in comments, future enhancement), full synergy system, economy overhaul
- **Proposed Approach:**
  1. **Buff alternatives:** Increase impact of damage, projectile count, range, pierce, etc.
  2. **Tradeoffs:** Add slight downside to extreme fire rate (e.g., reduced damage per hit)
  3. **Build-defining upgrades:** Add 1-2 transformative options that compete with fire rate (pierce, bounce, explosions)
  4. **More "attack enhancer" items:** Fewer bland stat bumps, more identity upgrades (megabonk-style)
- **Acceptance Criteria:**
  - At least 2-3 distinct upgrade paths feel viable
  - Players sometimes pick non-fire-rate upgrades first
  - Build-defining upgrades compete with fire rate (pierce, bounce, explosions)
- **Test Plan:**
  1. Play multiple runs, track first upgrade picks
  2. Verify non-fire-rate upgrades are sometimes chosen first
  3. Test build-defining upgrades (pierce, bounce) - do they feel competitive?
  4. Verify upgrade pool has "attack enhancer" items (megabonk-style)
- **Docs touched:** `docs/PLAYER.md` (upgrades section), `js/config/upgrades.js`
- **Definition of Done:**
  - 2-3 upgrade paths viable
  - Fire rate not always first pick
  - Build-defining upgrades added
  - Upgrade pool has identity upgrades

---

### XP Orbs Despawn Too Quickly (#28)
- **Original:** #28
- **Type/Area/Priority/Status/Effort/Risk:** `type:tuning` | `area:player` | `priority:P2` | `status:ready` | `effort:S` | `risk:low`
- **Problem:** XP orb despawn timing feels too aggressive under pressure. Players lose significant XP during high-intensity combat, which can feel unfair.
- **Goal:** Reduce XP loss to despawns during normal play while maintaining some routing urgency.
- **Non-goals:** Remove despawn entirely (would remove routing decisions), new pickup mechanics
- **Proposed Approach:**
  1. Extend timer from 15s → 20-25s
  2. Add clear visual countdown (flash/fade) when orb is about to despawn
  3. Add proximity exception: orbs within X units of player don't despawn
  4. Improve/earlier access to magnet-style pickup upgrade
- **Acceptance Criteria:**
  - Players rarely lose significant XP to despawns during normal play
  - Despawn still creates some routing urgency
  - Timer extended OR proximity exception added
- **Test Plan:**
  1. Start Arena 1, kill enemies to spawn XP orbs
  2. Intentionally delay pickup (fight away from orbs)
  3. Observe despawn timing - fair under combat pressure?
  4. If visual countdown added: verify clear when orb about to despawn
- **Docs touched:** `docs/PLAYER.md` (pickups section)
- **Definition of Done:**
  - Despawn timer extended or proximity exception added
  - Players rarely lose significant XP to despawns
  - Routing urgency maintained

---

### Playtest Feedback Time Bug (#54)
- **Original:** #54
- **Type/Area/Priority/Status/Effort/Risk:** `type:bug` | `area:ui` | `priority:P2` | `status:ready` | `effort:S` | `risk:low`
- **Problem:** Playtest feedback exports show absurd survival time (e.g., tens of millions of minutes) when `gameStartTime` is still `0`, making playtest stats unreliable.
- **Goal:** Fix time calculation to report realistic `MM:SS` (or `0:00` if no run started) instead of epoch-derived values.
- **Non-goals:** Full playtest system rewrite, new time tracking system
- **Proposed Approach:**
  1. **Clamp/guard:** If `gameStartTime <= 0`, set it to `Date.now()` before computing, or treat elapsed as `0`
  2. **Single source of truth:** Store run start time on `gameState` (or similar) and have HUD + playtest feedback read from that
- **Acceptance Criteria:**
  - Submitting feedback after a fresh game start reports realistic `MM:SS` (or `HH:MM:SS`) time
  - Submitting feedback from menus (no run started) reports `0:00` (or omits time) instead of epoch-derived values
  - `docs/playtests/*` no longer records absurd times for new rows
- **Test Plan:**
  1. Start a run, play ~10s, open feedback overlay, submit → time is ~`0:10`
  2. From start screen (no run), open feedback overlay, submit → time is `0:00` / blank
- **Docs touched:** None (bug fix only)
- **Definition of Done:**
  - Time calculation fixed
  - No absurd times in playtest exports
  - Handles both run-started and no-run cases

---

### Swarm AI Issues (#64, #65, #66)
**Note:** These are P3 (future content, Swarm AI milestone). Keeping brief rewrites for completeness.

#### Boids Swarm Engine (Foundation) (#64)
- **Type/Area/Priority/Status/Effort/Risk:** `type:feature` | `area:swarm` | `priority:P3` | `status:needs-spec` | `effort:XL` | `risk:high`
- **Problem:** Enemy groups move as individual beelines or rigid formations, not as recognizable schools. Players can't read or exploit school behavior.
- **Goal:** Implement Reynolds boids system so enemies move as coherent schools with mood state machine (CRUISING, ATTACKING, EVADING, REFORMING).
- **Non-goals:** New swarm maneuvers, wave event scripting, new enemy types, boss boids
- **Acceptance Criteria:** Schools move as coherent groups, boids runtime bounded (neighbor cap + spatial hash), mood state transitions exist and configurable
- **Test Plan:** 80-120 enemies on screen at 60fps, verify school coherence, verify performance
- **Docs touched:** `docs/ENEMIES.md` (swarm behavior section)

#### Swarm Evasive Maneuvers (#65)
- **Type/Area/Priority/Status/Effort/Risk:** `type:feature` | `area:swarm` | `priority:P3` | `status:needs-spec` | `effort:L` | `risk:med`
- **Problem:** Schools don't react to player actions (dash, AoE, pressure) in readable ways. Swarms feel like HP blobs, not puzzles.
- **Goal:** Add reactive maneuvers (Flash Expansion, Vacuole Formation, Fountain Effect, Compaction, Split and Reunion) gated by arena progression.
- **Non-goals:** Changes to spawn budgets, wave choreography, new enemies, event waves
- **Acceptance Criteria:** Arena gating works, each maneuver has distinct visual read and clear counterplay, schools reliably reform after scatter states
- **Test Plan:** Test each maneuver trigger, verify arena gating, verify visual readability
- **Docs touched:** `docs/ENEMIES.md` (swarm maneuvers section)

#### Coordinated Attack Patterns (#66)
- **Type/Area/Priority/Status/Effort/Risk:** `type:feature` | `area:swarm` | `priority:P3` | `status:needs-spec` | `effort:L` | `risk:med`
- **Problem:** Schools don't coordinate attacks (baton charging, flanking, orbital strafe). Individual enemies feel disconnected from group.
- **Goal:** Add coordinated attack patterns (baton charging, flanking, orbital strafe) with school-level token/leader state.
- **Non-goals:** Elite modifiers, new enemy types
- **Acceptance Criteria:** Arena 1 uses baton charging, later arenas unlock flanking + orbit, players can identify and counter each pattern via readable telegraphs
- **Test Plan:** Test each pattern, verify arena gating, verify telegraph readability
- **Docs touched:** `docs/ENEMIES.md` (coordinated attacks section)

---

### Arena Expansion (Future) (#36)
- **Original:** #36
- **Type/Area/Priority/Status/Effort/Risk:** `type:feature` | `area:arena` | `priority:P3` | `status:needs-spec` | `effort:XL` | `risk:high`
- **Problem:** Current arenas may feel repetitive over time. Need environmental variety and interactive elements.
- **Goal:** Add environmental mechanics (moving platforms, breakable cover, shifting layouts, environmental weapons, roaming neutral hazards) to create routing puzzles and prevent camping.
- **Non-goals:** New arenas (this is about mechanics, not content), boss mechanics, enemy types
- **Proposed Approach:** Research note in comments outlines 7 environmental mechanics. Implement one new mechanic per new arena (progressive teaching).
- **Acceptance Criteria:** Each new arena introduces one new environmental mechanic, mechanics create routing choices, hazards are readable and fair
- **Test Plan:** Test each environmental mechanic, verify readability, verify routing choices
- **Docs touched:** `docs/ARENA.md` (environmental mechanics section)
- **Definition of Done:** Environmental mechanics implemented, one per new arena, readable and fair

---

## F) Epic Map

### Epic 1: Core Systems (Ship Blockers)
**Goal:** Implement foundational systems required for Arena 1 polish and player retention.  
**Done when:** Lives system and difficulty modes are implemented, tested, and documented.  
**Issues:**
- #52: Lives & Checkpoint System
- #51: Difficulty Modes

**RICE Total:** 1000 | **Effort:** 2M | **Risk:** Low-Med

---

### Epic 2: Combat Fairness & Readability
**Goal:** Fix playtest-derived fairness issues (off-screen spawns, pacing, dash discoverability) to ensure deaths are explainable and mechanics are learnable.  
**Done when:** Rear spawns <10% of deaths, pacing feels readable, dash discoverable within 30s, breathing room moments present.  
**Issues:**
- #31: Off-Screen Enemy Spawns Cause Unfair Hits
- #30: Game Pace Feels Too Fast
- #34: Dash Ability Not Discoverable

**RICE Total:** 1270 | **Effort:** 2M + 1S | **Risk:** Low

---

### Epic 3: Boss Teaching & Clarity
**Goal:** Redesign boss phase progression to teach before testing, and improve clarity of boss mechanics (retreat/return, phase transitions).  
**Done when:** All bosses have 3-phase teaching flow, phase transitions clear, players understand retreat/return mechanic.  
**Issues:**
- #50: Boss Phase Progression Redesign
- #32: Boss Retreat/Return Mechanic Confusing

**RICE Total:** 465 | **Effort:** 1M + 1S | **Risk:** Med

---

### Epic 4: Player Feel & Progression
**Goal:** Improve moment-to-moment feel (jump/landing) and upgrade/build diversity to enhance replayability.  
**Done when:** Jump feels manta-like, upgrade choices feel meaningful (2-3 paths viable), XP despawn fair.  
**Issues:**
- #33: Jump/Landing Feels Too Heavy
- #29: Upgrade Choices: Fire Rate Dominates
- #28: XP Orbs Despawn Too Quickly

**RICE Total:** 545 | **Effort:** 1M + 2S | **Risk:** Low-Med

---

### Epic 5: Quality of Life & Polish
**Goal:** Fix bugs and improve UX details that don't block core loop but improve player experience.  
**Done when:** Playtest feedback time bug fixed, all QoL issues resolved.  
**Issues:**
- #54: Playtest Feedback Time Bug

**RICE Total:** 160 | **Effort:** 1S | **Risk:** Low

---

### Epic 6: Future Content (P3 - Backlog)
**Goal:** Swarm AI system and arena expansion for future content updates. Not part of Arena 1 polish.  
**Done when:** Not applicable (future milestone).  
**Issues:**
- #64: Boids Swarm Engine (Foundation)
- #65: Swarm Evasive Maneuvers
- #66: Coordinated Attack Patterns
- #36: Arena Expansion (Future)

**RICE Total:** N/A (P3) | **Effort:** 2XL + 2L | **Risk:** High

---

## Summary

**Total Issues:** 20  
**P0 (Ship Blockers):** 2 (#52, #51)  
**P1 (High Priority):** 4 (#31, #30, #34, #50)  
**P2 (Medium):** 5 (#32, #33, #29, #28, #54)  
**P3 (Future):** 4 (#64, #65, #66, #36)  
**Playtest-Derived:** 9 issues (all P1-P2, scoring bias applied)

**Recommended Next Sprint (Arena 1 Polish):**
1. Epic 1: Core Systems (Lives + Difficulty) - P0 blockers
2. Epic 2: Combat Fairness & Readability - P1 playtest issues
3. Epic 3: Boss Teaching & Clarity - P1-P2 boss improvements

**Estimated Sprint Capacity:** ~2-3 weeks for P0+P1 issues (6 issues, ~4M + 2S effort)

---

**End of Triage Report**
