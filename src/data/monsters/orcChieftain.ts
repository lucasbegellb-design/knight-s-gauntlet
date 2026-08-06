import type { MonsterDefinition } from '../monster.types';

export const orcChieftain: MonsterDefinition = {
  id: 'orc_chieftain',
  element: 'fire',
  name: 'Orc Chieftain',
  tier: 'miniboss',
  maxHp: 65,
  attack: 6,
  attackIntervalMs: 1000,
  xpReward: 40,
};
