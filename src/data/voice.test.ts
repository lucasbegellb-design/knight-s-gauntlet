import { describe, expect, it } from 'vitest';
import { allRelics } from './relics';
import { allMonsters } from './monsters';
import { allCompanions } from './companions';
import { allClasses } from './classes';

/**
 * Guards the writing rules in LORE.md. These are cheap to state and easy to violate silently as
 * content is added — a relic shipped without a flavor line, or with the mechanics duplicated into
 * it, is exactly the drift that turned the registries into a spreadsheet in the first place.
 */
describe('voice', () => {
  it('gives every relic a flavor line distinct from its mechanical description', () => {
    for (const relic of allRelics) {
      expect(relic.flavor, `${relic.id} has no flavor line`).toBeTruthy();
      expect(relic.flavor, `${relic.id} duplicates its description as flavor`).not.toBe(relic.description);
    }
  });

  it('gives every monster a flavor line', () => {
    for (const monster of allMonsters) {
      expect(monster.flavor, `${monster.id} has no flavor line`).toBeTruthy();
    }
  });

  it('keeps flavor to a single idea', () => {
    // Rule 1 in LORE.md. A long flavor line is always a paragraph wearing a disguise.
    for (const relic of allRelics) {
      expect((relic.flavor ?? '').length, `${relic.id}'s flavor is too long`).toBeLessThanOrEqual(120);
    }
    for (const monster of allMonsters) {
      expect((monster.flavor ?? '').length, `${monster.id}'s flavor is too long`).toBeLessThanOrEqual(120);
    }
  });

  it('never leaves a description as placeholder-empty', () => {
    for (const entry of [...allCompanions, ...allClasses]) {
      expect(entry.description.trim().length, `${entry.id} has an empty description`).toBeGreaterThan(20);
    }
  });

  it('keeps a companion description separate from its leader skill description', () => {
    for (const companion of allCompanions) {
      if (!companion.leaderSkill) continue;
      expect(companion.description, `${companion.id} reuses its leader-skill text as its description`).not.toBe(
        companion.leaderSkill.description,
      );
    }
  });
});
