#!/usr/bin/env node
/**
 * A generated map of the codebase: every exported symbol, with the file and line it lives on.
 *
 * The single biggest token sink in an agent session on this repo is *finding things*. Locating
 * `computeModifiers`, or the loot-option constant, or where monster views are built, costs a
 * handful of greps each time — and the files worth grepping are large (CombatScene is ~1000 lines,
 * WaveManager ~950), so a miss means reading a chunk to re-orient.
 *
 * This prints the whole answer in one call, roughly 150 lines. It is generated rather than written
 * down because a hand-maintained map is a map that is wrong by the third commit.
 *
 *   node scripts/agent/map.mjs              # everything
 *   node scripts/agent/map.mjs engine       # one area
 *   node scripts/agent/map.mjs --grep=burst # symbols matching a term, anywhere
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = process.cwd();
const SRC = join(ROOT, 'src');

const args = process.argv.slice(2);
const grep = args.find((a) => a.startsWith('--grep='))?.slice('--grep='.length)?.toLowerCase();
const areaFilter = args.find((a) => !a.startsWith('--'));

function walk(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...walk(full));
    else if (/\.(ts|tsx)$/.test(entry)) out.push(full);
  }
  return out;
}

/** Exported declarations, with the line each starts on. */
const EXPORT_RE = /^export\s+(?:default\s+)?(?:async\s+)?(function|const|class|interface|type|enum)\s+([A-Za-z_$][\w$]*)/;

function symbolsIn(file) {
  const lines = readFileSync(file, 'utf8').split('\n');
  const found = [];
  lines.forEach((line, index) => {
    const match = EXPORT_RE.exec(line);
    if (match) found.push({ kind: match[1], name: match[2], line: index + 1 });
  });
  return found;
}

const files = walk(SRC)
  .filter((f) => !f.endsWith('.test.ts') && !f.endsWith('.test.tsx'))
  .sort();

const byArea = new Map();
for (const file of files) {
  const rel = relative(ROOT, file);
  const area = rel.split('/')[1] ?? 'root';
  if (areaFilter && area !== areaFilter) continue;

  let symbols = symbolsIn(file);
  if (grep) symbols = symbols.filter((s) => s.name.toLowerCase().includes(grep));
  if (symbols.length === 0) continue;

  if (!byArea.has(area)) byArea.set(area, []);
  byArea.get(area).push({ rel, symbols });
}

for (const [area, entries] of [...byArea.entries()].sort()) {
  console.log(`\n## ${area}`);
  for (const { rel, symbols } of entries) {
    const names = symbols.map((s) => `${s.name}:${s.line}`).join(' ');
    console.log(`${rel}\n    ${names}`);
  }
}

// Content scale, which is what an agent usually wants to know before touching a registry.
if (!areaFilter && !grep) {
  const counts = [
    ['relics', 'src/data/relics'],
    ['monsters', 'src/data/monsters'],
    ['companions', 'src/data/companions'],
    ['classes', 'src/data/classes'],
  ];
  console.log('\n## registry sizes');
  for (const [label, dir] of counts) {
    try {
      const ids = walk(join(ROOT, dir))
        .flatMap((f) => readFileSync(f, 'utf8').match(/\bid: '[a-z_0-9]+'/g) ?? [])
        .length;
      console.log(`  ${label}: ${ids} entries`);
    } catch {
      // A registry that has been moved or renamed shouldn't take the whole map down.
    }
  }
  const tests = walk(SRC).filter((f) => /\.test\.tsx?$/.test(f)).length;
  console.log(`  test files: ${tests}`);
}

console.log('');
