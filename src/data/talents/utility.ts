import type { TalentDefinition } from '../talent.types';

export const utilityTalents: TalentDefinition[] = [
  {
    id: 'swift_strikes',
    name: 'Swift Strikes',
    branch: 'utility',
    description: 'Permanently increases attack speed.',
    maxRank: 5,
    baseCost: 25,
    effect: { kind: 'modifier', modifier: { kind: 'attackSpeedMultiplier', value: 0.04 } },
  },
  {
    id: 'vital_surge',
    name: 'Vital Surge',
    branch: 'utility',
    description: 'Permanently heal for a portion of damage dealt.',
    maxRank: 3,
    baseCost: 30,
    effect: { kind: 'modifier', modifier: { kind: 'lifestealPercent', value: 0.02 } },
  },
  {
    id: 'precise_finish',
    name: 'Precise Finish',
    branch: 'utility',
    description: 'Permanently finish off enemies below a health threshold.',
    maxRank: 3,
    baseCost: 45,
    effect: { kind: 'modifier', modifier: { kind: 'executeThreshold', value: 0.02 } },
  },
];
