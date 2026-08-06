import type { CompanionDefinition } from '../companion.types';

export const emberWisp: CompanionDefinition = {
  id: 'ember_wisp',
  element: 'fire',
  leaderSkill: {
    name: 'Kindling',
    description: "It does not start fires. It simply refuses to let them go out.",
    modifiers: [{ kind: 'burnChance', value: 0.12 }, { kind: 'burnDamageMultiplier', value: 0.25 }],
  },
  name: 'Ember Wisp',
  rarity: 'epic',
  role: 'summoner',
  description: "Does not start fires. Simply refuses to let any of them go out.",
  maxHp: 22,
  attack: 6,
  attackIntervalMs: 1300,
  doubleStrikeChance: 0.3,
};
