export type MonsterTier = 'normal' | 'miniboss' | 'boss';

export interface MonsterDefinition {
  id: string;
  name: string;
  tier: MonsterTier;
  maxHp: number;
  attack: number;
  attackIntervalMs: number;
  /** Base XP awarded to the hero on kill, before any wave scaling. */
  xpReward: number;
  spriteKey?: string;
}
