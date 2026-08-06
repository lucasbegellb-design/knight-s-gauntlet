# Working here without burning tokens

Written from measurement, not principle. Everything below is something that actually cost time or
context in a real session on this repo, with the number where there is one.

---

## The five things that cost the most

### 1. Finding code — use the generated map, not grep

Locating a definition was the single biggest sink. `CombatScene.ts` is ~1000 lines, `WaveManager.ts`
~950; a failed grep means reading a chunk to re-orient, and that is 2-10k tokens gone.

```
node scripts/agent/map.mjs                # every exported symbol, file:line, ~150 lines
node scripts/agent/map.mjs engine         # one area
node scripts/agent/map.mjs --grep=burst   # by name, anywhere
```

It is generated, so it cannot go stale. Reach for it before Grep, every time.

### 2. `npx tsc --noEmit` silently checks nothing

The root tsconfig is `{ files: [], references: [...] }`. `tsc --noEmit` exits 0 on a broken tree.
Only `tsc -b` walks the references. A session was spent trusting a green `--noEmit` while
`npm run build` failed on errors it had never looked at.

```
node scripts/agent/verify.mjs        # lint → typecheck → test → build, stops at first failure
node scripts/agent/verify.mjs --fast # skip the production build while iterating
```

One verification cycle **per chantier**, not per file.

### 3. Bulk edits belong in a script, never in N edit calls

A script that rewrites 76 files costs about what one file costs. This is the single largest lever
here. Real examples from one session:

| Change | Files touched | Cost |
|---|---|---|
| `element` added to every monster/companion/class | 34 entries | one script |
| Flavor lines for every relic | 76 entries | one script |
| Leader skills for every companion | 11 files | one script |

Use an **anchored substitution that asserts**, so drift fails loudly instead of silently no-op-ing:

```python
def sub(path, old, new):
    p = pathlib.Path(path); s = p.read_text()
    assert old in s, f"MISS {path}: {old[:70]}"     # loud, not silent
    p.write_text(s.replace(old, new, 1))
```

A silent `.replace()` that matches nothing is the worst outcome: it looks like it worked.

### 4. Never read a file just to move it

Relocating 23k characters out of `CLAUDE.md` would have cost ~6k tokens to read first. Splitting it
on section headings with a script and appending the parts verbatim cost nothing and could not
introduce a transcription error.

The same applies to reformatting, renaming, and reordering. If you are not making a judgement about
the content, do not load the content.

### 5. CI state — one call, not fifteen

Answering "is it green, and why not" took ~15 curl-and-parse round trips.

```
node scripts/agent/ci.mjs           # runs + GitHub's own status
node scripts/agent/ci.mjs --log     # error lines from the failing job
```

It checks githubstatus.com too, because a hung Pages deploy is routinely **GitHub's** problem and
rewriting a correct workflow to chase it wastes a lot more than one request.

---

## Traps specific to this repo

- **Node's `fetch` ignores the proxy.** This environment routes HTTPS through `HTTPS_PROXY`, which
  Node's built-in fetch does not honour — requests go out direct and return 403 while the identical
  `curl` succeeds. Shell out to curl (see `scripts/agent/ci.mjs`).
- **A new required field on a shared type ripples into test fixtures.** Adding `element` to
  `MonsterDefinition` broke six fixture files. Either make the field optional, or expect the ripple
  and fix them in the same script.
- **Absolute assertions couple a test to every other system.** Four tests broke when the Solitary
  Trial shipped, all asserting hardcoded damage numbers that silently assumed no party-wide
  modifier existed. Assert a **delta against a control**, or assert the stat rather than the
  resolved damage. A test that breaks whenever anything else changes is testing the wrong thing.
- **`balanceSim` is the guard rail.** It asserts a survival floor *and* that a led squad beats solo
  on every class. A floor only catches things getting weaker; the invariant catches a buff going too
  far. Both are load-bearing — do not weaken either to make a change pass.
- **Run the game.** Two real bugs this session (`31/30` companion HP, element emoji falling back to
  unrelated glyphs) were invisible to 246 passing tests and obvious in one screenshot. Chromium and
  Playwright are preinstalled; `executablePath: '/opt/pw-browsers/chromium'`.

## Tuning numbers

Sweep, do not guess. Parameterise the constant, loop over candidates, print one compact line each:

