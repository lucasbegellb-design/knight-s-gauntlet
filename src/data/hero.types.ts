import type { Element } from '../engine/elements';

export interface HeroBaseStats {
  maxHp: number;
  attack: number;
  attackIntervalMs: number;
}

export interface HeroGrowth {
  maxHpPerLevel: number;
  attackPerLevel: number;
}

export interface HeroDefinition {
  id: string;
  name: string;
  base: HeroBaseStats;
  growth: HeroGrowth;
  /** Set from the chosen class at run start (see `scaleHeroDefinition`); undefined is neutral. */
  element?: Element;
}
