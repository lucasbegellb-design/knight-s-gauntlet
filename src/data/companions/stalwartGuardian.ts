import type { CompanionDefinition } from '../companion.types';

export const stalwartGuardian: CompanionDefinition = {
  id: 'stalwart_guardian',
  element: 'earth',
  leaderSkill: {
    name: 'Hold the Line',
    description: "Nobody steps past. The whole squad braces behind one very stubborn shield.",
    modifiers: [{ kind: 'maxHpBonusPercent', value: 0.14 }, { kind: 'reflectDamagePercent', value: 0.04 }],
  },
  name: 'Stalwart Guardian',
  rarity: 'common',
  role: 'tank',
  description: "Held a doorway for eleven years. The building came down. He is still holding the doorway.",
  maxHp: 70,
  attack: 3,
  attackIntervalMs: 1400,
};
