import type { TalentDefinition } from '../talent.types';

export const economyTalents: TalentDefinition[] = [
  {
    id: 'treasure_hunter',
    name: 'Treasure Hunter',
    branch: 'economy',
    description: 'Permanently increases gold earned from waves.',
    maxRank: 5,
    baseCost: 20,
    effect: { kind: 'modifier', modifier: { kind: 'goldMultiplier', value: 0.06 } },
  },
  {
    id: 'wisdom_seeker',
    name: 'Wisdom Seeker',
    branch: 'economy',
    description: 'Permanently increases XP earned from waves.',
    maxRank: 5,
    baseCost: 20,
    effect: { kind: 'modifier', modifier: { kind: 'xpMultiplier', value: 0.06 } },
  },
  {
    id: 'fortunes_favor',
    name: "Fortune's Favor",
    branch: 'economy',
    description: 'Permanently improves the odds of rarer loot appearing.',
    maxRank: 5,
    baseCost: 30,
    effect: { kind: 'lootLuck', valuePerRank: 0.02 },
  },
];
