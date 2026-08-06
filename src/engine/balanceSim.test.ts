import { describe, expect, it } from 'vitest';
import { WaveManager, DEFAULT_META_BONUSES, type MetaBonuses } from './WaveManager';
import { scaleHeroDefinition } from './heroProgression';
import { knight } from '../data/hero';
import { allClasses } from '../data/classes';
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
function runNaiveSeed(hero: HeroDefinition, seed: number, meta: MetaBonuses): { deathWave: number; reachedTarget: boolean } {
  const manager = new WaveManager(hero, seed, meta);

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

function survivalRate(hero: HeroDefinition, meta: MetaBonuses): { survivors: number; median: number } {
  const results = Array.from({ length: SEED_COUNT }, (_, i) => runNaiveSeed(hero, i + 1, meta));
  const survivors = results.filter((r) => r.reachedTarget).length;
  const waves = results.map((r) => r.deathWave).sort((a, b) => a - b);
  return { survivors, median: waves[Math.floor(waves.length / 2)] as number };
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
    console.log(
      `[balanceSim]\n  ${results
        .map((r) => `${r.classDef.name}(${r.classDef.element}): ${r.survivors}/${SEED_COUNT} survivors, median death w${r.median}`)
        .join('\n  ')}`,
    );

    for (const { classDef, survivors } of results) {
      // Floor, not a target — guards against the curve regressing back toward the
      // pre-tuning ~0/60 baseline documented in CLAUDE.md, not a claim this is optimal.
      expect(survivors, `${classDef.name} fell below the survival floor`).toBeGreaterThanOrEqual(40);
    }
  });

  it('keeps the elementless baseline hero playable (regression guard for neutral units)', () => {
    const { survivors } = survivalRate(knight, DEFAULT_META_BONUSES);
    expect(survivors).toBeGreaterThanOrEqual(40);
  });
});
