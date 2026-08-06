import type { Rarity } from './rarity';
import type { Element } from '../engine/elements';

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

/**
 * A predicate over the live fight, evaluated per hit. `per*` kinds return a count rather than a
 * yes/no, which is what lets one relic express "+8% damage for every relic you own" without a
 * separate vocabulary. Resolved in `src/engine/conditionals.ts`.
 */
export type ModifierCondition =
  | { kind: 'always' }
  | { kind: 'onCrit' }
  | { kind: 'attackerBelowHalfHp' }
  | { kind: 'attackerAboveThreeQuarterHp' }
  | { kind: 'targetBelowHalfHp' }
  | { kind: 'targetAboveHalfHp' }
  | { kind: 'elementAdvantage' }
  | { kind: 'elementDisadvantage' }
  | { kind: 'vsElement'; element: Element }
  | { kind: 'perRelicOwned' }
  | { kind: 'perWaveCleared' }
  | { kind: 'perMissingHpTenth' }
  | { kind: 'perSquadElement'; element: Element }
  | { kind: 'perDistinctSquadElement' };

/**
 * The multiplicative half of the relic vocabulary. Where `RelicModifier` values all land in one
 * flat additive sum per kind, a conditional's `damageMultiplier` composes as a *product* across
 * relics — so two modest-looking relics can be large together. That interaction is the whole
 * point; see the module comment in `src/engine/conditionals.ts`.
 */
export interface ConditionalModifier {
  condition: ModifierCondition;
  /** Multiplies the hit's damage. 0.2 means x1.2 per stack of the condition. */
  damageMultiplier?: number;
  /** Flat damage added before multipliers. */
  flatDamage?: number;
  /** Crit chance added on top of the flat pipeline's own, for this hit. */
  critChance?: number;
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
  /** Conditional, multiplicative effects — the combo layer. See `ConditionalModifier`. */
  conditionals?: ConditionalModifier[];
  /**
   * Bespoke, non-declarative behavior for capstone relics. Handled by special-cased engine code, not the modifier pipeline.
   * - `phoenixRevive`: one-time revive at half health (CombatEngine.ts + WaveManager.tryPhoenixRevive).
   * - `brokenBladeDamage`: damageMultiplier that scales with this run's Broken Parts total (WaveManager.computeModifiers).
   */
  special?: 'phoenixRevive' | 'brokenBladeDamage';
}
