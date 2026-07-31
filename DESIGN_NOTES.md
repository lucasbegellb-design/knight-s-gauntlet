# Design Notes

Running log of game-design and technical decisions made during development. Updated as the project progresses through the 8-phase roadmap (Foundations → Idle combat loop → Loot & relics → Companions & spells → HUB & meta-progression → Content scale-up → AI asset pipeline → Polish).

## Phase 1 — Foundations

**Scope:** project scaffold, folder structure, a typed data system proven on one content type (monsters), and a minimal `CombatEngine` (hero vs. one monster, flat damage, live HP). No loot, relics, companions, spells, HUB, persistence, or real art yet — those are later phases.

### Decisions

- **Phaser 4 instead of Phaser 3.** Phaser 4 has graduated to a stable release (4.2.1 on npm, `latest` tag) since this project's original brief assumed 3.x was the safer choice. Checked the bundled migration guide (`node_modules/phaser/changelog/v4/4.0/MIGRATION-GUIDE.md`) — none of the breaking changes (new WebGL render-node renderer, Filters replacing FX/Masks, `Point` → `Vector2`, etc.) affect the basic `Scene`/`Graphics`/`Text` API this project uses, so there's no cost to taking the current stable major instead of pinning to the previous one.
- **Content authored as typed TS object literals, not JSON, for now.** A generic `Registry<T extends { id: string }>` is the scalable piece; swapping the authoring format to JSON + schema validation (e.g. zod) later is a mechanical change to the loader, not the content shape. Deferred until content volume in Phase 6 makes hand-written `.ts` files unwieldy.
- **Seeded RNG (`Rng`, mulberry32-style) wired into `CombatEngine` from day one**, even though Phase 1's damage formula is flat and doesn't consume randomness yet. This locks in determinism/testability before crit rolls, drop rates, and relic proc chances arrive in later phases — retrofitting seeded RNG after the fact tends to be painful.
- **`CombatEngine` is fully renderer-independent.** It has no Phaser or React imports; it exposes `getState()` and `tick(dtMs): CombatEvent[]`. `CombatScene` (Phaser) is a pure subscriber — it reads state and reacts to events, but never mutates HP or decides win/lose itself. This is the seam that keeps combat logic unit-testable and the rendering layer swappable.
- **Phaser mounts inside React via a `useRef`-held `Phaser.Game` instance**, created in a `useEffect` guarded against React StrictMode's double-invoke (`if (gameRef.current) return`), destroyed with `game.destroy(true)` on unmount. The `Phaser.Game` object itself is never put in React or Zustand state — it's imperative and non-serializable.
- **`noUncheckedIndexedAccess: true`** added to `tsconfig.app.json` (on top of `strict: true`, added explicitly since the current Vite template doesn't set it by default). Matters immediately for the `Registry` map lookups and will matter more as relic/spell/item registries multiply in later phases.
- **Placeholder-first art.** Hero and monster are drawn as colored `Phaser.GameObjects.Graphics` rectangles with text-labeled HP bars — no sprites yet. `/src/assets` isn't created until a phase actually needs a placeholder image asset.
