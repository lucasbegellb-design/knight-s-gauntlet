import { describe, expect, it } from 'vitest';
import { pendingIdleEssence, IDLE_ESSENCE_PER_HOUR, IDLE_ESSENCE_CAP, IDLE_ESSENCE_CAP_HOURS } from './idleEssence';

describe('pendingIdleEssence', () => {
  it('returns 0 with no elapsed time', () => {
    expect(pendingIdleEssence(1000, 1000)).toBe(0);
  });

  it('returns 0 for a negative elapsed time (clock skew safety)', () => {
    expect(pendingIdleEssence(2000, 1000)).toBe(0);
  });

  it('accrues at IDLE_ESSENCE_PER_HOUR per hour', () => {
    const now = 1_000_000;
    const oneHourAgo = now - 3_600_000;
    expect(pendingIdleEssence(oneHourAgo, now)).toBe(IDLE_ESSENCE_PER_HOUR);
  });

  it('accrues proportionally for partial hours', () => {
    const now = 1_000_000;
    const halfHourAgo = now - 1_800_000;
    expect(pendingIdleEssence(halfHourAgo, now)).toBe(Math.floor(IDLE_ESSENCE_PER_HOUR / 2));
  });

  it('caps at IDLE_ESSENCE_CAP no matter how long the elapsed time', () => {
    const now = 1_000_000;
    const daysAgo = now - 3_600_000 * 24 * 5;
    expect(pendingIdleEssence(daysAgo, now)).toBe(IDLE_ESSENCE_CAP);
  });

  it('reaches exactly the cap at IDLE_ESSENCE_CAP_HOURS elapsed', () => {
    const now = 1_000_000;
    const capHoursAgo = now - 3_600_000 * IDLE_ESSENCE_CAP_HOURS;
    expect(pendingIdleEssence(capHoursAgo, now)).toBe(IDLE_ESSENCE_CAP);
  });
});
