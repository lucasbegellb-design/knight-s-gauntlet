# Knight's Gauntlet — project context

Idle-RPG roguelike (Balatro-style relic combos + Enter the Gungeon-style loot rarity, FF Brave Exvius art direction). Full original spec was an 8-phase build plan; **all 8 phases are implemented and shippable.** This file exists so a fresh session can resume work without re-deriving context. Full decision-by-decision history (why each choice was made) is in `DESIGN_NOTES.md` — read that before changing existing architecture, not just this summary.

## Branch

Work happens on `claude/knights-gauntlet-idle-rpg-0aiorv`. Push there, not `main`.

## Stack

Vite + React + TS (HUD/HUB/menus, Cinzel+Manrope fonts via Google Fonts, dark/gold/arcane-purple theme in `src/index.css`) · Phaser 4 (`CombatScene`, real sprites + tween-based hit/death/spawn animations) · Zustand (`runStore` per-run, `metaStore` persistent, kept strictly separate) · `idb-keyval` (meta persistence) · Vitest (engine logic only, 97 tests).

## Commands

```
npm run dev / test / build / lint
node scripts/asset-gen/generate.mjs --skip-horde --only=<id1,id2>       # generate more sprites (see below)
node scripts/asset-gen/removeBackground.mjs [hero monsters companions] # strip studio backgrounds off whatever's on disk (see below)
```

## Architecture (read `src/engine/*` before touching combat rules)

