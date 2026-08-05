import type { KingdomLordDefinition } from './kingdom.types';

/** Generals and advisors recruited to your court — a second finite collection goal, distinct from territories. */
export const lords: KingdomLordDefinition[] = [
  {
    id: 'marshal_kade_ironhold',
    name: 'Kade Ironhold',
    title: 'Marshal',
    description: 'A defensive tactician who drills the garrison to hold any line.',
    cost: 800,
    modifiers: [{ kind: 'maxHpBonusPercent', value: 0.02 }],
  },
  {
    id: 'warlord_ysolde_blackmane',
    name: 'Ysolde Blackmane',
    title: 'Warlord',
    description: 'An aggressive raider whose scouts always find the killing blow.',
    cost: 1800,
    modifiers: [{ kind: 'critChance', value: 0.03 }],
  },
  {
    id: 'quartermaster_renn',
    name: 'Renn',
    title: 'Quartermaster',
    description: 'Squeezes every coin of value from captured supply lines.',
    cost: 3000,
    modifiers: [{ kind: 'goldMultiplier', value: 0.04 }],
  },
  {
    id: 'sage_aveline_of_the_spire',
    name: 'Aveline',
    title: 'Sage of the Spire',
    description: 'A scholar whose training regimens accelerate every recruit.',
    cost: 6000,
    modifiers: [{ kind: 'xpMultiplier', value: 0.03 }],
  },
  {
    id: 'bloodguard_captain_thrace',
    name: 'Thrace',
    title: 'Bloodguard Captain',
    description: 'Field medics trained in a brutal, effective battlefield doctrine.',
    cost: 12_000,
    modifiers: [{ kind: 'lifestealPercent', value: 0.03 }],
  },
  {
    id: 'the_exiled_prince_corvin',
    name: 'Corvin',
    title: 'The Exiled Prince',
    description: 'A deposed royal whose personal guard answers only to strength.',
    cost: 20_000,
    modifiers: [{ kind: 'damageMultiplier', value: 0.04 }],
  },
];
