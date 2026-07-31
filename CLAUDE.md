# Knight's Gauntlet — project context

Idle-RPG roguelike (Balatro-style relic combos + Enter the Gungeon-style loot rarity, FF Brave Exvius art direction). Full original spec was an 8-phase build plan; **all 8 phases are implemented and shippable.** This file exists so a fresh session can resume work without re-deriving context. Full decision-by-decision history (why each choice was made) is in `DESIGN_NOTES.md` — read that before changing existing architecture, not just this summary.

## Branch

Work happens on `claude/knights-gauntlet-idle-rpg-0aiorv`. Push there, not `main`.

## Stack

Vite + React + TS (HUD/HUB/menus) · Phaser 4 (`CombatScene`, real sprites) · Zustand (`runStore` per-run, `metaStore` persistent, kept strictly separate) · `idb-keyval` (meta persistence) · Vitest (engine logic only, 81 tests).

## Commands

```
npm run dev / test / build / lint
node scripts/asset-gen/generate.mjs --skip-horde --only=<id1,id2>   # generate more sprites (see below)
```

## Architecture (read `src/engine/*` before touching combat rules)

- `src/engine/` — pure logic, **zero Phaser/React/Zustand imports**, fully unit-tested. `CombatEngine` (hero+allies+spells vs monster, tick-based), `WaveManager` (sequences waves, XP, loot pauses, meta bonuses), `modifiers.ts` (declarative `RelicModifier` vocabulary shared by relics/equipment/passive spells/talents), `loot.ts`, `talents.ts`, `heroProgression.ts`, `waveScaling.ts`.
- `src/data/` — all content as typed registries (`Registry<T>` from `registry.ts`). Bulk content (Phase 6+) is grouped into per-family files (e.g. `relics/firePack.ts`), not one-file-per-entry like the original Phase 3 relics — both patterns coexist, see DESIGN_NOTES.
- `src/scenes/CombatScene.ts` — the only place that bridges `WaveManager` to rendering. Renders real sprites via `preload()`/`textures.exists()` check, falls back to colored rectangles per-unit if no art exists yet.
- `src/store/` — `runStore` (HUD snapshot, pushed every tick from CombatScene) vs `metaStore` (talents/forge/companion upgrades/discoveries/currency, persisted via idb-keyval). Engine never imports either store directly — `WaveManager` takes a plain `MetaBonuses` object as a constructor param; `CombatScene` is the glue that reads `metaStore` and builds it.
- `src/ui/Hub.tsx` — the Camp screen (Talents/Forge/Companions/Grimoire tabs). App boots into `screen: 'hub'`; `<PhaserGame>` only mounts when `screen === 'run'`.

## Current content

60 relics · 12 equipment · 16 monsters (10 normal/3 miniboss/3 boss) · 6 companions · 8 spells · 11 talents.

## Assets — what's real vs placeholder

- **Real AI-generated art (Pollinations.ai):** hero + all 16 monsters, 5 rarity icons. Backgrounds are near-white (not transparent — no `sharp`/`rembg` available without a fresh install; reads as a "portrait card," not broken).
- **Still placeholder (colored rectangles):** all 6 companions. Adding their art is zero engine risk — same texture-exists fallback already handles it: generate to `public/game-assets/companions/<id>.png`, add a `preload()` line + texture key in `CombatScene`, done.
- Pipeline: `scripts/asset-gen/generate.mjs` (AI Horde primary + Pollinations fallback, resumable — skips ids already on disk). **Known gotcha:** Pollinations 429s if you don't pace every request (success or failure) — the delay must be unconditional, not just after successes. Script already does this correctly.

## GitHub Pages

Fixed. Single canonical workflow: `.github/workflows/main.yml` (do not re-add `static.yml` or a second Pages workflow — a prior session had 3 competing ones racing each other, which was the original blank-page bug). `vite.config.ts` uses `base: '/knight-s-gauntlet/'` (this exact repo name — don't change unless the repo is renamed). Runtime `game-assets/...` image paths in `src/ui/RarityIcon.tsx` are intentionally relative (no leading `/`) since literal strings ignore Vite's `base` config.

## Known gaps / natural next steps

1. Companion sprites (see above).
2. Background removal on generated art for true transparency.
3. Deeper balance pass — current curve was tuned by playtesting, not exhaustively.
4. Full relic↔companion synergy cross-play (currently companions use flat unmodified stats, only the hero's own attacks read relic/equipment modifiers) — deliberate Phase 4 scope cut.
5. Gacha-premium visual polish (animated pulls, more particle/glow work) — only mythic/legendary loot cards got the animated-border treatment so far.
