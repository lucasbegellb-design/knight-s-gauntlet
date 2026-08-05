import type { Rarity } from './rarity';

/**
 * Declarative combat modifiers a relic (or equipped item) can contribute.
 * Kept as a flat, additive vocabulary rather than per-relic scripted effects:
 * simpler to aggregate and test, while still letting independent relics
 * compound multiplicatively across different stages of damage resolution
 * (e.g. a flat damage boost, a crit chance, and a crit damage boost all
 * multiply together in practice even though each is "just" additive within
 * its own kind). See DESIGN_NOTES.md for the Phase 3 write-up.
 */
export type RelicModifierKind =
  | 'damageMultiplier'
  | 'flatDamageBonus'
  | 'critChance'
  | 'critDamageMultiplier'
  | 'burnChance'
  | 'burnDamageMultiplier'
  | 'critBurnBonusMultiplier'
  | 'lifestealPercent'
  | 'executeThreshold'
  | 'reflectDamagePercent'
  | 'attackSpeedMultiplier'
  | 'maxHpBonusPercent'
  | 'goldMultiplier'
  | 'xpMultiplier'
  | 'regenPerWave';

export interface RelicModifier {
  kind: RelicModifierKind;
  value: number;
}

export type RelicTag = 'fire' | 'crit' | 'blood' | 'economy' | 'speed' | 'vitality' | 'forge';

export type RelicStacking = 'stackable' | 'unique';

export interface RelicDefinition {
  id: string;
  name: string;
  rarity: Rarity;
  tags: RelicTag[];
  description: string;
  stacking: RelicStacking;
  modifiers: RelicModifier[];
  /**
   * Bespoke, non-declarative behavior for capstone relics. Handled by special-cased engine code, not the modifier pipeline.
   * - `phoenixRevive`: one-time revive at half health (CombatEngine.ts + WaveManager.tryPhoenixRevive).
   * - `brokenBladeDamage`: damageMultiplier that scales with this run's Broken Parts total (WaveManager.computeModifiers).
   */
  special?: 'phoenixRevive' | 'brokenBladeDamage';
}
