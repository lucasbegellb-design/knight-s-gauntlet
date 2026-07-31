import type { MonsterDefinition } from '../monster.types';

export const bat: MonsterDefinition = {
  id: 'bat',
  name: 'Cave Bat',
  tier: 'normal',
  maxHp: 18,
  attack: 4,
  attackIntervalMs: 700,
  xpReward: 9,
};
