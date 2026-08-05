import { describe, expect, it } from 'vitest';
import { WaveManager, DEFAULT_META_BONUSES } from './WaveManager';
import { knight } from '../data/hero';

const SEED_COUNT = 100;
const MAX_TICKS = 4000;
const TICK_MS = 200;
const TARGET_WAVE = 10;

/**
 * Reproduces the "always take loot option 0" naive-strategy run referenced
 * in CLAUDE.md's balance notes, now committed so it's rerunnable rather than
 * ad hoc. Not a play-skill benchmark — a floor: if a player who never makes
 * a meaningful choice still can't get reasonably far, the curve is too harsh.
 */
function runNaiveSeed(seed: number): { deathWave: number; reachedTarget: boolean } {
  const manager = new WaveManager(knight, seed, DEFAULT_META_BONUSES);

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

describe('balance simulation (naive always-pick-option-0 strategy)', () => {
  it('reaches a reasonable survival rate past wave 10 across 100 seeded runs', () => {
    const results = Array.from({ length: SEED_COUNT }, (_, i) => runNaiveSeed(i + 1));
    const survivors = results.filter((r) => r.reachedTarget).length;

    const histogram = new Map<number, number>();
    for (const r of results) {
      histogram.set(r.deathWave, (histogram.get(r.deathWave) ?? 0) + 1);
    }
    const sortedHistogram = [...histogram.entries()].sort((a, b) => a[0] - b[0]);
    console.log(
      `[balanceSim] survivors past wave ${TARGET_WAVE}: ${survivors}/${SEED_COUNT}\n` +
        `[balanceSim] death-wave histogram: ${sortedHistogram.map(([wave, count]) => `w${wave}:${count}`).join(', ')}`,
    );

    // Floor, not a target — guards against the curve regressing back toward the
    // pre-tuning ~0/60 baseline documented in CLAUDE.md, not a claim this is optimal.
    expect(survivors).toBeGreaterThanOrEqual(40);
  });
});
