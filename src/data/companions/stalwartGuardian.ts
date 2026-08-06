import type { CompanionDefinition } from '../companion.types';

export const stalwartGuardian: CompanionDefinition = {
  id: 'stalwart_guardian',
  element: 'earth',
  name: 'Stalwart Guardian',
  rarity: 'common',
  role: 'tank',
  description: 'A shield-bearer who draws enemy attacks away from the party.',
  maxHp: 70,
  attack: 3,
  attackIntervalMs: 1400,
};
