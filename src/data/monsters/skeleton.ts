import type { MonsterDefinition } from '../monster.types';

export const skeleton: MonsterDefinition = {
  id: 'skeleton',
  name: 'Skeleton',
  tier: 'normal',
  maxHp: 34,
  attack: 6,
  attackIntervalMs: 1300,
  xpReward: 13,
};
