import type { KingdomTerritoryDefinition } from './kingdom.types';

/** Conquerable territories beyond the Gauntlet's own zones — a finite collection goal for the essence sink. */
export const territories: KingdomTerritoryDefinition[] = [
  {
    id: 'ember_reach_foothills',
    name: 'Ember Reach Foothills',
    description: 'Volcanic borderlands, secured for their smiths.',
    cost: 500,
    modifiers: [{ kind: 'damageMultiplier', value: 0.02 }],
  },
  {
    id: 'frostmark_passes',
    name: 'Frostmark Passes',
    description: 'Mountain passes garrisoned against the northern cold.',
    cost: 1200,
    modifiers: [{ kind: 'maxHpBonusPercent', value: 0.02 }],
  },
  {
    id: 'the_sunken_coast',
    name: 'The Sunken Coast',
    description: 'Trade ports reclaimed from the tides.',
    cost: 2500,
    modifiers: [{ kind: 'goldMultiplier', value: 0.03 }],
  },
  {
    id: 'duskwood_marches',
    name: 'Duskwood Marches',
    description: 'Ancient academies, their archives now yours.',
    cost: 5000,
    modifiers: [{ kind: 'xpMultiplier', value: 0.02 }],
  },
  {
    id: 'the_ashfall_steppe',
    name: 'The Ashfall Steppe',
    description: 'Windswept plains that breed swift riders.',
    cost: 10_000,
    modifiers: [{ kind: 'attackSpeedMultiplier', value: 0.02 }],
  },
  {
    id: 'the_obsidian_crown',
    name: 'The Obsidian Crown',
    description: 'The last rival throne, broken and annexed.',
    cost: 25_000,
    modifiers: [
      { kind: 'damageMultiplier', value: 0.03 },
      { kind: 'critChance', value: 0.02 },
    ],
  },
];
