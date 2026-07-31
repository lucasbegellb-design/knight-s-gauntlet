# Knight's Gauntlet

An idle-RPG roguelike: a knight fights infinite waves automatically while you make the real decisions between waves — relics, equipment, companions, and spells that combine into increasingly absurd builds, plus a HUB with permanent talent/forge/companion progression across runs.

## Stack

- **Vite + React + TypeScript** — HUB, HUD, loot popups, all menus.
- **Phaser 4** — the combat scene (sprites, HP bars, tweened flavor text).
- **Zustand** — `runStore` (per-run HUD snapshot) and `metaStore` (persistent HUB state), kept strictly separate.
- **idb-keyval** — local persistence for meta-progression (currency, talents, forge, discoveries).
- **Vitest** — unit tests for the combat/loot/progression logic in `src/engine`.

## Running it

```bash
npm install
npm run dev      # http://localhost:5173
npm run test     # Vitest
npm run build    # production build to dist/
npm run lint     # oxlint
```

## Project structure

```
src/
  engine/   pure combat/wave/loot/progression logic (no Phaser or React deps, fully unit-tested)
  data/     typed content: monsters, relics, equipment, companions, spells, talents
  scenes/   Phaser CombatScene
  ui/       React components: Hub, HUD, loot popup
  store/    runStore (per-run) and metaStore (persistent), strictly separated
scripts/asset-gen/   AI image generation pipeline (AI Horde + Pollinations.ai fallback)
DESIGN_NOTES.md      running log of game-design and architecture decisions, phase by phase
```

See `DESIGN_NOTES.md` for the full history of design decisions across each development phase.