- `src/engine/` — pure logic, **zero Phaser/React/Zustand imports**, fully unit-tested. `CombatEngine` (hero+allies+spells vs monster, tick-based), `WaveManager` (sequences waves, XP, loot pauses, meta bonuses, zone-filtered monster pool, Broken Parts drops), `modifiers.ts` (declarative `RelicModifier` vocabulary shared by relics/equipment/passive spells/talents/**classes**/**the forge weapon**), `loot.ts`, `talents.ts`, `brokenParts.ts` (`rollBrokenParts` per-tier drop table), `heroProgression.ts` (`statsForLevel` + `scaleHeroDefinition` for class stat multipliers), `waveScaling.ts` (`tierForWave` + `zoneForWave`/`monsterPoolForWave`).
- `src/data/` — all content as typed registries (`Registry<T>` from `registry.ts`). Bulk content (Phase 6+) is grouped into per-family files (e.g. `relics/firePack.ts`), not one-file-per-entry like the original Phase 3 relics — both patterns coexist, see DESIGN_NOTES. `src/data/classes/` = the 4 playable classes (`ClassDefinition`: stat multiplier + innate `RelicModifier`s + starting-weapon pool + hero tint). `src/data/zones.ts` = the 4 map zones (`ZoneDefinition`: wave range, monster subset, background color) that `zoneForWave` picks from — the last zone is endless. `src/data/forgeWeapon.ts` = the single meta-persistent Forge Weapon (`resolveForgeWeaponModifiers(level)`, `forgeWeaponUpgradeCost(level)`) — not a registry, just one constant + a level curve.
- `src/scenes/CombatScene.ts` — the only place that bridges `WaveManager` to rendering, styled to read closer to FF Brave Exvius: party formation (hero front + up to 3 allies staggered behind in `COMPANION_SLOTS`, single enemy front-right), soft ground-shadow ellipse under every unit, and a continuous idle-bob tween while standing. Renders real sprites via `preload()`/`textures.exists()` check, falls back to colored rectangles per-unit if no art exists yet; sprites are **contain-fit** (not stretched) to their tier's bounding box so real aspect ratio is preserved. Applies the chosen class's hero tint + stat-scaled `HeroDefinition` + rolled starting weapon at `startNewRun()`. Zone background is set on run start and on every zone transition. Combat presentation is now ATB-flavored: each `UnitView` renders a yellow gauge under its HP bar that fills from the engine's own already-per-unit `nextAttackAt`/`attackIntervalMs` timers (`atbProgress()`/`updateAtbBar()`) — no engine change needed, the tick-based simultaneous-timer combat *is* an ATB system, it just wasn't visualized before. Attacks now choreograph as a real hit-stop beat: attacker lunges (`attackLunge`), and only once the lunge lands (after `ATTACK_LUNGE_OUT_MS`, via `time.delayedCall`) does `hitImpact()` fire together — flinch shake, a white `setTintFill`-style flash (Phaser 4 needs `setTint().setTintMode(FILL)`, restored via `UnitView.restTint` afterward, not `clearTint()`, or a hero's class tint gets wiped), an expanding hit-spark ring (`spawnImpactBurst`), a `cameras.main.shake()` (bigger on crit), and a bold outlined pop-in damage number (`showDamageNumber`) — plain `attack` events didn't show a damage number at all before this pass. Deaths stop the idle-bob and play a one-shot shrink/fade/tilt (`deathAnimation`) instead of a static alpha snap.
- `src/store/` — `runStore` (HUD snapshot, pushed every tick from CombatScene, includes `brokenParts`/`zoneName`/`heroClassName`) vs `metaStore` (talents/forge/companion upgrades/discoveries/currency/`brokenParts`/`forgeWeaponLevel`, persisted via idb-keyval; also holds the **transient, unpersisted** `selectedClassId`/`startingWeapon` set by `chooseClass()`). Engine never imports either store directly — `WaveManager` takes a plain `MetaBonuses` object (now including `classModifiers` + `forgeWeaponModifiers`) plus an optional starting-equipment param as constructor args; `CombatScene` is the glue that reads `metaStore` and builds them.
- `src/ui/Hub.tsx` — the Camp screen (Talents/Forge/Companions/Grimoire tabs; Forge tab has two cards side by side: the original equipment-power Forge Level, and the new Forge Weapon leveled with Broken Parts). `src/ui/ClassSelect.tsx` — the class-pick screen between Camp and a run. Screen flow is now `hub → classSelect → run`; `<PhaserGame>` only mounts when `screen === 'run'`.

## Current content

60 relics · 12 equipment · 16 monsters (10 normal/3 miniboss/3 boss) · 6 companions · 8 spells · 11 talents · 4 classes (Knight/Berserker/Guardian/Duelist) · 4 zones (Greenwood Fringe → Bonefields → Cinder Wastes → Wyrm's Reach, waves 1-10/11-20/21-30/31+) · 1 Forge Weapon (10 levels, funded by Broken Parts dropped by monsters — normal 35% chance for 1-2, miniboss 75% for 2-4, boss guaranteed 3-6).

## Assets — what's real vs placeholder

- **Real AI-generated art (Pollinations.ai):** hero + all 16 monsters, 5 rarity icons. Backgrounds are now **actually transparent** via `scripts/asset-gen/removeBackground.mjs` (uses `sharp`, a proper devDependency now — a fresh install had been the earlier blocker, it's resolved). The script: (1) flood-fills from the border through connected *near-white* pixels only (deliberately conservative — a looser "any neutral gradient tone" version was tried and rejected because it ate into grayscale subjects like the skeleton and left ragged holes); (2) trims the resulting transparent margin so the subject fills its bounding box instead of floating in a mostly-empty 512×512 canvas; (3) for the handful of monsters whose backdrop isn't near-white (skeleton, frost_lich, ancient_wyrm, bat, goblin_grunt — colored/gradient scenes the flood fill can't safely touch), falls back to a soft **corner vignette** (radial alpha fade) so they still blend into the dark UI instead of showing a hard-edged box; (4) removes isolated near-white "floor shadow" blobs (a puddle-shaped patch under the character's feet, disconnected from the border) that would otherwise float oddly once the surrounding background goes transparent. Re-run it any time new art is generated — it's idempotent. One or two sprites (e.g. wolf) still keep a faint shadow smudge; that was a deliberate stop-point rather than risk corrupting a subject with a more aggressive pass.
- **Still placeholder (colored rectangles):** all 6 companions. Adding their art is zero engine risk — same texture-exists fallback already handles it: generate to `public/game-assets/companions/<id>.png`, run `removeBackground.mjs companions`, add a `preload()` line + texture key in `CombatScene`, done.
- Pipeline: `scripts/asset-gen/generate.mjs` (AI Horde primary + Pollinations fallback, resumable — skips ids already on disk). **Known gotcha:** Pollinations 429s if you don't pace every request (success or failure) — the delay must be unconditional, not just after successes. Script already does this correctly.

## GitHub Pages

Fixed. Single canonical workflow: `.github/workflows/main.yml` (do not re-add `static.yml` or a second Pages workflow — a prior session had 3 competing ones racing each other, which was the original blank-page bug). `vite.config.ts` uses `base: '/knight-s-gauntlet/'` (this exact repo name — don't change unless the repo is renamed). Runtime `game-assets/...` image paths in `src/ui/RarityIcon.tsx` are intentionally relative (no leading `/`) since literal strings ignore Vite's `base` config.

## Known gaps / natural next steps

1. Companion sprites (see above).
2. A faint shadow-blob remnant on 1-2 monster sprites (e.g. wolf) — see the background-removal writeup above.
3. Deeper balance pass — current curve was tuned by playtesting, not exhaustively; class stat multipliers/innate modifiers and the Forge Weapon's per-level bonus are a first pass, not exhaustively tuned either.
4. Full relic↔companion synergy cross-play (currently companions use flat unmodified stats, only the hero's own attacks read relic/equipment modifiers) — deliberate Phase 4 scope cut.
5. Gacha-premium visual polish (animated pulls, more particle/glow work) — only mythic/legendary loot cards got the animated-border treatment so far.
6. Classes all reuse the single Knight hero sprite (tinted, not reskinned) since there's only one generated hero portrait — a real per-class sprite would need `scripts/asset-gen/generate.mjs` runs for each class id.
7. Zones only change monster pool + background color today; no distinct zone backdrop art/music/zone-specific mechanics yet.
8. The Forge Weapon is a single fixed item (flat +damage/+crit per level) — no alternate forge weapons, no choice of which stat to invest in, no visual representation of it in combat (it's a pure meta stat-stick, not an equippable/rendered object).
9. Still single static images, not true animated sprite sheets — the FFBE-style juice (ATB gauges, hit-stop, impact bursts, camera shake, idle bob) is all procedural/tween-based on one portrait per unit, not frame-by-frame attack/idle/hurt animations. Getting real sprite-sheet animation would need either hand-authored frames or a very different AI-art pipeline than Pollinations text-to-image.
