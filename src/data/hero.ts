import type { HeroDefinition } from './hero.types';

export const knight: HeroDefinition = {
  id: 'knight',
  name: 'Knight',
  base: {
    maxHp: 60,
    attack: 6,
    attackIntervalMs: 900,
  },
  growth: {
    maxHpPerLevel: 8,
    attackPerLevel: 1,
  },
};
