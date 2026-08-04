/** Passive essence trickle while away from the game (Hub idle, or the tab/app closed entirely) — a classic idle-game offline-progress mechanic. */
export const IDLE_ESSENCE_PER_HOUR = 60;
/** Caps how much can bank up unclaimed, so staying away for days isn't strictly better than checking in regularly. */
export const IDLE_ESSENCE_CAP_HOURS = 8;
export const IDLE_ESSENCE_CAP = IDLE_ESSENCE_PER_HOUR * IDLE_ESSENCE_CAP_HOURS;

/** How much idle essence has accrued since `lastCollectionAt`, capped at IDLE_ESSENCE_CAP. Pure function of two timestamps so it's cheap to call every render tick. */
export function pendingIdleEssence(lastCollectionAt: number, now: number): number {
  const elapsedHours = Math.max(0, now - lastCollectionAt) / 3_600_000;
  return Math.min(IDLE_ESSENCE_CAP, Math.floor(elapsedHours * IDLE_ESSENCE_PER_HOUR));
}
