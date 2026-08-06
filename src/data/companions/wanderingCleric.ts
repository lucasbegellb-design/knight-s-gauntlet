import type { CompanionDefinition } from '../companion.types';

export const wanderingCleric: CompanionDefinition = {
  id: 'wandering_cleric',
  element: 'light',
  leaderSkill: {
    name: 'Field Triage',
    description: "Patched between waves, not after them. Wounds close on the march.",
    modifiers: [{ kind: 'regenPerWave', value: 0.12 }, { kind: 'lifestealPercent', value: 0.06 }],
  },
  name: 'Wandering Cleric',
  rarity: 'rare',
  role: 'healer',
  description: 'Mends the party’s most wounded member on a steady rhythm.',
  maxHp: 34,
  attack: 0,
  attackIntervalMs: 2200,
  healAmount: 12,
};
