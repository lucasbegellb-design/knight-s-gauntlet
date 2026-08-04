import { describe, expect, it } from 'vitest';
import { allContinents, continentForZone } from './continents';
import { allZones } from './zones';

describe('continents', () => {
  it('assigns every zone to exactly one continent', () => {
    for (const zone of allZones) {
      const owners = allContinents.filter((c) => c.zoneIds.includes(zone.id));
      expect(owners).toHaveLength(1);
    }
  });

  it('continentForZone finds the right continent', () => {
    const continent = allContinents[0];
    expect(continent).toBeDefined();
    if (!continent) return;
    const zoneId = continent.zoneIds[0];
    expect(zoneId).toBeDefined();
    if (!zoneId) return;
    expect(continentForZone(zoneId)?.id).toBe(continent.id);
  });

  it('returns undefined for an unknown zone id', () => {
    expect(continentForZone('nonexistent_zone')).toBeUndefined();
  });
});
