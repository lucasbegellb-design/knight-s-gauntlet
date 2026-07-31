import type { RelicDefinition } from '../relic.types';

/** Phase 6 content scale-up: additional speed-tag relics, grouped in one file (see DESIGN_NOTES.md). */
export const speedPackRelics: RelicDefinition[] = [
  {
    id: 'quickstep_charm',
    name: 'Quickstep Charm',
    rarity: 'common',
    tags: ['speed'],
    stacking: 'stackable',
    description: 'Attack faster.',
    modifiers: [{ kind: 'attackSpeedMultiplier', value: 0.05 }],
  },
  {
    id: 'windborne_boots',
    name: 'Windborne Boots',
    rarity: 'common',
    tags: ['speed'],
    stacking: 'stackable',
    description: 'Attack faster.',
    modifiers: [{ kind: 'attackSpeedMultiplier', value: 0.05 }],
  },
  {
    id: 'haste_rune',
    name: 'Haste Rune',
    rarity: 'common',
    tags: ['speed'],
    stacking: 'stackable',
    description: 'Attack faster.',
    modifiers: [{ kind: 'attackSpeedMultiplier', value: 0.05 }],
  },
  {
    id: 'fleet_strike',
    name: 'Fleet Strike',
    rarity: 'rare',
    tags: ['speed', 'crit'],
    stacking: 'stackable',
    description: 'Attack faster and land more critical hits.',
    modifiers: [
      { kind: 'attackSpeedMultiplier', value: 0.08 },
      { kind: 'critChance', value: 0.02 },
    ],
  },
  {
    id: 'tempest_edge',
    name: 'Tempest Edge',
    rarity: 'rare',
    tags: ['speed'],
    stacking: 'stackable',
    description: 'Greatly increases attack speed.',
    modifiers: [{ kind: 'attackSpeedMultiplier', value: 0.1 }],
  },
  {
    id: 'blur_step',
    name: 'Blur Step',
    rarity: 'epic',
    tags: ['speed'],
    stacking: 'unique',
    description: 'Massively increases attack speed.',
    modifiers: [{ kind: 'attackSpeedMultiplier', value: 0.15 }],
  },
  {
    id: 'chrono_fragment',
    name: 'Chrono Fragment',
    rarity: 'epic',
    tags: ['speed'],
    stacking: 'unique',
    description: 'Increases attack speed and damage.',
    modifiers: [
      { kind: 'attackSpeedMultiplier', value: 0.1 },
      { kind: 'damageMultiplier', value: 0.05 },
    ],
  },
];
