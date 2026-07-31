# store

Zustand stores live here. Two stores, kept strictly separate:

- **Run state** (`runStore.ts`) — a HUD-facing snapshot of the current run (wave, hero level/xp/hp, monster info, combat speed) plus UI intents (speed selection, restart request). The `CombatScene` (Phaser) is the source of truth for the actual simulation (`WaveManager`); it pushes snapshots into this store each tick so React can render a HUD without owning game logic.
- **Meta state** — permanent progression (talents, collection, forge, settings), persisted via `idb-keyval`. Not implemented yet — lands in Phase 5 (HUB and meta-progression).
