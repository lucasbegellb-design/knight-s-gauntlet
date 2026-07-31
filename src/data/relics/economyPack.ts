import type { RelicDefinition } from '../relic.types';

/** Phase 6 content scale-up: additional economy-tag relics, grouped in one file (see DESIGN_NOTES.md). */
export const economyPackRelics: RelicDefinition[] = [
  {
    id: 'coin_pouch',
    name: 'Coin Pouch',
    rarity: 'common',
    tags: ['economy'],
    stacking: 'stackable',
    description: 'Earn more gold from clearing waves.',
    modifiers: [{ kind: 'goldMultiplier', value: 0.08 }],
  },
  {
    id: 'tome_of_insight',
    name: 'Tome of Insight',
    rarity: 'common',
    tags: ['economy'],
    stacking: 'stackable',
    description: 'Earn more XP from clearing waves.',
    modifiers: [{ kind: 'xpMultiplier', value: 0.08 }],
  },
  {
    id: 'traders_ledger',
    name: "Trader's Ledger",
    rarity: 'common',
    tags: ['economy'],
    stacking: 'stackable',
    description: 'Earn more gold from clearing waves.',
    modifiers: [{ kind: 'goldMultiplier', value: 0.08 }],
  },
  {
    id: 'merchants_favor',
    name: "Merchant's Favor",
    rarity: 'rare',
    tags: ['economy'],
    stacking: 'stackable',
    description: 'Earn more gold, and a little more XP, from clearing waves.',
    modifiers: [
      { kind: 'goldMultiplier', value: 0.12 },
      { kind: 'xpMultiplier', value: 0.05 },
    ],
  },
  {
    id: 'scholars_ledger',
    name: "Scholar's Ledger",
    rarity: 'rare',
    tags: ['economy'],
    stacking: 'stackable',
    description: 'Earn more XP, and a little more gold, from clearing waves.',
    modifiers: [
      { kind: 'xpMultiplier', value: 0.12 },
      { kind: 'goldMultiplier', value: 0.05 },
    ],
  },
  {
    id: 'treasury_seal',
    name: 'Treasury Seal',
    rarity: 'epic',
    tags: ['economy'],
    stacking: 'unique',
    description: 'Greatly increases gold earned from clearing waves.',
    modifiers: [{ kind: 'goldMultiplier', value: 0.2 }],
  },
  {
    id: 'kings_ransom',
    name: "King's Ransom",
    rarity: 'legendary',
    tags: ['economy'],
    stacking: 'unique',
    description: 'Massively increases gold and XP earned from clearing waves.',
    modifiers: [
      { kind: 'goldMultiplier', value: 0.4 },
      { kind: 'xpMultiplier', value: 0.2 },
    ],
  },
];
