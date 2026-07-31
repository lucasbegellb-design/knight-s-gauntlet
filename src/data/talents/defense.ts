import type { TalentDefinition } from '../talent.types';

export const defenseTalents: TalentDefinition[] = [
  {
    id: 'iron_will',
    name: 'Iron Will',
    branch: 'defense',
    description: 'Permanently increases maximum health.',
    maxRank: 5,
    baseCost: 20,
    effect: { kind: 'modifier', modifier: { kind: 'maxHpBonusPercent', value: 0.04 } },
  },
  {
    id: 'guardian_instinct',
    name: 'Guardian Instinct',
    branch: 'defense',
    description: 'Permanently reflects a portion of damage taken back at attackers.',
    maxRank: 3,
    baseCost: 35,
    effect: { kind: 'modifier', modifier: { kind: 'reflectDamagePercent', value: 0.03 } },
  },
  {
    id: 'battle_recovery',
    name: 'Battle Recovery',
    branch: 'defense',
    description: 'Permanently recover more health per wave cleared.',
    maxRank: 5,
    baseCost: 25,
    effect: { kind: 'modifier', modifier: { kind: 'regenPerWave', value: 0.03 } },
  },
];
