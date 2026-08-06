import type { RelicDefinition } from '../relic.types';

export const brokenBlade: RelicDefinition = {
  id: 'broken_blade',
  name: 'Broken Blade',
  rarity: 'legendary',
  tags: ['forge'],
  stacking: 'unique',
  description: 'Reforges itself with every Broken Part you collect this run, growing sharper the longer you survive.',
  flavor: "Every piece that falls off makes the rest angrier.",
  modifiers: [],
  special: 'brokenBladeDamage',
};