```bash
for v in 1.35 1.45 1.5; do
  python3 -c "...rewrite the constant to $v..."
  npx vitest run src/engine/balanceSim.test.ts 2>&1 | grep -E "^  (Knight|Berserker|Guardian|Duelist)"
done
```

Then **record the measurement in a comment next to the constant**, including the values you
rejected and why. `elements.ts` and `waveScaling.ts` both do this. It stops the next session
re-deriving it, which is the most expensive kind of repeat work there is.

## Documentation discipline

- `CLAUDE.md` is injected into **every** session. It was allowed to grow to ~9,000 tokens of
  changelog; trimming it to ~1,300 saved ~7,600 tokens *per session*. Keep it to "what is this,
  where do I look, what will bite me". Everything else goes in `DESIGN_NOTES.md`.
- Write the *why* down once, in the code, next to the thing it explains. A comment that records a
  rejected alternative is worth more than one that restates the line below it.

---

## Splitting the work across sub-agents

A sub-agent is **not automatically cheaper**. It starts cold: it re-derives context the caller
already has, re-reads the files, and has to be briefed. Splitting a session up by reflex makes it
slower and more expensive, not less.

There is one rule, and it is about ratios:

> **Delegate when the input dwarfs the output.**
> A job that reads 40,000 characters of log and answers in one sentence is worth spawning, because
> the caller never pays for the 40,000. A job that needs the caller's context explained back to it
> is not.

### Worth it

| Job | Input | Output | Agent |
|---|---|---|---|
| Why is CI red | job logs, tens of thousands of chars | one sentence | `ci-doctor` |
| What does this constant do to balance | 4 × 400-run simulation | one table | `balance-sweeper` |
| Does the UI actually work | browser logs, DOM, screenshots | a short findings list | `playtester` |
| Where is X handled across the repo | many files | 3 line references | built-in `Explore` |

### Not worth it

- **Anything under a few minutes of work.** The brief costs more than the task.
- **Work that depends on a decision you have not made yet.** You will brief it twice.
- **Sequential steps.** Two agents that must run in order are one agent with extra hand-offs.
- **Anything needing the conversation's history.** A sub-agent cannot see it, and re-explaining it
  is the expensive path.
- **Finding a definition.** `node scripts/agent/map.mjs` answers it for near-zero cost. Only reach
  for `Explore` when the question is about behaviour spread across files, not about a location.
- **Writing small batches of text.** `content-author` says so itself: under ~20 entries, inline it.

### What makes a cold start cheap here

The three things a sub-agent needs to be productive already exist, which is what makes any of this
viable:

1. `CLAUDE.md` is ~1,300 tokens and is loaded automatically.
2. `npm run map` replaces exploration with one call.
3. `npm run verify` replaces four commands, and gets the `tsc` trap right.

So a good brief is short: *what to do, what shape to answer in, and which of these three to run.*
If you find yourself writing more than about fifteen lines of brief, the job probably was not
separable.

### Briefing rules

- **Name the output shape.** Every agent in `.claude/agents/` ends with an exact template. An agent
  that returns prose forces the caller to read and re-summarise it — that is the cost you were
  trying to avoid.
- **Say what not to do.** "Do not fix anything", "do not paste the log", "restore the constant".
  Scope creep in a sub-agent is invisible until it lands.
- **Give the known traps.** `ci-doctor` knows the Pages-stall signature; without it, it would
  rediscover it by rewriting a correct workflow.
- **Do not downgrade the model for judgement work.** Cheap models are right for reading logs and
  running loops. They are wrong for writing the game's voice — `content-author` stays on the strong
  model deliberately, and says why.
- **Relay what matters.** A sub-agent's report is not shown to the user. Summarise it; do not
  forward it verbatim.

### Parallelism

Independent jobs can run at once — a balance sweep and a playtest do not touch each other. Two jobs
that write to the same files cannot, and will produce a merge you have to untangle by hand. Check
for file overlap before spawning in parallel, not after.

## Budget per chantier

| Item | Target |
|---|---|
| Full file reads | ≤ 4 (prefer `map.mjs`, then targeted ranges) |
| Full verification cycles | 1 |
| Bulk edits | as many as needed — that is the lever |
| Commit + push | once, at the end, green |
