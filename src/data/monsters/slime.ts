import type { MonsterDefinition } from '../monster.types';

export const slime: MonsterDefinition = {
  id: 'slime',
  element: 'water',
  name: 'Slime',
  flavor: "A Forge coolant leak that developed opinions.",
  tier: 'normal',
  maxHp: 22,
  attack: 3,
  attackIntervalMs: 1400,
  xpReward: 7,
};
