import { describe, expect, it } from 'vitest';
import {
  ELEMENTS,
  STRONG_MULTIPLIER,
  WEAK_MULTIPLIER,
  affinityBetween,
  affinityMultiplier,
  counteredBy,
  counters,
} from './elements';

describe('elements', () => {
  it('follows the fire > earth > thunder > water > fire cycle', () => {
    expect(affinityBetween('fire', 'earth')).toBe('strong');
    expect(affinityBetween('earth', 'thunder')).toBe('strong');
    expect(affinityBetween('thunder', 'water')).toBe('strong');
    expect(affinityBetween('water', 'fire')).toBe('strong');
  });

  it('makes the reverse of every advantage a weakness', () => {
    expect(affinityBetween('earth', 'fire')).toBe('weak');
    expect(affinityBetween('water', 'thunder')).toBe('weak');
  });

  it('treats light and dark as mutually strong', () => {
    expect(affinityBetween('light', 'dark')).toBe('strong');
    expect(affinityBetween('dark', 'light')).toBe('strong');
  });

  it('is neutral within the same element and across unrelated pairs', () => {
    expect(affinityBetween('fire', 'fire')).toBe('neutral');
    expect(affinityBetween('fire', 'light')).toBe('neutral');
    expect(affinityBetween('light', 'earth')).toBe('neutral');
  });

  it('is neutral whenever either side has no element', () => {
    expect(affinityMultiplier(undefined, 'fire')).toBe(1);
    expect(affinityMultiplier('fire', undefined)).toBe(1);
    expect(affinityMultiplier(undefined, undefined)).toBe(1);
  });

  it('maps affinity to the documented multipliers', () => {
    expect(affinityMultiplier('fire', 'earth')).toBe(STRONG_MULTIPLIER);
    expect(affinityMultiplier('earth', 'fire')).toBe(WEAK_MULTIPLIER);
    expect(affinityMultiplier('fire', 'water')).toBe(WEAK_MULTIPLIER);
  });

  it('gives every element exactly one counter and one victim', () => {
    for (const element of ELEMENTS) {
      expect(affinityBetween(element, counters(element))).toBe('strong');
      expect(affinityBetween(counteredBy(element), element)).toBe('strong');
    }
  });
});
