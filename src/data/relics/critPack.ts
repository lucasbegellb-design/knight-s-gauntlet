import type { RelicDefinition } from '../relic.types';

/** Phase 6 content scale-up: additional crit-tag relics, grouped in one file (see DESIGN_NOTES.md). */
export const critPackRelics: RelicDefinition[] = [
  {
    id: 'sharpened_edge',
    name: 'Sharpened Edge',
    rarity: 'common',
    tags: ['crit'],
    stacking: 'stackable',
    description: 'Increases critical hit chance.',
    modifiers: [{ kind: 'critChance', value: 0.03 }],
  },
  {
    id: 'hunters_mark',
    name: "Hunter's Mark",
    rarity: 'common',
    tags: ['crit'],
    stacking: 'stackable',
    description: 'Increases critical hit damage.',
    modifiers: [{ kind: 'critDamageMultiplier', value: 0.1 }],
  },
  {
    id: 'keen_eye',
    name: 'Keen Eye',
    rarity: 'common',
    tags: ['crit'],
    stacking: 'stackable',
    description: 'Increases critical hit chance.',
    modifiers: [{ kind: 'critChance', value: 0.03 }],
  },
  {
    id: 'ruthless_precision',
    name: 'Ruthless Precision',
    rarity: 'rare',
    tags: ['crit'],
    stacking: 'stackable',
    description: 'Increases both critical hit chance and damage.',
    modifiers: [
      { kind: 'critChance', value: 0.05 },
      { kind: 'critDamageMultiplier', value: 0.1 },
    ],
  },
  {
    id: 'assassins_resolve',
    name: "Assassin's Resolve",
    rarity: 'rare',
    tags: ['crit'],
    stacking: 'stackable',
    description: 'Greatly increases critical hit damage.',
    modifiers: [{ kind: 'critDamageMultiplier', value: 0.15 }],
  },
  {
    id: 'deadly_focus',
    name: 'Deadly Focus',
    rarity: 'epic',
    tags: ['crit'],
    stacking: 'unique',
    description: 'Increases critical hit chance, and finishes off badly wounded enemies.',
    modifiers: [
      { kind: 'critChance', value: 0.08 },
      { kind: 'executeThreshold', value: 0.03 },
    ],
  },
  {
    id: 'headhunters_trophy',
    name: "Headhunter's Trophy",
    rarity: 'mythic',
    tags: ['crit'],
    stacking: 'unique',
    description: 'Massively increases critical hit chance and damage.',
    modifiers: [
      { kind: 'critChance', value: 0.15 },
      { kind: 'critDamageMultiplier', value: 0.3 },
    ],
  },
];
