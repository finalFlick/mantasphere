# Megabonk - Complete Game Reference

## Overview

**Megabonk** is a 2025 roguelike survival game developed by solo developer **vedinad**. It's a 3D Vampire Survivors-like game featuring procedurally generated maps, automatic combat against hordes of enemies, and character progression through randomized upgrades.

- **Developer**: vedinad (solo)
- **Engine**: Unity
- **Release**: September 18, 2025
- **Platforms**: Windows, Linux
- **Sales**: 1+ million copies in 2 weeks
- **Peak Players**: 117,336 concurrent

Often described as "Vampire Survivors in 3D" or "a mix of Vampire Survivors and Risk of Rain 2."

---

## Core Gameplay

### The Loop
1. Select character
2. Explore procedurally generated 3D map
3. Auto-attack enemies (weapons fire automatically)
4. Collect XP gems from defeated enemies
5. Level up and choose random upgrades
6. Activate shrines and interactables for buffs
7. Survive increasingly difficult waves
8. Defeat bosses and survive as long as possible

### Key Mechanics

| Mechanic | Description |
|----------|-------------|
| **Auto-Combat** | Weapons fire automatically; player focuses on movement and positioning |
| **3D Movement** | Walk, jump, slide, and dodge through vertical terrain |
| **XP Collection** | Enemies drop gems that must be physically collected |
| **Random Upgrades** | Choose from 2-3 random buffs on each level up |
| **Meta Progression** | Silver currency persists across runs for permanent unlocks |

---

## Characters & Progression

### Character System
- **20 unique playable characters**
- Each has a distinct starting weapon and passive ability
- Unlocked via quests, Silver currency, or milestones

### Beginner Characters
- **Fox** - Ranged specialist
- **Sir Oofie** - Durable tank

### Silver (Meta Currency)
- Persists across playthroughs
- Unlocks characters, weapons, and items permanently
- Earned via challenges, silvery-blue pots, and Silver Tome upgrades

---

## Items & Builds

### Items
- **70+ items** with tiered rarities (Common → Uncommon → Rare → Legendary)
- Provide passive stackable effects
- Most must be unlocked via quests

### Weapons
- **20+ distinct weapons**
- Types: Ranged (projectiles), Melee (AoE), Utility (auras, shields)
- Each has unique attack patterns and stat interactions

### Build Strategy
- Items, tomes, and weapons create synergies
- Picking upgrades that multi-buff each other = exponential power
- Balance offense, defense, and utility
- Fast attacks + high projectile count + crit scaling = snowball builds

---

## Stats & Tomes

Tomes act as persistent stat multipliers:

| Stat | Effect |
|------|--------|
| Attack Speed | How fast weapons fire |
| Projectile Count | Number of projectiles per attack |
| Projectile Bounces | How many times projectiles bounce |
| Size | Projectile/attack size |
| Movement Speed | How fast you move |
| Luck | Affects drop rates and quality |
| Pickup Range | XP/gold collection radius |
| XP Gain | Multiplier for experience |
| Damage | Base damage multiplier |
| Crit Chance | Critical hit probability (stacks beyond 100%!) |

### Overcrit Mechanic
- Crit chance above 100% converts to higher effective crit damage
- Enables exponential damage scaling in late game

---

## Map Interactables

| Type | Effect |
|------|--------|
| **Sanctuaries/Altars** | Grant stat boost choices |
| **Statues & Trials** | Spawn tough foes for guaranteed rewards |
| **Magnets** | Vacuum XP and gold from distance |
| **Boss Statues** | Summon mini-boss challenges |
| **Chests** | Require gold; grant weapons/tomes/upgrades |
| **Shrines** | Charge for strong buffs (draws enemies) |
| **Boss Portals** | Trigger boss fights |

---

## Combat Strategy

### Movement Tips
- **Never stand still** - constant movement prevents enemy clustering
- Circle-strafe, jump, dodge to weave through hordes
- Use bunnyhopping for advanced movement

### Strategic Priorities
1. Capture interactables early for more options
2. Balance survivability and offense
3. Prioritize XP early for power spikes
4. Don't hoard gold - open chests consistently

### Build Priority
- Boost XP & movement first (high leverage early)
- Combine tomes for damage, projectiles, and speed
- Mix stats for synergy

---

## Development Guide (For Clones/Inspired Games)

### Core Systems to Implement

1. **Auto-Attack System** - Weapons fire without player input
2. **Movement & Evasion** - Walk, jump, slide, dodge
3. **Procedural Maps** - Randomized layouts each run
4. **Enemy Waves** - Progressive difficulty scaling
5. **XP & Leveling** - Collect gems, level up, choose upgrades
6. **Item/Build System** - Stackable buffs with synergies
7. **Meta Progression** - Persistent unlocks across runs
8. **Interactables** - Shrines, chests, boss portals

### Recommended Tech Stack

| Engine | Pros |
|--------|------|
| **Unity** | Built-in 3D, C#, large community, ScriptableObjects |
| **Unreal** | Visual scripting, high-end visuals, C++ |
| **Godot** | Lightweight, open-source, no licensing fees |
| **Three.js** | Web-based, no installation, easy sharing |

### Performance Considerations
- Object pooling for projectiles and enemies
- LOD systems for distant enemies
- Efficient particle systems
- Handle many entities on screen

### Design Principles
1. **Clarity over complexity** - Players should understand what's happening
2. **Power fantasy** - Players should feel increasingly powerful
3. **Meaningful choices** - Upgrade decisions should matter
4. **Exploration rewards** - Encourage map exploration
5. **Failure teaches** - Runs should feel like learning experiences

---

## Reception & Awards

### Critical Praise
- "One of my favorite games of the year" - TheGamer
- "Addictive... excellent... a true trend setter" - Rogueliker
- 4/5 stars - GamesHub
- 8.5/10 - Lords of Gaming

### Criticisms
- Repetitive challenges
- Difficulty spikes
- "Memey" humor
- Limited map variety at launch (2 maps)

### Awards (2025)
- The Game Awards - Players' Voice (Nominated)
- Steam Awards - Sit Back and Relax (Nominated)

---

## Similar Games

- **Vampire Survivors** - 2D predecessor
- **Risk of Rain 2** - 3D roguelike
- **Hades** - Roguelike progression
- **Binding of Isaac** - Item synergies

---

*This document consolidates all Megabonk reference material for the 3D POC project.*
