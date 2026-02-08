# Changelog

All notable changes to MantaSphere will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- GitHub Issue templates (bug report, feature request, tuning)
- GitHub PR template with checklist
- New labels: `type:docs`, `type:chore`, `area:music`, `status:blocked`
- CHANGELOG.md for version history

### Changed
- Consolidated PROMPTS.md to reference CONTRIBUTING.md (DRY)
- Updated release workflow documentation

## [0.2.3] - 2026-02-03

### Changed
- Consolidated sources of truth (GitHub Issues as single source for work items)
- Removed redundant files: BACKLOG.md, FEATURES.md, docs/PROJECT_STATE.md, docs/EPICS.md
- Added Source of Truth Policy to .cursorrules (Section 18)
- Updated CONTRIBUTING.md with Sources of Truth section
- Updated PROMPTS.md Backlog Triage prompt to reference GitHub Issues

### Added
- 15 GitHub Issues migrated from BACKLOG.md
- 3 GitHub Milestones (0.3.x, 0.4.x, 0.5.x series)

## [0.2.0] - 2026-01-15

### Added
- Documentation overhaul (docs/PLAYER.md, docs/BOSS.md, docs/ENEMIES.md, docs/ARENA.md)
- Code quality sweep with bug prevention checklist
- Module system groundwork
- Structured debug logging system (debugLog.js)
- GPU detection for performance scaling

### Changed
- Improved .cursorrules with comprehensive development guidelines

## [0.1.0] - 2026-01-01

### Added
- Initial release
- Arena 1 - Training Grounds with 7-wave structure
- Red Puffer King boss
- Basic enemy types (Grunt, Speeder, Tank, Sniper)
- Player movement, shooting, and dash mechanics
- PULSE adaptive music system
- Badge system (stat badges + arena mastery badges)
- Local leaderboard with top 10 scores
- Upgrade system with level-up choices
