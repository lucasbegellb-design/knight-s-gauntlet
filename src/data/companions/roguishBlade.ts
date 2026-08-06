import type { CompanionDefinition } from '../companion.types';

export const roguishBlade: CompanionDefinition = {
  id: 'roguish_blade',
  element: 'dark',
  leaderSkill: {
    name: 'Cut Purse',
    description: "Coin first, questions never. The squad fights dirtier and comes back richer.",
    modifiers: [{ kind: 'goldMultiplier', value: 0.12 }, { kind: 'critChance', value: 0.06 }],
  },
  name: 'Roguish Blade',
  rarity: 'common',
  role: 'dps',
  description: "Signed on for the loot. Has read the contract. Is staying anyway, which worries everyone.",
  maxHp: 30,
  attack: 5,
  attackIntervalMs: 1000,
};
