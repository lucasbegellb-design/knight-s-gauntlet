# store

Zustand stores live here. Two stores, kept strictly separate:

- **Run state** — the current run's build, inventory, and live combat state. Reset on death/completion.
- **Meta state** — permanent progression (talents, collection, forge, settings). Persisted via `idb-keyval`.

Not implemented yet — lands in Phase 5 (HUB and meta-progression). See `DESIGN_NOTES.md`.
