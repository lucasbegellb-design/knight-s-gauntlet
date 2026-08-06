import { describe, expect, it } from 'vitest';
import { WaveManager, DEFAULT_META_BONUSES, type MetaBonuses } from './WaveManager';
import { scaleHeroDefinition } from './heroProgression';
import { knight } from '../data/hero';
import { allClasses } from '../data/classes';
import { allCompanions } from '../data/companions';
import type { HeroDefinition } from '../data/hero.types';

const SEED_COUNT = 100;
const MAX_TICKS = 4000;
const TICK_MS = 200;
const TARGET_WAVE = 10;

/**
 * Reproduces the "always take loot option 0" naive-strategy run referenced
 * in CLAUDE.md's balance notes, now committed so it's rerunnable rather than
 * ad hoc. Not a play-skill benchmark — a floor: if a player who never makes
 * a meaningful choice still can't get reasonably far, the curve is too harsh.
 *
 * Since the elemental affinity pass, the harness runs **per class** rather than
 * against the bare `knight` definition: a class carries an element into the run,
 * and elemental match-ups against the zone's monster pool are now a real source
 * of variance. Running only the elementless base hero would silently stop
 * covering the system that most affects the curve.
 */
function runNaiveSeed(
  hero: HeroDefinition,
  seed: number,
  meta: MetaBonuses,
  squad: string[] = [],
): { deathWave: number; reachedTarget: boolean } {
  const manager = new WaveManager(hero, seed, meta, {}, allCompanions.map((c) => c.id), squad);

  for (let i = 0; i < MAX_TICKS; i++) {
    if (manager.getRunState().isGameOver) break;
    if (manager.getRunState().isChoosingLoot) {
      manager.chooseLoot(0);
    } else {
      manager.tick(TICK_MS);
    }
  }

  const state = manager.getRunState();
  const deathWave = state.waveNumber;
  return { deathWave, reachedTarget: !state.isGameOver || deathWave > TARGET_WAVE };
}

function survivalRate(hero: HeroDefinition, meta: MetaBonuses, squad: string[] = []): { survivors: number; median: number } {
  const results = Array.from({ length: SEED_COUNT }, (_, i) => runNaiveSeed(hero, i + 1, meta, squad));
  const survivors = results.filter((r) => r.reachedTarget).length;
  const waves = results.map((r) => r.deathWave).sort((a, b) => a - b);
  return { survivors, median: waves[Math.floor(waves.length / 2)] as number };
}

/**
 * vitest suppresses console.log from passing tests by default, and these numbers are the whole
 * reason the harness exists — they need to be visible on every run, not only on failure. Written
 * straight to stdout via a narrow cast rather than pulling @types/node into a browser-targeted
 * tsconfig for one call.
 */
type StdoutHost = { process?: { stdout?: { write(chunk: string): void } } };

function report(title: string, lines: string[]): void {
  const stdout = (globalThis as unknown as StdoutHost).process?.stdout;
  stdout?.write(`\n[balanceSim] ${title}\n  ${lines.join('\n  ')}\n`);
}

describe('balance simulation (naive always-pick-option-0 strategy)', () => {
  it('keeps every class above the survival floor past wave 10 across 100 seeded runs', () => {
    const results = allClasses.map((classDef) => {
      const hero = scaleHeroDefinition(knight, classDef.statMultiplier, classDef.element);
      const meta: MetaBonuses = { ...DEFAULT_META_BONUSES, classModifiers: classDef.innateModifiers };
      return { classDef, ...survivalRate(hero, meta) };
    });

    // Report every class before asserting, so a failure names the whole picture rather than
    // stopping at the first class that dipped.
    report(
      'per class (no squad)',
      results.map((r) => `${r.classDef.name}(${r.classDef.element}): ${r.survivors}/${SEED_COUNT}, median death w${r.median}`),
    );

    for (const { classDef, survivors } of results) {
      // Floor, not a target — guards against the curve regressing back toward the
      // pre-tuning ~0/60 baseline documented in CLAUDE.md, not a claim this is optimal.
      expect(survivors, `${classDef.name} fell below the survival floor`).toBeGreaterThanOrEqual(40);
    }
  });

  it('keeps the elementless baseline hero playable (regression guard for neutral units)', () => {
    const { survivors, median } = survivalRate(knight, DEFAULT_META_BONUSES);
    report('elementless baseline', [`knight: ${survivors}/${SEED_COUNT}, median death w${median}`]);
    expect(survivors).toBeGreaterThanOrEqual(40);
  });

  it('makes bringing a led squad a clear improvement over going in alone', () => {
    // The premise of pre-run squad selection: choosing a squad and a leader has to be visibly
    // better than the loot-only path, or the whole screen is decoration. Uses the two starter
    // companions plus one rare so the comparison holds for a fresh save, not just a full roster.
    const squad = ['iron_vanguard', 'stalwart_guardian', 'roguish_blade'];
    const lines: string[] = [];
    let improved = 0;

    for (const classDef of allClasses) {
      const hero = scaleHeroDefinition(knight, classDef.statMultiplier, classDef.element);
      const meta: MetaBonuses = { ...DEFAULT_META_BONUSES, classModifiers: classDef.innateModifiers };
      const alone = survivalRate(hero, meta);
      const led = survivalRate(hero, meta, squad);
      // Survivors-past-wave-10 saturates at 100/100 for a squadded run, so the meaningful signal
      // is how much deeper the run gets, not whether it clears the old checkpoint.
      if (led.median > alone.median) improved += 1;
      lines.push(
        `${classDef.name}: alone ${alone.survivors}/${SEED_COUNT} median w${alone.median}` +
          ` -> led squad ${led.survivors}/${SEED_COUNT} median w${led.median}`,
      );
    }

    report('squad vs solo', lines);

    // The design invariant this whole balance pass hangs on. Going alone must stay *viable* — the
    // Solitary Trial exists for that — but bringing a squad must stay *better*, or the gacha, the
    // roster and the entire squad screen become decoration. This is the assertion that catches a
    // solo buff going too far, which the floor check above structurally cannot: a floor only ever
    // notices things getting weaker.
    expect(improved, 'bringing a led squad must push every class deeper into the run than going alone').toBe(
      allClasses.length,
    );
  });
});
