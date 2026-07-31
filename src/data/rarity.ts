export type Rarity = 'common' | 'rare' | 'epic' | 'legendary' | 'mythic';

export const RARITY_ORDER: Rarity[] = ['common', 'rare', 'epic', 'legendary', 'mythic'];

/** Percent drop weight per rarity; must sum to 100. */
export const RARITY_DROP_WEIGHTS: Record<Rarity, number> = {
  common: 60,
  rare: 25,
  epic: 10,
  legendary: 4,
  mythic: 1,
};

/** Scales equipment affix magnitude by the rarity it drops at. */
export const RARITY_POWER_MULTIPLIER: Record<Rarity, number> = {
  common: 1,
  rare: 1.6,
  epic: 2.6,
  legendary: 4.2,
  mythic: 7,
};

export const RARITY_COLOR: Record<Rarity, string> = {
  common: '#9099a8',
  rare: '#3b82f6',
  epic: '#a855f7',
  legendary: '#f5a623',
  mythic: '#ff3b6b',
};

export const RARITY_LABEL: Record<Rarity, string> = {
  common: 'Common',
  rare: 'Rare',
  epic: 'Epic',
  legendary: 'Legendary',
  mythic: 'Mythic',
};
