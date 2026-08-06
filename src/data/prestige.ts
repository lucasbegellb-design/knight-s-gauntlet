import { Registry } from './registry';

/**
 * Sigil upgrades — the prestige layer's catalogue.
 *
 * The rule this file exists to enforce: **a Sigil buys a rule change, never a bigger number.**
 *
 * Every other progression system in the game already sells percentages. Talents, the Forge, the
 * Forge Weapon, the Kingdom and companion ranks all resolve into the same flat `${kind}Sum`
 * pipeline, and a prestige layer that sold more of the same would be a treadmill wearing a hat —
 * you would reset a pile of multipliers to earn a slightly larger pile of multipliers. That is the
 * failure mode of most idle prestige and it is worth naming so nobody adds `+5% damage` here later.
 *
 * Instead each upgrade edits a constant the run is built out of: how many loot options you are
 * offered, how many companions fit in a squad, when the Brave Burst arms, how often the Gauntlet
 * makes you fight yourself. A player two prestiges deep is not playing the same run with better
 * numbers; they are playing a run with different rules.
 *
 * Costs are flat per level rather than exponential — these are meant to be collected, and there
 * are few enough of them that the ceiling is a real destination rather than an asymptote.
 */
export type SigilEffectKind =
  /** Extra loot options offered after each wave. */
  | 'lootOptions'
  /** Extra companion slots in a squad. */
  | 'squadSlots'
  /** Fraction of the Brave Burst gauge skipped, so it arms sooner. */
  | 'burstHeadStart'
  /** Waves subtracted from the Echo interval — more mirror matches, so a faster-growing ladder. */
  | 'echoCadence'
  /** Relics granted at the very start of a run. */
  | 'startingRelics'
  /** Fraction of a run's gold that survives into the next one as essence. */
  | 'carriedFortune';

export interface SigilUpgrade {
  id: string;
  name: string;
  /** What it changes, mechanically. */
  description: string;
  /** What it is, per LORE.md's writing rules. */
  flavor: string;
  kind: SigilEffectKind;
  /** Effect magnitude granted per level. */
  valuePerLevel: number;
  maxLevel: number;
  /** Sigils per level. Flat — see the file comment. */
  cost: number;
}

export const sigilRegistry = new Registry<SigilUpgrade>();

sigilRegistry.registerAll([
  {
    id: 'wider_offering',
    name: 'Wider Offering',
    description: '+1 loot option after every wave.',
    flavor: 'The Forge stops rationing. It was never sure why it started.',
    kind: 'lootOptions',
    valuePerLevel: 1,
    maxLevel: 2,
    cost: 3,
  },
  {
    id: 'fourth_chair',
    name: 'The Fourth Chair',
    description: '+1 companion slot in your squad.',
    flavor: 'Someone recalculated the spec. There was always room for one more.',
    kind: 'squadSlots',
    valuePerLevel: 1,
    maxLevel: 2,
    cost: 6,
  },
  {
    id: 'primed_gauge',
    name: 'Primed Gauge',
    description: 'The Brave Burst gauge starts each wave 20% full.',
    flavor: 'The squad walks in already angry. Efficient, if nothing else.',
    kind: 'burstHeadStart',
    valuePerLevel: 0.2,
    maxLevel: 3,
    cost: 4,
  },
  {
    id: 'closer_mirror',
    name: 'Closer Mirror',
    description: 'Echo waves arrive 3 waves sooner, so the Hall of Echoes fills faster.',
    flavor: 'The archive is getting impatient to show you what it has.',
    kind: 'echoCadence',
    valuePerLevel: 3,
    maxLevel: 3,
    cost: 5,
  },
  {
    id: 'issued_kit',
    name: 'Issued Kit',
    description: 'Begin every run already carrying 1 random relic.',
    flavor: 'Requisitions finally processed. Four hundred years is not bad for that department.',
    kind: 'startingRelics',
    valuePerLevel: 1,
    maxLevel: 3,
    cost: 4,
  },
  {
    id: 'carried_fortune',
    name: 'Carried Fortune',
    description: '25% of a run’s gold is banked as essence on top of the usual deposit.',
    flavor: 'You are allowed to keep the change. Nobody signed off on this.',
    kind: 'carriedFortune',
    valuePerLevel: 0.25,
    maxLevel: 2,
    cost: 3,
  },
]);

export const allSigilUpgrades = sigilRegistry.all();
