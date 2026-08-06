import type { CompanionDefinition } from '../companion.types';

export const ironVanguard: CompanionDefinition = {
  id: 'iron_vanguard',
  element: 'earth',
  leaderSkill: {
    name: 'Bulwark Doctrine',
    description: "Formation drilled until it is boring. Boring keeps people alive.",
    modifiers: [{ kind: 'maxHpBonusPercent', value: 0.2 }, { kind: 'reflectDamagePercent', value: 0.08 }],
  },
  name: 'Iron Vanguard',
  rarity: 'rare',
  role: 'tank',
  description: 'A veteran wall of plate armor, sturdier than any starting recruit.',
  maxHp: 85,
  attack: 4,
  attackIntervalMs: 1300,
};
