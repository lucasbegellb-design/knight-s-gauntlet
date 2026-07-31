import type { MonsterDefinition } from '../monster.types';

export const slime: MonsterDefinition = {
  id: 'slime',
  name: 'Slime',
  tier: 'normal',
  maxHp: 22,
  attack: 3,
  attackIntervalMs: 1400,
  xpReward: 7,
};
