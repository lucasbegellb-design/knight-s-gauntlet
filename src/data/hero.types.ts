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
}
