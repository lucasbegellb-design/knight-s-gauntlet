import type { MonsterDefinition } from '../monster.types';

export const goblinGrunt: MonsterDefinition = {
  id: 'goblin_grunt',
  element: 'earth',
  name: 'Goblin Grunt',
  flavor: "Issued a spear it did not ask for by a chain of command that no longer exists.",
  tier: 'normal',
  maxHp: 30,
  attack: 4,
  attackIntervalMs: 1200,
  xpReward: 10,
};
