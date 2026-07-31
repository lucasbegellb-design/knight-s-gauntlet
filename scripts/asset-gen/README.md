# asset-gen

AI-assisted asset generation pipeline producing sprites/portraits/icons into `/public/game-assets` from `manifest.mjs`.

- **Primary:** AI Horde (community Stable Diffusion cluster, anonymous key `0000000000`) — `generateViaAiHorde()` submits then polls `generate/status`.
- **Fallback:** Pollinations.ai (synchronous GET, no polling) — `generateViaPollinations()`.

Run: `node scripts/asset-gen/generate.mjs [--skip-horde] [--only=id1,id2]`

- Resumable: any id whose PNG already exists is skipped, so re-running only fills gaps.
- Failures are logged to `failures.json` for a targeted re-run via `--only`.
- The game never depends on these files existing — missing assets keep using placeholder rectangles (see DESIGN_NOTES.md, Phase 7).
