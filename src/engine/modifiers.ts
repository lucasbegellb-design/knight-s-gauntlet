import type { RelicModifier } from '../data/relic.types';

export interface AggregatedModifiers {
  damageMultiplierSum: number;
  flatDamageBonusSum: number;
  critChanceSum: number;
  critDamageMultiplierSum: number;
  burnChanceSum: number;
  burnDamageMultiplierSum: number;
  critBurnBonusMultiplierSum: number;
  lifestealPercentSum: number;
  executeThresholdSum: number;
  reflectDamagePercentSum: number;
  attackSpeedMultiplierSum: number;
  maxHpBonusPercentSum: number;
  goldMultiplierSum: number;
  xpMultiplierSum: number;
  regenPerWaveSum: number;
}

export const NEUTRAL_MODIFIERS: AggregatedModifiers = {
  damageMultiplierSum: 0,
  flatDamageBonusSum: 0,
  critChanceSum: 0,
  critDamageMultiplierSum: 0,
  burnChanceSum: 0,
  burnDamageMultiplierSum: 0,
  critBurnBonusMultiplierSum: 0,
  lifestealPercentSum: 0,
  executeThresholdSum: 0,
  reflectDamagePercentSum: 0,
  attackSpeedMultiplierSum: 0,
  maxHpBonusPercentSum: 0,
  goldMultiplierSum: 0,
  xpMultiplierSum: 0,
  regenPerWaveSum: 0,
};

export interface ModifierSource {
  modifiers: RelicModifier[];
  /** How many times this source's modifiers apply (owned stack count; always 1 for equipment/unique relics). */
  count: number;
}

/** Sums every modifier across every source into one aggregate, keyed by `${kind}Sum`. */
export function aggregateModifiers(sources: ModifierSource[]): AggregatedModifiers {
  const aggregate: AggregatedModifiers = { ...NEUTRAL_MODIFIERS };

  for (const source of sources) {
    for (const modifier of source.modifiers) {
      const key = `${modifier.kind}Sum` as keyof AggregatedModifiers;
      aggregate[key] += modifier.value * source.count;
    }
  }

  return aggregate;
}
