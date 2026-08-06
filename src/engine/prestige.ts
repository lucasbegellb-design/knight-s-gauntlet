import { sigilRegistry, type SigilEffectKind } from '../data/prestige';

/**
 * Prestige — the Sealed Record.
 *
 * The long-term arc the game did not have. Every existing meta system tops out: talents cap, the
 * Forge caps, companion ranks cap, and the Kingdom's Treasury is an unbounded percentage sink that
 * stops meaning anything long before it stops accepting essence. Past that point a player has
 * nothing left to do but replay the same run with the same rules.
 *
 * Sealing a record ends that profile and starts a new one. In fiction it is the only thing the
 * Forge was ever certain about: a candidate that stops producing new data is archived, and the
 * apparatus begins another. See LORE.md.
 *
 * What survives a seal is the design statement. **Collection is never taken away** — the gacha
 * roster, ascension levels paid for with shards, the Grimoire, and the Hall of Echoes all persist,
 * because taking back what a player collected is the one thing that makes prestige feel like
 * punishment rather than progress. What resets is everything that was bought with essence, which
 * is precisely the progression that had run out of things to buy.
 *
 * Sigils are earned from the deepest wave ever reached, not from currency held, so the reward is
 * for playing well rather than for idling long.
 */

/** Deepest single-run wave required before a record can be sealed at all. */
export const PRESTIGE_MIN_DEEPEST_WAVE = 40;

/** Waves per Sigil, past the entry threshold. */
const WAVES_PER_SIGIL = 10;
/** Sigils granted just for qualifying, so a first seal is never a formality for zero reward. */
const BASE_SIGIL_REWARD = 3;

export interface PrestigeState {
  /** How many records have been sealed. */
  count: number;
  /** Unspent Sigils. */
  sigils: number;
  /** Purchased level per sigil upgrade id. */
  upgrades: Record<string, number>;
  /** Deepest wave reached in any single run since the last seal. */
  deepestWave: number;
}

export const EMPTY_PRESTIGE: PrestigeState = { count: 0, sigils: 0, upgrades: {}, deepestWave: 0 };

/** Whether a record can be sealed yet. */
export function canSealRecord(deepestWave: number): boolean {
  return deepestWave >= PRESTIGE_MIN_DEEPEST_WAVE;
}

/** Sigils a seal would pay out right now. Zero below the threshold, so the UI can show the gap. */
export function sigilReward(deepestWave: number): number {
  if (!canSealRecord(deepestWave)) return 0;
  return BASE_SIGIL_REWARD + Math.floor((deepestWave - PRESTIGE_MIN_DEEPEST_WAVE) / WAVES_PER_SIGIL);
}

/** Total Sigils spent on a given upgrade set — used to price a respec or validate a save. */
export function sigilsSpent(upgrades: Record<string, number>): number {
  return Object.entries(upgrades).reduce((total, [id, level]) => {
    const def = sigilRegistry.tryGet(id);
    return def ? total + def.cost * Math.min(level, def.maxLevel) : total;
  }, 0);
}

/**
 * The run-shaping constants a prestige profile edits, resolved once and handed to WaveManager.
 *
 * Deliberately a plain value object rather than another `RelicModifier[]`: these are not stat
 * bonuses that belong in the aggregation pipeline, they are the *rules* a run is assembled from,
 * and routing them through the modifier sum would have been the exact mistake this layer exists
 * to avoid.
 */
export interface PrestigeRules {
  extraLootOptions: number;
  extraSquadSlots: number;
  /** 0..1 of the Brave Burst gauge already filled when a wave starts. */
  burstHeadStart: number;
  /** Waves subtracted from the Echo interval. */
  echoCadenceReduction: number;
  startingRelics: number;
  /** 0..1 of a run's gold additionally banked as essence. */
  carriedFortune: number;
}

export const NEUTRAL_PRESTIGE_RULES: PrestigeRules = {
  extraLootOptions: 0,
  extraSquadSlots: 0,
  burstHeadStart: 0,
  echoCadenceReduction: 0,
  startingRelics: 0,
  carriedFortune: 0,
};

const RULE_KEY_BY_KIND: Record<SigilEffectKind, keyof PrestigeRules> = {
  lootOptions: 'extraLootOptions',
  squadSlots: 'extraSquadSlots',
  burstHeadStart: 'burstHeadStart',
  echoCadence: 'echoCadenceReduction',
  startingRelics: 'startingRelics',
  carriedFortune: 'carriedFortune',
};

/** Folds purchased sigil levels into the rule set a run is built with. */
export function resolvePrestigeRules(upgrades: Record<string, number>): PrestigeRules {
  const rules: PrestigeRules = { ...NEUTRAL_PRESTIGE_RULES };

  for (const [id, level] of Object.entries(upgrades)) {
    const def = sigilRegistry.tryGet(id);
    if (!def || level <= 0) continue;
    const clamped = Math.min(level, def.maxLevel);
    rules[RULE_KEY_BY_KIND[def.kind]] += def.valuePerLevel * clamped;
  }

  // A burst that starts full would fire on wave start before the player could ever reach it, which
  // turns the one interactive moment in the game into an automatic one.
  rules.burstHeadStart = Math.min(0.85, rules.burstHeadStart);
  return rules;
}
