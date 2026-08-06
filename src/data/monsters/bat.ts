import type { MonsterDefinition } from '../monster.types';

export const bat: MonsterDefinition = {
  id: 'bat',
  element: 'thunder',
  name: 'Cave Bat',
  flavor: "Roosts in the ventilation. The ventilation is four hundred years old.",
  tier: 'normal',
  maxHp: 18,
  attack: 4,
  attackIntervalMs: 700,
  xpReward: 9,
};
