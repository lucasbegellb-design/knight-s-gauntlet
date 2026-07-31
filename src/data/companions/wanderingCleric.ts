import type { CompanionDefinition } from '../companion.types';

export const wanderingCleric: CompanionDefinition = {
  id: 'wandering_cleric',
  name: 'Wandering Cleric',
  rarity: 'rare',
  role: 'healer',
  description: 'Mends the party’s most wounded member on a steady rhythm.',
  maxHp: 34,
  attack: 0,
  attackIntervalMs: 2200,
  healAmount: 12,
};
