import type { RelicDefinition } from '../relic.types';

/** Phase 6 content scale-up: additional vitality-tag relics, grouped in one file (see DESIGN_NOTES.md). */
export const vitalityPackRelics: RelicDefinition[] = [
  {
    id: 'sturdy_charm',
    name: 'Sturdy Charm',
    rarity: 'common',
    tags: ['vitality'],
    stacking: 'stackable',
    description: 'Increases maximum health.',
    modifiers: [{ kind: 'maxHpBonusPercent', value: 0.05 }],
  },
  {
    id: 'thick_hide',
    name: 'Thick Hide',
    rarity: 'common',
    tags: ['vitality'],
    stacking: 'stackable',
    description: 'Increases maximum health.',
    modifiers: [{ kind: 'maxHpBonusPercent', value: 0.05 }],
  },
  {
    id: 'healing_herb',
    name: 'Healing Herb',
    rarity: 'common',
    tags: ['vitality'],
    stacking: 'stackable',
    description: 'Recover more health when clearing a wave.',
    modifiers: [{ kind: 'regenPerWave', value: 0.05 }],
  },
  {
    id: 'bulwark_token',
    name: 'Bulwark Token',
    rarity: 'rare',
    tags: ['vitality'],
    stacking: 'stackable',
    description: 'Increases maximum health and reflects a portion of damage taken.',
    modifiers: [
      { kind: 'maxHpBonusPercent', value: 0.08 },
      { kind: 'reflectDamagePercent', value: 0.03 },
    ],
  },
  {
    id: 'vital_bloom',
    name: 'Vital Bloom',
    rarity: 'rare',
    tags: ['vitality'],
    stacking: 'stackable',
    description: 'Recover much more health when clearing a wave.',
    modifiers: [{ kind: 'regenPerWave', value: 0.08 }],
  },
  {
    id: 'fortress_heart',
    name: 'Fortress Heart',
    rarity: 'epic',
    tags: ['vitality'],
    stacking: 'unique',
    description: 'Greatly increases maximum health.',
    modifiers: [{ kind: 'maxHpBonusPercent', value: 0.15 }],
  },
  {
    id: 'undying_resolve',
    name: 'Undying Resolve',
    rarity: 'mythic',
    tags: ['vitality'],
    stacking: 'unique',
    description: 'Massively increases maximum health and health recovered per wave.',
    modifiers: [
      { kind: 'maxHpBonusPercent', value: 0.3 },
      { kind: 'regenPerWave', value: 0.15 },
    ],
  },
];
