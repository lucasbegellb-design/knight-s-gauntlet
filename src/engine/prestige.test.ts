import { describe, expect, it } from 'vitest';
import {
  EMPTY_PRESTIGE,
  NEUTRAL_PRESTIGE_RULES,
  PRESTIGE_MIN_DEEPEST_WAVE,
  canSealRecord,
  resolvePrestigeRules,
  sigilReward,
  sigilsSpent,
} from './prestige';
import { WaveManager, DEFAULT_META_BONUSES, type MetaBonuses } from './WaveManager';
import { allSigilUpgrades, sigilRegistry } from '../data/prestige';
import { knight } from '../data/hero';

describe('sealing a record', () => {
  it('is locked until the entry threshold', () => {
    expect(canSealRecord(PRESTIGE_MIN_DEEPEST_WAVE - 1)).toBe(false);
    expect(canSealRecord(PRESTIGE_MIN_DEEPEST_WAVE)).toBe(true);
    expect(sigilReward(PRESTIGE_MIN_DEEPEST_WAVE - 1)).toBe(0);
  });

  it('pays a base reward at the threshold and more for depth', () => {
    const atThreshold = sigilReward(PRESTIGE_MIN_DEEPEST_WAVE);
    expect(atThreshold).toBeGreaterThan(0);
    expect(sigilReward(PRESTIGE_MIN_DEEPEST_WAVE + 30)).toBeGreaterThan(atThreshold);
  });

  it('rewards depth, never currency held — a seal must pay for playing, not for idling', () => {
    // Guard on the signature itself: the reward function takes only a wave number, so there is no
    // way for essence or idle time to leak into it.
    expect(sigilReward.length).toBe(1);
  });
});

describe('sigil catalogue', () => {
  it('never sells a raw stat bonus', () => {
    // The rule the whole layer exists to enforce. Every other system in the game already sells
    // percentages; a prestige tree that did too would be a treadmill wearing a hat.
    const statKinds = ['damageMultiplier', 'critChance', 'maxHpBonusPercent', 'attackSpeedMultiplier', 'lifestealPercent'];
    for (const upgrade of allSigilUpgrades) {
      expect(statKinds, `${upgrade.id} sells a stat bonus`).not.toContain(upgrade.kind as string);
    }
  });

  it('gives every upgrade a flavor line and a bounded level', () => {
    for (const upgrade of allSigilUpgrades) {
      expect(upgrade.flavor, `${upgrade.id} has no flavor`).toBeTruthy();
      expect(upgrade.maxLevel).toBeGreaterThan(0);
      expect(upgrade.cost).toBeGreaterThan(0);
    }
  });

  it('prices a purchased set from the registry', () => {
    const wider = sigilRegistry.get('wider_offering');
    expect(sigilsSpent({ wider_offering: 2 })).toBe(wider.cost * 2);
    expect(sigilsSpent({ wider_offering: 99 })).toBe(wider.cost * wider.maxLevel);
    expect(sigilsSpent({ nonexistent: 5 })).toBe(0);
  });
});

describe('resolvePrestigeRules', () => {
  it('is neutral for a fresh profile', () => {
    expect(resolvePrestigeRules(EMPTY_PRESTIGE.upgrades)).toEqual(NEUTRAL_PRESTIGE_RULES);
  });

  it('accumulates levels of the same upgrade', () => {
    expect(resolvePrestigeRules({ wider_offering: 2 }).extraLootOptions).toBe(2);
  });

  it('clamps a level beyond the upgrade’s maximum', () => {
    const def = sigilRegistry.get('wider_offering');
    expect(resolvePrestigeRules({ wider_offering: 50 }).extraLootOptions).toBe(def.valuePerLevel * def.maxLevel);
  });

  it('never lets the burst head start arm the gauge before a fight begins', () => {
    expect(resolvePrestigeRules({ primed_gauge: 99 }).burstHeadStart).toBeLessThan(1);
  });

  it('ignores unknown ids rather than throwing on a stale save', () => {
    expect(resolvePrestigeRules({ removed_upgrade: 3 })).toEqual(NEUTRAL_PRESTIGE_RULES);
  });
});

describe('prestige rules in a run', () => {
  const withRules = (upgrades: Record<string, number>): MetaBonuses => ({
    ...DEFAULT_META_BONUSES,
    prestigeRules: resolvePrestigeRules(upgrades),
  });

  it('offers more loot options with Wider Offering', () => {
    const advance = (manager: WaveManager): number => {
      for (let i = 0; i < 4000; i++) {
        const state = manager.getRunState();
        if (state.isGameOver) break;
        if (state.isChoosingLoot) return state.lootOptions.length;
        manager.tick(200);
      }
      return 0;
    };

    expect(advance(new WaveManager(knight, 1, withRules({ wider_offering: 2 })))).toBe(
      advance(new WaveManager(knight, 1, DEFAULT_META_BONUSES)) + 2,
    );
  });

  it('widens the squad with The Fourth Chair', () => {
    const roster = ['camp_bard', 'iron_vanguard', 'ember_wisp', 'hearthkeeper'];
    const base = new WaveManager(knight, 1, DEFAULT_META_BONUSES, {}, roster, roster);
    const widened = new WaveManager(knight, 1, withRules({ fourth_chair: 1 }), {}, roster, roster);

    expect(base.getRunState().companions).toHaveLength(3);
    expect(widened.getRunState().companions).toHaveLength(4);
  });

  it('starts the burst gauge partly filled with Primed Gauge', () => {
    const primed = new WaveManager(knight, 1, withRules({ primed_gauge: 1 }));
    expect(primed.getCombatState().burstGauge).toBeGreaterThan(0);
    expect(new WaveManager(knight, 1, DEFAULT_META_BONUSES).getCombatState().burstGauge).toBe(0);
  });

  it('grants an opening hand of relics with Issued Kit', () => {
    const equipped = new WaveManager(knight, 1, withRules({ issued_kit: 3 }));
    expect(equipped.getRunState().ownedRelics.length).toBeGreaterThan(0);
    expect(new WaveManager(knight, 1, DEFAULT_META_BONUSES).getRunState().ownedRelics).toEqual([]);
  });

  it('reproduces the same opening hand for the same seed', () => {
    const a = new WaveManager(knight, 42, withRules({ issued_kit: 3 })).getRunState().ownedRelics;
    const b = new WaveManager(knight, 42, withRules({ issued_kit: 3 })).getRunState().ownedRelics;
    expect(a).toEqual(b);
  });

  it('brings Echo waves forward with Closer Mirror', () => {
    // Base cadence is 15; three waves sooner makes wave 12 a mirror match.
    const manager = new WaveManager(knight, 1, withRules({ closer_mirror: 1 }));
    const casted = manager as unknown as { buildWaveEngine: (wave: number) => unknown };
    casted.buildWaveEngine(12);
    expect(manager.getRunState().isEcho).toBe(true);
  });

  it('leaves a neutral profile playing exactly as before', () => {
    const plain = new WaveManager(knight, 9, DEFAULT_META_BONUSES);
    expect(plain.getRunState().ownedRelics).toEqual([]);
    expect(plain.getCombatState().burstGauge).toBe(0);
    expect(plain.squadCapacity()).toBe(3);
  });
});
