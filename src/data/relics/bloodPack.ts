import type { RelicDefinition } from '../relic.types';

/** Phase 6 content scale-up: additional blood-tag relics, grouped in one file (see DESIGN_NOTES.md). */
export const bloodPackRelics: RelicDefinition[] = [
  {
    id: 'leech_ring',
    name: 'Leech Ring',
    rarity: 'common',
    tags: ['blood'],
    stacking: 'stackable',
    description: 'Heal for a portion of the damage you deal.',
    modifiers: [{ kind: 'lifestealPercent', value: 0.03 }],
  },
  {
    id: 'crimson_thread',
    name: 'Crimson Thread',
    rarity: 'common',
    tags: ['blood'],
    stacking: 'stackable',
    description: 'Heal for a portion of the damage you deal.',
    modifiers: [{ kind: 'lifestealPercent', value: 0.03 }],
  },
  {
    id: 'sanguine_charm',
    name: 'Sanguine Charm',
    rarity: 'common',
    tags: ['blood'],
    stacking: 'stackable',
    description: 'Reflect a portion of damage taken back at attackers.',
    modifiers: [{ kind: 'reflectDamagePercent', value: 0.05 }],
  },
  {
    id: 'hemorrhage',
    name: 'Hemorrhage',
    rarity: 'rare',
    tags: ['blood', 'crit'],
    stacking: 'stackable',
    description: 'Heal on hit and strike with a touch more precision.',
    modifiers: [
      { kind: 'lifestealPercent', value: 0.05 },
      { kind: 'critChance', value: 0.02 },
    ],
  },
  {
    id: 'blood_debt',
    name: 'Blood Debt',
    rarity: 'rare',
    tags: ['blood', 'vitality'],
    stacking: 'stackable',
    description: 'Reflect damage taken, and heal for a portion of damage dealt.',
    modifiers: [
      { kind: 'reflectDamagePercent', value: 0.08 },
      { kind: 'lifestealPercent', value: 0.03 },
    ],
  },
  {
    id: 'exsanguinator',
    name: 'Exsanguinator',
    rarity: 'epic',
    tags: ['blood'],
    stacking: 'unique',
    description: 'Heals for a large portion of damage dealt, and finishes off badly wounded enemies.',
    modifiers: [
      { kind: 'lifestealPercent', value: 0.1 },
      { kind: 'executeThreshold', value: 0.02 },
    ],
  },
  {
    id: 'crimson_covenant',
    name: 'Crimson Covenant',
    rarity: 'epic',
    tags: ['blood', 'vitality'],
    stacking: 'unique',
    description: 'Heals for a large portion of damage dealt, and increases maximum health.',
    modifiers: [
      { kind: 'lifestealPercent', value: 0.08 },
      { kind: 'maxHpBonusPercent', value: 0.05 },
    ],
  },
];
