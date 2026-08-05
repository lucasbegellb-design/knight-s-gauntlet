import type { CompanionDefinition } from '../companion.types';

export const hearthkeeper: CompanionDefinition = {
  id: 'hearthkeeper',
  name: 'Hearthkeeper',
  rarity: 'epic',
  role: 'healer',
  description: 'A hardened field medic whose mending outpaces any wound the party takes.',
  maxHp: 40,
  attack: 0,
  attackIntervalMs: 2000,
  healAmount: 18,
};
