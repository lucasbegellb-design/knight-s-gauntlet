import type { CompanionDefinition } from '../companion.types';

export const emberWisp: CompanionDefinition = {
  id: 'ember_wisp',
  element: 'fire',
  name: 'Ember Wisp',
  rarity: 'epic',
  role: 'summoner',
  description: 'A bound spirit that sometimes lashes out twice in the same instant.',
  maxHp: 22,
  attack: 6,
  attackIntervalMs: 1300,
  doubleStrikeChance: 0.3,
};
