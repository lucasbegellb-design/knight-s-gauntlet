import type { RelicModifier } from '../data/relic.types';

/**
 * The Solitary Trial — the compensation an understrength party fights with.
 *
 * Squad selection made bringing companions correct and going alone merely worse, which the
 * harness measured bluntly: 52-64/100 survivors solo against 100/100 with a led squad. The gap
 * is not a tuning slip, it is structural. A solo hero has one attack timer against four, takes
 * every incoming hit because there is nobody to pull aggro, has no Leader Skill, and contributes
 * one striker to a Brave Burst instead of four. No amount of raising the hero's base numbers
 * addresses an action-economy deficit — it just makes a bad trade slightly less bad.
 *
 * So the compensation is shaped like the deficit. Empty roster slots grant attack speed (the
 * missing timers), damage (the missing strikers), max HP and lifesteal (the missing bodies). It
 * scales continuously per empty slot rather than switching on at zero companions, so a two-
 * companion squad is a real intermediate choice and not a rounding error.
 *
 * Two deliberate consequences:
 *
 *  - It is recomputed every wave from *living* companions, so losing the party mid-run ramps the
 *    hero up as it happens. A run that is going badly gets a last-stand curve instead of a spiral,
 *    and it reads as narrative rather than as rubber-banding.
 *  - It is deliberately tuned to leave solo *below* a led squad. Bringing companions must stay the
 *    stronger play or the gacha, the roster and the entire squad screen become decoration. The
 *    goal is a viable second way to play, not parity.
 *
 * Thematically this is the Gauntlet doing what it was built to do: it is a test apparatus, and it
 * calibrates to the candidate that walked in. See LORE.md.
 */

/** Per empty companion slot. Multiplied by the number of missing companions. */
export const SOLITUDE_PER_EMPTY_SLOT: Readonly<Record<string, number>> = {
  /** Replaces missing strikers. */
  damageMultiplier: 0.042,
  /** Replaces missing attack timers — the core of the action-economy gap. */
  attackSpeedMultiplier: 0.036,
  /** Replaces missing bodies to soak hits. */
  maxHpBonusPercent: 0.048,
  /** Replaces the healer that isn't there. */
  lifestealPercent: 0.0105,
};

/**
 * Modifiers for a party missing `maxCompanions - livingCompanions` members.
 * Returns an empty list for a full party, so a complete squad is bit-for-bit unaffected.
 */
export function resolveSolitudeModifiers(livingCompanions: number, maxCompanions: number): RelicModifier[] {
  const emptySlots = Math.max(0, Math.min(maxCompanions, maxCompanions - livingCompanions));
  if (emptySlots === 0) return [];

  return Object.entries(SOLITUDE_PER_EMPTY_SLOT).map(([kind, value]) => ({
    kind: kind as RelicModifier['kind'],
    value: value * emptySlots,
  }));
}

/** How complete the party is, 0..1 — surfaced to the HUD so the bonus is legible rather than mysterious. */
export function partyStrength(livingCompanions: number, maxCompanions: number): number {
  if (maxCompanions <= 0) return 1;
  return Math.max(0, Math.min(1, livingCompanions / maxCompanions));
}
