import type { TalentDefinition } from '../talent.types';

export const offenseTalents: TalentDefinition[] = [
  {
    id: 'weapon_mastery',
    name: 'Weapon Mastery',
    branch: 'offense',
    description: 'Permanently increases attack damage.',
    maxRank: 5,
    baseCost: 20,
    effect: { kind: 'modifier', modifier: { kind: 'damageMultiplier', value: 0.05 } },
  },
  {
    id: 'killer_focus',
    name: 'Killer Focus',
    branch: 'offense',
    description: 'Permanently increases critical hit chance.',
    maxRank: 5,
    baseCost: 25,
    effect: { kind: 'modifier', modifier: { kind: 'critChance', value: 0.02 } },
  },
  {
    id: 'berserkers_edge',
    name: "Berserker's Edge",
    branch: 'offense',
    description: 'Permanently increases critical hit damage.',
    maxRank: 3,
    baseCost: 40,
    effect: { kind: 'modifier', modifier: { kind: 'critDamageMultiplier', value: 0.08 } },
  },
];
