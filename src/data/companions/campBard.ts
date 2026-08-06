import type { CompanionDefinition } from '../companion.types';

export const campBard: CompanionDefinition = {
  id: 'camp_bard',
  element: 'water',
  leaderSkill: {
    name: 'Marching Song',
    description: "Nobody asked for the drum. Everybody moves faster anyway.",
    modifiers: [{ kind: 'attackSpeedMultiplier', value: 0.12 }, { kind: 'xpMultiplier', value: 0.15 }],
  },
  name: 'Camp Bard',
  rarity: 'epic',
  role: 'support',
  description: 'Their song quickens the whole party’s attacks while they remain standing.',
  maxHp: 24,
  attack: 0,
  attackIntervalMs: 999_999,
  auraModifier: { kind: 'attackSpeedMultiplier', value: 0.15 },
};
