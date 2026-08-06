import type { MonsterDefinition } from '../monster.types';

export const ancientWyrm: MonsterDefinition = {
  id: 'ancient_wyrm',
  element: 'thunder',
  name: 'Ancient Wyrm',
  flavor: "Predates the Forge and has never once been impressed by it.",
  tier: 'boss',
  maxHp: 110,
  attack: 7,
  attackIntervalMs: 1100,
  xpReward: 130,
};
