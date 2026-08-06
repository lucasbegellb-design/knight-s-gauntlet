# Knight's Gauntlet — project context

Idle-RPG roguelike. Balatro-style relic combos, Brave Frontier's elements/squad/Brave Burst,
Gungeon-style loot rarity, FF Brave Exvius art direction, Ankama-style single cosmology.

**This file is injected into every session's context, so it stays short on purpose.** It answers
"what is this, where do I look, what will bite me". The *why* behind every design decision lives in
`DESIGN_NOTES.md`, read on demand. Do not grow this file back into a changelog.

| Need | Read |
|---|---|
| Why a system works the way it does | `DESIGN_NOTES.md` |
| The cosmology, and the writing rules for any player-facing text | `LORE.md` |
| Where the design is heading, and the research behind it | `ROADMAP.md` |
| How to work here without burning tokens | `CONTRIBUTING_AGENT.md` — **read this first** |
| When to split work across sub-agents | `CONTRIBUTING_AGENT.md`, and `.claude/agents/` for the roles |

## Branch

Work on `claude/game-improvement-plan-a3e41j`. Never push to the default branch directly.
The default branch is **`claude/knights-gauntlet-idle-rpg-0aiorv`** — there is no `main`, despite
the name looking like a feature branch. Pull requests target it.

## Commands

```
npm run dev / test / build / lint
node scripts/agent/verify.mjs          # lint + typecheck + test + build, compact, stops at first failure
node scripts/agent/map.mjs [area]      # generated symbol map — use instead of grepping for a definition
node scripts/agent/ci.mjs [--log]      # workflow runs + GitHub status in one call
npx vitest run src/engine/balanceSim.test.ts   # prints the balance numbers
node scripts/asset-gen/generate.mjs --only=<id>        # generate sprites
node scripts/asset-gen/removeBackground.mjs <dirs>     # strip studio backgrounds
```

**`npx tsc --noEmit` checks nothing here.** The root tsconfig is `{ files: [], references: [...] }`,
so it exits 0 on a broken tree. Only `tsc -b` typechecks. `verify.mjs` gets this right.

## Stack

Vite · React + TS (HUD, Camp, menus) · Phaser 4 (`CombatScene`, dynamically imported so the initial
payload is ~330KB not ~1.7MB) · Zustand (`runStore` per-run vs `metaStore` persistent — kept
strictly separate) · `idb-keyval` · Vitest (**246 tests**, engine logic only).

## Architecture in one paragraph

`src/engine/` is pure logic with **zero Phaser/React/Zustand imports** and is where combat rules
live — change them there, not in the scene. `CombatEngine` resolves one wave (party vs an ordered
`monsters[]`); `WaveManager` sequences the run, owns loot/XP/affixes/Echo, and is the only thing
that talks to both the engine and the data registries. `src/data/` is typed registries. The scene
(`src/scenes/CombatScene.ts`) only renders and forwards events; the stores only hold state.
**Run `node scripts/agent/map.mjs` for every exported symbol and its line number** rather than
grepping — that is what it is for.

Three boundaries that are load-bearing:
1. Monsters never read `AggregatedModifiers`. Enemy rules go in `MonsterTraits` (`data/affixes.ts`).
2. Flat stat bonuses go in the additive `${kind}Sum` pipeline; anything conditional or
   multiplicative goes in `engine/conditionals.ts`. Do not mix them.
3. Prestige sells **rule changes, never stat bonuses** (`engine/prestige.ts`). A test enforces it.

## Current content

76 relics · 12 equipment · 19 monsters · 11 companions · 8 spells · 11 talents · 4 classes ·
6 elements · 8 wave affixes · 6 sigil upgrades · 2 continents × 2 zones · 1 Forge Weapon.

## Balance state

Measured, `npx vitest run src/engine/balanceSim.test.ts`. Naive always-pick-option-0, 100 seeds per
class. **Solo 78-92/100** past wave 10 (median death w20-35), **led squad 100/100** (median w25-40).
`balanceSim` asserts two things: a survival floor of 40/100, and that a led squad beats solo on
*every* class — the floor only catches regressions downward, the invariant catches a buff going too
far.

## GitHub Pages

Single workflow, `.github/workflows/main.yml`. Runs on `pull_request` (CI for any branch, no list to
maintain) and on `push` to the default branch (which publishes). `vite.config.ts` needs
`base: '/knight-s-gauntlet/'`. Runtime `game-assets/...` paths in `RarityIcon.tsx` are deliberately
relative — literal strings ignore Vite's `base`.

**When a deploy hangs:** `actions/deploy-pages` creating the deployment then polling
`deployment_in_progress` to its 10-minute timeout is a **GitHub-side stall**, not a repo problem.
Check `node scripts/agent/ci.mjs` for a Pages incident before touching the workflow. A stuck deploy
also holds the single in-flight Pages slot, so later runs fail with "due to in progress deployment"
naming the stuck SHA — cancel the stuck run to unblock the queue.

## Known gaps

- No **generated** art for the systems added recently (elements use hand-drawn SVG in
  `ui/ElementIcon.tsx`, affixes use a CSS aura). A Brave Burst effect sprite is the obvious batch.
- Zones change monster pool and backdrop only — no zone-specific music or mechanics.
- The Forge Weapon is one fixed item with no choice of investment and no in-combat representation.
- Sprites are 2 frames (idle + attack); no hurt/death frames.
- A faint shadow remnant on 1-2 monster sprites (e.g. wolf).

The full history of what was tried and rejected — asset-pipeline gotchas, the img2img dead end, the
gacha/ascension/kingdom mechanics in detail — is archived at the end of `DESIGN_NOTES.md`.
