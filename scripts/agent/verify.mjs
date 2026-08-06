#!/usr/bin/env node
/**
 * One command for "is the tree green".
 *
 * Exists because the obvious way to typecheck this repo is wrong. `npx tsc --noEmit` uses the root
 * tsconfig, which is `{ files: [], references: [...] }` — it checks *nothing* and exits 0. Only
 * `tsc -b` walks the project references and sees `src/**` and the test files. A whole session was
 * spent trusting a green `tsc --noEmit` while `npm run build` failed on errors it never looked at.
 *
 * Stages run cheapest-first and stop at the first failure, so a typo costs a lint run rather than a
 * lint + typecheck + 246 tests + a production build. Output is one line per passing stage; a
 * failing stage prints its own output and nothing else does.
 *
 *   node scripts/agent/verify.mjs           # lint, typecheck, test, build
 *   node scripts/agent/verify.mjs --fast    # skip the production build
 *   node scripts/agent/verify.mjs --only=test
 */
import { spawnSync } from 'node:child_process';

const args = process.argv.slice(2);
const fast = args.includes('--fast');
const only = args.find((a) => a.startsWith('--only='))?.slice('--only='.length);

const STAGES = [
  { name: 'lint', cmd: 'npm', args: ['run', 'lint'] },
  // `tsc -b`, never `tsc --noEmit` — see the header.
  { name: 'typecheck', cmd: 'npx', args: ['tsc', '-b'] },
  { name: 'test', cmd: 'npx', args: ['vitest', 'run'] },
  { name: 'build', cmd: 'npx', args: ['vite', 'build'], skip: () => fast },
];

/** Pulls the few lines that actually say what happened out of a noisy tool's output. */
function summarise(name, output) {
  const lines = output.split('\n');
  if (name === 'test') {
    const found = lines.filter((l) => /Test Files|Tests\s+\d|✓ src|× /.test(l));
    return found.slice(-3).join('\n');
  }
  if (name === 'build') {
    return lines.filter((l) => /built in|error/i.test(l)).slice(-2).join('\n');
  }
  return lines.filter(Boolean).slice(-3).join('\n');
}

let failed = false;
for (const stage of STAGES) {
  if (only && stage.name !== only) continue;
  if (stage.skip?.()) continue;

  const started = Date.now();
  const result = spawnSync(stage.cmd, stage.args, { encoding: 'utf8', shell: false });
  const output = `${result.stdout ?? ''}${result.stderr ?? ''}`;
  const seconds = ((Date.now() - started) / 1000).toFixed(1);

  if (result.status !== 0) {
    console.log(`✗ ${stage.name} (${seconds}s)\n`);
    // Failures print in full: this is the one moment an agent needs every line.
    console.log(output.trim());
    failed = true;
    break;
  }

  const summary = summarise(stage.name, output);
  console.log(`✓ ${stage.name} (${seconds}s)${summary ? ` — ${summary.replace(/\s+/g, ' ').trim()}` : ''}`);
}

process.exit(failed ? 1 : 0);
