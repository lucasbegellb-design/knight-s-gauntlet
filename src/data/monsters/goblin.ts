import type { MonsterDefinition } from '../monster.types';

export const goblinGrunt: MonsterDefinition = {
  id: 'goblin_grunt',
  element: 'earth',
  name: 'Goblin Grunt',
  tier: 'normal',
  maxHp: 30,
  attack: 4,
  attackIntervalMs: 1200,
  xpReward: 10,
};
