import type { CompanionDefinition } from '../companion.types';

export const crimsonDragoon: CompanionDefinition = {
  id: 'crimson_dragoon',
  element: 'fire',
  leaderSkill: {
    name: 'Crimson Charge',
    description: "The order is always forward. There has never been a second order.",
    modifiers: [{ kind: 'damageMultiplier', value: 0.22 }, { kind: 'attackSpeedMultiplier', value: 0.1 }],
  },
  name: 'Crimson Dragoon',
  rarity: 'legendary',
  role: 'dps',
  description: "Charges before the order finishes. Has been right often enough that nobody corrects it.",
  maxHp: 40,
  attack: 14,
  attackIntervalMs: 1000,
};
