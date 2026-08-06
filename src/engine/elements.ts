/**
 * Elemental affinity — the Brave Frontier wheel, adopted wholesale because it's
 * the clearest six-element system in the genre and its numbers are proven.
 *
 * Fire > Earth > Thunder > Water > Fire, with Light and Dark strong against
 * each other only. An attack into a weakness is amplified, an attack into a
 * resistance is damped, everything else is neutral.
 *
 * This is deliberately the *only* multiplicative term applied to raw attack
 * before the modifier pipeline runs — it exists to make squad composition a
 * real per-zone decision (see `zones.ts` monster pools), not to be another
 * additive stat. Units with no element (`undefined`) are neutral in both
 * directions, so any content that predates this system keeps its exact
 * pre-element behavior.
 */
export type Element = 'fire' | 'water' | 'earth' | 'thunder' | 'light' | 'dark';

export const ELEMENTS: readonly Element[] = ['fire', 'water', 'earth', 'thunder', 'light', 'dark'];

/** Each element's victim. Light/Dark are mutual, the other four form a cycle. */
const STRONG_AGAINST: Record<Element, Element> = {
  fire: 'earth',
  earth: 'thunder',
  thunder: 'water',
  water: 'fire',
  light: 'dark',
  dark: 'light',
};

/**
 * Softer than Brave Frontier's own 1.5/0.5, and re-measured after squad selection shipped.
 *
 * BF can afford the harsher spread because a player fields five units of mixed elements and swaps
 * them per stage. The obvious conclusion was that adding pre-run squad selection here would let us
 * push back toward 1.5/0.5 — it doesn't, and the harness says why. Squad runs sit at 100/100
 * survivors at *every* setting tested, so they are insensitive to the multiplier; the binding
 * constraint is the solo run, which is a supported way to play (leaving roster slots empty keeps
 * companion loot in rotation). At 1.5/0.5 the low-attack Guardian falls to exactly the harness
 * floor, 40/100, with a median death on wave 5. At 1.45/0.6 it is 47/100 and still dies on wave 5.
 *
 * So the tradeoff isn't "harsh elements vs. weak counterplay", it's "harsh elements vs. the solo
 * path existing at all". 1.35/0.75 keeps the matchup worth playing around without quietly deleting
 * a play style the squad screen explicitly offers.
 */
export const STRONG_MULTIPLIER = 1.35;
export const WEAK_MULTIPLIER = 0.75;

export type Affinity = 'strong' | 'weak' | 'neutral';

/** Human-facing element metadata; kept next to the rules so UI and engine never drift. */
export const ELEMENT_META: Record<Element, { label: string; symbol: string; color: string }> = {
  fire: { label: 'Fire', symbol: '🔥', color: '#ff6b3d' },
  water: { label: 'Water', symbol: '💧', color: '#4db2ff' },
  earth: { label: 'Earth', symbol: '🌿', color: '#7bc86c' },
  thunder: { label: 'Thunder', symbol: '⚡', color: '#ffd84d' },
  light: { label: 'Light', symbol: '✦', color: '#fff2c4' },
  dark: { label: 'Dark', symbol: '☾', color: '#b07bff' },
};

/** What `attacker` scores against `defender`. Missing element on either side is always neutral. */
export function affinityBetween(attacker?: Element, defender?: Element): Affinity {
  if (!attacker || !defender) return 'neutral';
  if (STRONG_AGAINST[attacker] === defender) return 'strong';
  if (STRONG_AGAINST[defender] === attacker) return 'weak';
  return 'neutral';
}

/** Damage scalar for an attack from `attacker`'s element into `defender`'s. */
export function affinityMultiplier(attacker?: Element, defender?: Element): number {
  const affinity = affinityBetween(attacker, defender);
  if (affinity === 'strong') return STRONG_MULTIPLIER;
  if (affinity === 'weak') return WEAK_MULTIPLIER;
  return 1;
}

/** The element this one beats — used by UI to explain a matchup without exposing the table. */
export function counters(element: Element): Element {
  return STRONG_AGAINST[element];
}

/** The element that beats this one. */
export function counteredBy(element: Element): Element {
  const found = ELEMENTS.find((candidate) => STRONG_AGAINST[candidate] === element);
  // Every element in the wheel has exactly one counter, so this is total.
  return found as Element;
}
