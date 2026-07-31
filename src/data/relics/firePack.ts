import type { RelicDefinition } from '../relic.types';

/** Phase 6 content scale-up: additional fire-tag relics, grouped in one file (see DESIGN_NOTES.md). */
export const firePackRelics: RelicDefinition[] = [
  {
    id: 'smoldering_ring',
    name: 'Smoldering Ring',
    rarity: 'common',
    tags: ['fire'],
    stacking: 'stackable',
    description: 'Your attacks have a chance to burn the enemy.',
    modifiers: [{ kind: 'burnChance', value: 0.06 }],
  },
  {
    id: 'flame_wick',
    name: 'Flame Wick',
    rarity: 'common',
    tags: ['fire'],
    stacking: 'stackable',
    description: 'Burning damage is increased.',
    modifiers: [{ kind: 'burnDamageMultiplier', value: 0.1 }],
  },
  {
    id: 'pyre_dust',
    name: 'Pyre Dust',
    rarity: 'common',
    tags: ['fire'],
    stacking: 'stackable',
    description: 'Increases attack damage.',
    modifiers: [{ kind: 'damageMultiplier', value: 0.05 }],
  },
  {
    id: 'cinderborn_scale',
    name: 'Cinderborn Scale',
    rarity: 'rare',
    tags: ['fire'],
    stacking: 'stackable',
    description: 'Your attacks are more likely to burn, and burns hit harder.',
    modifiers: [
      { kind: 'burnChance', value: 0.1 },
      { kind: 'burnDamageMultiplier', value: 0.05 },
    ],
  },
  {
    id: 'ashen_core',
    name: 'Ashen Core',
    rarity: 'rare',
    tags: ['fire', 'crit'],
    stacking: 'stackable',
    description: 'Critical hits deal much greater burning damage.',
    modifiers: [{ kind: 'critBurnBonusMultiplier', value: 0.3 }],
  },
  {
    id: 'inferno_brand',
    name: 'Inferno Brand',
    rarity: 'epic',
    tags: ['fire'],
    stacking: 'unique',
    description: 'Greatly increases burn chance and attack damage.',
    modifiers: [
      { kind: 'burnChance', value: 0.15 },
      { kind: 'damageMultiplier', value: 0.08 },
    ],
  },
  {
    id: 'volcanic_heart',
    name: 'Volcanic Heart',
    rarity: 'legendary',
    tags: ['fire'],
    stacking: 'unique',
    description: 'Burning damage is massively increased, and burns happen often.',
    modifiers: [
      { kind: 'burnDamageMultiplier', value: 0.35 },
      { kind: 'burnChance', value: 0.1 },
    ],
  },
];
