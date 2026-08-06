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
  description: "Patches wounds between waves rather than after them. Considers 'after' optimistic.",
  maxHp: 34,
  attack: 0,
  attackIntervalMs: 2200,
  healAmount: 12,
};
