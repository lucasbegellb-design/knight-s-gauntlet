import type { CompanionDefinition } from '../companion.types';

export const hearthkeeper: CompanionDefinition = {
  id: 'hearthkeeper',
  element: 'water',
  leaderSkill: {
    name: 'Warm Hearth',
    description: "Carries the fire from camp into the field, and everyone stands closer to it.",
    modifiers: [{ kind: 'regenPerWave', value: 0.18 }, { kind: 'maxHpBonusPercent', value: 0.15 }],
  },
  name: 'Hearthkeeper',
  rarity: 'epic',
  role: 'healer',
  description: "Carries the fire from camp into the field. Everyone ends up standing closer to her.",
  maxHp: 40,
  attack: 0,
  attackIntervalMs: 2000,
  healAmount: 18,
};
