import type { MonsterDefinition } from '../monster.types';

export const wolf: MonsterDefinition = {
  id: 'wolf',
  element: 'thunder',
  name: 'Wolf',
  flavor: "The only thing out here that was never manufactured.",
  tier: 'normal',
  maxHp: 26,
  attack: 5,
  attackIntervalMs: 900,
  xpReward: 11,
};
