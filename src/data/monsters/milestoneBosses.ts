import type { MonsterDefinition } from '../monster.types';

/**
 * Milestone walls for very long runs — spawned by tierForWave (waveScaling.ts) every 100
 * (megaboss) / 1000 (ultraboss) waves, well above regular boss-tier base stats so the same
 * scaledMonsterStats formula naturally makes them feel like a real wall rather than "boss but
 * bigger colors." See DESIGN_NOTES.md for the run-termination reasoning.
 */
export const milestoneBosses: MonsterDefinition[] = [
  {
    id: 'colossus_of_ash',
    element: 'fire',
    name: 'Colossus of Ash',
    flavor: "A hundred failed candidates, compacted for storage.",
    tier: 'megaboss',
    maxHp: 620,
    attack: 22,
    attackIntervalMs: 1400,
    xpReward: 600,
  },
  {
    id: 'gravemind_hydra',
    element: 'dark',
    name: 'Gravemind Hydra',
    flavor: "Every head remembers a different version of the project.",
    tier: 'megaboss',
    maxHp: 580,
    attack: 25,
    attackIntervalMs: 1250,
    xpReward: 620,
  },
  {
    id: 'the_unmaking',
    element: 'light',
    name: 'The Unmaking',
    flavor: "The Forge, finally reading its own output. It is not pleased.",
    tier: 'ultraboss',
    maxHp: 2100,
    attack: 60,
    attackIntervalMs: 1500,
    xpReward: 4000,
  },
];
